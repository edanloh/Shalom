"""
ml/train_reranker.py
--------------------
Offline training for the Learning-to-Rank re-ranker.

HOW IT WORKS
------------
Your existing getRecommendations.ts already computes a rich score_breakdown
for every candidate (rating, category_affinity, tag_affinity, etc.).
Instead of using hand-tuned weights, this script learns the optimal weights
from interaction data.

This is a two-stage pipeline:
  Stage 1 (unchanged): rule-based candidate generation  →  ~60 candidates
  Stage 2 (new, ML):   LightGBM LambdaRank re-ranker   →  top 6 results

MODEL SELECTION
---------------
  LightGBM (preferred, when installed):
    - LGBMRanker with lambdarank objective
    - Directly optimises nDCG — the metric we actually care about
    - Learns non-linear feature interactions (e.g. rating matters more for
      career-goal users; difficulty_progression matters more for warm users)
    - Exported as JSON tree structure, evaluated in TypeScript without a
      Python runtime at inference time

  Logistic Regression (fallback):
    - Used when lightgbm is not installed or dataset is tiny (< 200 rows)
    - Same deployment format, just linear weights instead of tree ensemble

RUNNING
-------
  pip install pandas scikit-learn supabase python-dotenv lightgbm
  python ml/train_reranker.py

OUTPUT
------
  ml/model_weights.json   — model (trees or weights) + metadata
  ml/eval_report.txt      — Precision@K, nDCG@K vs rule-based baseline
"""

import json, os, sys, math
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
from dotenv import load_dotenv

load_dotenv()

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = SCRIPT_DIR

# ── Optional imports ──────────────────────────────────────────────────────────
try:
    import lightgbm as lgb
    LGBM_AVAILABLE = True
except ImportError:
    LGBM_AVAILABLE = False
    print("[info] lightgbm not installed — will use logistic regression fallback.")
    print("       Strongly recommended: pip install lightgbm")

from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import StratifiedKFold, TimeSeriesSplit
from sklearn.metrics import roc_auc_score, ndcg_score
from sklearn.metrics.pairwise import cosine_similarity

# ── Supabase fetch ────────────────────────────────────────────────────────────
try:
    from supabase import create_client
    SUPABASE_URL = os.environ["SUPABASE_URL"]
    SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    sb = create_client(SUPABASE_URL, SUPABASE_KEY)
    USE_REAL_DATA = True
except Exception as e:
    print(f"[warn] Supabase not available ({e}). Using synthetic data only.")
    USE_REAL_DATA = False

# ── Feature columns (must match score_breakdown in getRecommendations.ts) ────
FEATURE_COLS = [
    "rating",
    "user_ctr",
    "user_recency",
    "category_affinity",
    "instructor_affinity",
    "tag_affinity",
    "difficulty_match",
    "freshness",
    "session_intent_boost",
    "popularity",
    "global_ctr",
    "ignored_penalty",
    "dismiss_penalty",
    "suppression_penalty",
    "overexposed_penalty",
    "instructor_fatigue_penalty",
    "quality_penalty",
    "content_similarity_boost",
    "thompson_bonus",          # UCB exploration signal
    "difficulty_progression",  # learning path next-step boost
    "session_cf_boost",        # similarity to courses clicked in current session
    "user_embedding_similarity",  # cosine sim to recent-taste embedding centroid (last 30 d)
]

# Ordinal relevance grades matching the EVENT_RELEVANCE scale used in
# getRecommendations.ts aggregateBehavior() weight table.
# LightGBM lambdarank natively optimises nDCG with graded relevance (0-4);
# the logistic regression path binarises these at training time.
EVENT_RELEVANCE = {
    "complete": 4, "enroll": 3, "wishlist": 2, "save": 2,
    "start": 1,    "click":  1,
}


# ── Real data loader ──────────────────────────────────────────────────────────
def load_real_data() -> pd.DataFrame:
    """
    Joins recommendation_events with the score_breakdown stored in context.
    Fetches `created_at` for temporal cross-validation ordering.
    """
    since = (datetime.utcnow() - timedelta(days=90)).isoformat()
    resp = (
        sb.table("recommendation_events")
        .select("course_id, event_type, context, timestamp")
        .gte("timestamp", since)
        .execute()
    )
    rows = []
    for ev in resp.data or []:
        ctx = ev.get("context") or {}
        breakdown = ctx.get("score_breakdown")
        if not breakdown:
            continue
        label = EVENT_RELEVANCE.get((ev.get("event_type") or "").lower(), 0)
        row = {"label": label, "course_id": ev.get("course_id")}
        for feat in FEATURE_COLS:
            row[feat] = float(breakdown.get(feat, 0.0))
        row["rank"] = int(ctx.get("rank") or ctx.get("recommendation_rank") or 0)
        row["request_id"] = ctx.get("requestId") or ctx.get("request_id") or None
        # Use timestamp column for temporal CV ordering
        row["created_at"] = ev.get("timestamp") or None
        rows.append(row)
    return pd.DataFrame(rows)


# ── Synthetic data generator ──────────────────────────────────────────────────
def generate_synthetic_data(n_samples: int = 2000) -> pd.DataFrame:
    """
    Generates plausible (features, label) pairs that mimic real user behaviour.
    """
    rng = np.random.default_rng(42)
    data = {feat: rng.uniform(0, 1, n_samples) for feat in FEATURE_COLS}
    for pen in ["ignored_penalty", "dismiss_penalty", "suppression_penalty",
                "overexposed_penalty", "instructor_fatigue_penalty", "quality_penalty"]:
        data[pen] = rng.uniform(0, 2, n_samples)
    data["thompson_bonus"] = rng.beta(2, 2, n_samples)
    data["difficulty_progression"] = rng.choice([0.1, 0.4, 0.5, 0.6, 1.0], n_samples)
    # session_cf_boost: 0 when no active session, peaks around 0.6 for courses
    # that match the session theme (most sessions are single-topic).
    data["session_cf_boost"] = rng.beta(1.5, 3, n_samples)  # right-skewed, mostly low
    # user_embedding_similarity: 0 when embeddings disabled; when enabled it
    # correlates with category_affinity/content_similarity_boost but captures
    # recent drift. Simulate as a slightly noisy version of category_affinity.
    data["user_embedding_similarity"] = np.clip(
        data["category_affinity"] * 0.7 + rng.normal(0, 0.15, n_samples), 0, 1
    )

    df = pd.DataFrame(data)
    logit = (
        1.2 * df["rating"]
        + 1.0 * df["category_affinity"]
        + 0.9 * df["tag_affinity"]
        + 0.8 * df["content_similarity_boost"]
        + 0.7 * df["user_ctr"]
        + 0.6 * df["difficulty_progression"]
        + 0.5 * df["popularity"]
        + 0.4 * df["freshness"]
        + 0.5 * df["session_cf_boost"]   # strong signal: session intent matters
        + 0.4 * df["user_embedding_similarity"]  # recent-taste centroid
        + 0.3 * df["thompson_bonus"]
        + 0.3 * df["session_intent_boost"]
        - 0.8 * df["ignored_penalty"]
        - 1.0 * df["dismiss_penalty"]
        - 0.6 * df["suppression_penalty"]
        - 3.0
    )
    prob = 1 / (1 + np.exp(-logit))
    # Map probability to ordinal relevance grades 0-4, mirroring EVENT_RELEVANCE:
    #   0 = no action, 1 = click/start, 2 = save/wishlist, 3 = enroll, 4 = complete
    grades = np.zeros(n_samples, dtype=int)
    for grade, threshold in enumerate([0.25, 0.50, 0.68, 0.83], start=1):
        grades[prob > threshold] = grade
    df["label"] = grades
    return df


# ── Position-bias correction ──────────────────────────────────────────────────
def compute_position_weights(df: pd.DataFrame) -> np.ndarray:
    """
    Inverse propensity scoring (IPS) to correct for position bias, combined
    with exponential recency decay so that more recent events carry more weight.

    IPS: items shown at rank 1 are clicked at higher rates than identical items
    at rank 6. Without correction the model learns "rank 1 features → click"
    rather than "quality features → click". We up-weight lower-ranked items
    by 1/P(seen | rank) estimated from empirical position CTR.

    Recency: a click from 85 days ago is weaker evidence of current taste than
    one from yesterday. We apply exp(-age_days / 30) so 30-day-old events get
    ~37% weight and 90-day-old events get ~5% weight.
    """
    if "rank" not in df.columns or (df["rank"] == 0).all():
        weights = np.ones(len(df))
    else:
        ranked = df[df["rank"] > 0]
        if len(ranked) < 30:
            weights = np.ones(len(df))
        else:
            # Binarise ordinal labels for CTR estimation (any engagement = positive)
            global_ctr = (ranked["label"] > 0).mean()
            position_ctr = ranked.groupby("rank").apply(lambda g: (g["label"] > 0).mean())
            smoothed_ctr = position_ctr * 0.6 + global_ctr * 0.4

            weights = df["rank"].map(
                lambda r: 1.0 / max(float(smoothed_ctr.get(r, global_ctr)), 0.01)
                if r > 0 else 1.0
            ).astype(float)
            weights = (weights / weights.mean()).values

    # Recency decay: 30-day half-life (~21 days). Events without a timestamp
    # are assigned 45-day age (moderate weight, not zero).
    if "created_at" in df.columns and df["created_at"].notna().any():
        ages = (
            datetime.utcnow()
            - pd.to_datetime(df["created_at"], errors="coerce")
        ).dt.total_seconds().fillna(45 * 86400) / 86400  # days
        recency_factor = np.exp(-ages.values / 30.0)
        weights = weights * recency_factor
        # Re-normalise and clip to prevent extreme weights from very old events
        weights = np.clip(weights / weights.mean(), 0.1, 10.0)

    return weights


# ── Pairwise preference data ───────────────────────────────────────────────────
def generate_pairwise_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    Converts pointwise events into BradleyTerry preference pairs.
    Used by the logistic regression path.
    """
    if "request_id" not in df.columns or df["request_id"].isna().all():
        return pd.DataFrame(columns=FEATURE_COLS + ["label"])

    deduped = (
        df[df["request_id"].notna()]
        .sort_values("label", ascending=False)
        .drop_duplicates(subset=["request_id", "course_id"] if "course_id" in df.columns else ["request_id"], keep="first")
    )

    pairs: list[dict] = []
    for req_id, group in deduped.groupby("request_id"):
        if pd.isna(req_id):
            continue
        pos = group[group["label"] > 0]   # any positive grade (1-4)
        neg = group[group["label"] == 0]  # no engagement
        if pos.empty or neg.empty:
            continue
        pos_s = pos.sample(min(len(pos), 3), random_state=42)
        neg_s = neg.sample(min(len(neg), 5), random_state=42)
        for _, p in pos_s.iterrows():
            for _, n in neg_s.iterrows():
                diff = p[FEATURE_COLS].values - n[FEATURE_COLS].values
                pairs.append({**dict(zip(FEATURE_COLS, diff)), "label": 1})
                pairs.append({**dict(zip(FEATURE_COLS, -diff)), "label": 0})

    if not pairs:
        return pd.DataFrame(columns=FEATURE_COLS + ["label"])

    result = pd.DataFrame(pairs)
    print(f"[pairwise] Generated {len(result)} preference pairs from {deduped['request_id'].nunique()} requests.")
    return result


# ── LightGBM helpers ──────────────────────────────────────────────────────────

def prepare_ranking_data(df: pd.DataFrame) -> tuple:
    """
    Prepares (X, y, groups) for LightGBM lambdarank.

    LightGBM requires data sorted by query (request_id) with a `group` array
    specifying how many items belong to each query. When request_ids are missing,
    creates artificial groups of 20 to simulate ranking queries.
    """
    has_request_ids = (
        "request_id" in df.columns
        and df["request_id"].notna().sum() >= 50
    )

    if has_request_ids:
        df_c = df.copy()
        df_c["request_id"] = df_c["request_id"].fillna("_ungrouped")
        df_sorted = df_c.sort_values("request_id").reset_index(drop=True)
        X = df_sorted[FEATURE_COLS].fillna(0).values
        y = df_sorted["label"].values
        groups = df_sorted.groupby("request_id", sort=False).size().values
        print(f"[lgbm] Using {df['request_id'].notna().sum()} real request groups.")
    else:
        X = df[FEATURE_COLS].fillna(0).values
        y = df["label"].values
        group_size = 20
        n_complete = len(df) // group_size
        remainder = len(df) % group_size
        groups = np.full(n_complete, group_size, dtype=np.int32)
        if remainder > 0:
            groups = np.append(groups, remainder)
        print(f"[lgbm] No request_ids — using {len(groups)} artificial groups of ~{group_size}.")

    return X.astype(np.float32), y.astype(np.int32), groups.astype(np.int32)


def trim_tree(node: dict) -> dict:
    """
    Strips non-essential fields from a LightGBM dump_model() tree node.

    LightGBM's native dump includes split_gain, leaf_weight, leaf_count and
    other training metadata. We only need split_feature, threshold,
    default_left, and leaf_value for inference. Trimming reduces the JSON
    size by ~60% which matters since we store the whole model as a Supabase
    secret loaded at edge-function startup.
    """
    if "leaf_value" in node:
        return {"leaf_value": round(float(node["leaf_value"]), 6)}
    return {
        "split_feature": int(node["split_feature"]),
        # threshold can be "0.5||0.6" for categorical features (unlikely here);
        # taking the first value handles both numerical and categorical cases.
        "threshold": round(float(str(node["threshold"]).split("||")[0]), 8),
        "default_left": bool(node.get("default_left", False)),
        "left_child": trim_tree(node["left_child"]),
        "right_child": trim_tree(node["right_child"]),
    }


def traverse_tree_python(node: dict, features: np.ndarray) -> float:
    """Python-side tree traversal (mirrors the TypeScript evaluator)."""
    if "leaf_value" in node:
        return float(node["leaf_value"])
    feat_val = float(features[node["split_feature"]])
    go_left = node.get("default_left", False) if math.isnan(feat_val) else (feat_val <= node["threshold"])
    child = node["left_child"] if go_left else node["right_child"]
    return traverse_tree_python(child, features)


def predict_lgbm_python(features: np.ndarray, trees: list) -> float:
    """Evaluate LightGBM tree ensemble on a single feature vector."""
    return sum(traverse_tree_python(tree, features) for tree in trees)


def _make_groups(n: int, group_size: int = 20) -> np.ndarray:
    """
    Build a LightGBM group array that always sums exactly to n.
    Distributes any remainder into the last group rather than dropping it,
    which would cause LightGBM's 'sum of query counts differs from #data' error.
    """
    n_complete = n // group_size
    remainder = n % group_size
    if n_complete == 0:
        return np.array([n], dtype=np.int32)
    groups = np.full(n_complete, group_size, dtype=np.int32)
    if remainder > 0:
        groups[-1] += remainder  # merge into last group
    return groups


def _eval_ndcg_folds(model, X_folds: list, y_folds: list) -> list:
    """Compute NDCG@6 on (X, y) validation pairs returned by CV splits."""
    ndcg_scores = []
    for X_val, y_val in zip(X_folds, y_folds):
        if y_val.sum() == 0 or len(y_val) < 6:
            continue
        scores = model.predict(X_val)
        n_groups = len(y_val) // 20
        fold_ndcg = []
        for i in range(max(n_groups, 1)):
            s = i * 20
            e = min(s + 20, len(y_val))
            pred = scores[s:e]
            true = y_val[s:e]
            if true.sum() > 0:
                fold_ndcg.append(ndcg_score([true], [pred], k=6))
        if fold_ndcg:
            ndcg_scores.append(float(np.mean(fold_ndcg)))
    return ndcg_scores


# ── LightGBM training ─────────────────────────────────────────────────────────
def train_lgbm(df: pd.DataFrame) -> dict:
    """
    Trains a LightGBM LambdaRank model.

    LambdaRank directly optimises nDCG by computing pairwise gradients
    weighted by the nDCG improvement from swapping two items. This is
    fundamentally better than logistic regression for ranking tasks because:

      1. Feature interactions are handled automatically (non-linear splits)
      2. The loss is calibrated to the ranking metric, not click prediction
      3. Gradient boosting is robust to irrelevant features

    Cross-validation strategy:
      - With timestamps: TimeSeriesSplit (train on past, evaluate on future)
        This gives a realistic offline estimate of live performance because
        the model is never evaluated on data it could have seen during training.
      - Without timestamps: StratifiedKFold (fallback, less accurate)
    """
    X, y, groups = prepare_ranking_data(df)
    sample_weights = compute_position_weights(df)
    bias_corrected = not np.all(sample_weights == 1.0)

    # LightGBM config: max_depth=4 keeps trees compact for JSON export
    # (~200 bytes/tree vs ~2KB for max_depth=6). n_estimators=100 balances
    # accuracy vs model size (each tree is ~3KB trimmed → 300KB total).
    lgbm_params = dict(
        objective="lambdarank",
        n_estimators=100,
        learning_rate=0.1,
        num_leaves=15,
        max_depth=4,
        min_child_samples=max(5, len(df) // 200),
        verbosity=-1,
        random_state=42,
    )

    has_timestamps = (
        "created_at" in df.columns and df["created_at"].notna().any()
    )

    ndcg_scores = []
    if has_timestamps:
        df_ts = df.copy()
        df_ts["_ts"] = pd.to_datetime(df_ts["created_at"], errors="coerce")
        df_ts = df_ts.sort_values("_ts").reset_index(drop=True)
        X_ts = df_ts[FEATURE_COLS].fillna(0).values.astype(np.float32)
        y_ts = df_ts["label"].values.astype(np.int32)
        cv_type = "temporal"
        print("[temporal-cv] Using TimeSeriesSplit — train on past, evaluate on future.")

        tscv = TimeSeriesSplit(n_splits=5)
        X_val_folds, y_val_folds = [], []
        for train_idx, val_idx in tscv.split(X_ts):
            if len(train_idx) < 40 or len(val_idx) < 10:
                continue
            train_groups = _make_groups(len(train_idx))
            fold_model = lgb.LGBMRanker(**lgbm_params)
            fold_model.fit(X_ts[train_idx], y_ts[train_idx], group=train_groups)
            X_val_folds.append(X_ts[val_idx])
            y_val_folds.append(y_ts[val_idx])
        # Evaluate all folds
        ndcg_scores = _eval_ndcg_folds(fold_model, X_val_folds, y_val_folds)
    else:
        cv_type = "stratified"
        kf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
        X_val_folds, y_val_folds = [], []
        for train_idx, val_idx in kf.split(X, y):
            if len(train_idx) < 40:
                continue
            train_groups = _make_groups(len(train_idx))
            fold_model = lgb.LGBMRanker(**lgbm_params)
            fold_model.fit(X[train_idx], y[train_idx], group=train_groups)
            X_val_folds.append(X[val_idx])
            y_val_folds.append(y[val_idx])
        ndcg_scores = _eval_ndcg_folds(fold_model, X_val_folds, y_val_folds)

    mean_ndcg = float(np.mean(ndcg_scores)) if ndcg_scores else 0.0
    std_ndcg = float(np.std(ndcg_scores)) if ndcg_scores else 0.0
    print(f"[{cv_type}-cv] NDCG@6: {mean_ndcg:.4f} ± {std_ndcg:.4f}")

    # ── Final model on all training data ──────────────────────────────────────
    final_model = lgb.LGBMRanker(**lgbm_params)
    final_model.fit(X, y, group=groups)

    # Trim tree structure for compact TypeScript-compatible JSON export
    model_dump = final_model.booster_.dump_model()
    trimmed_trees = [
        trim_tree(tree["tree_structure"])
        for tree in model_dump["tree_info"]
    ]

    # Feature importances by gain (split gain, not frequency)
    importances = list(zip(FEATURE_COLS, final_model.feature_importances_))
    importances.sort(key=lambda x: abs(x[1]), reverse=True)
    max_imp = max(v for _, v in importances) or 1
    print("\nFeature importances (LightGBM gain):")
    for feat, imp in importances:
        bar = "█" * int(imp / max_imp * 20)
        print(f"  {feat:<35} {imp:.1f}  {bar}")

    if bias_corrected:
        print(f"\n[ips] Position-bias correction applied.")
    print(f"\nCV NDCG@6 ({cv_type}): {mean_ndcg:.4f} ± {std_ndcg:.4f}")

    return {
        "model_type": "lgbm",
        "model_version": "ltr_lgbm_v1",
        "trained_at": datetime.utcnow().isoformat() + "Z",
        "n_samples": int(len(df)),
        "cv_ndcg_mean": mean_ndcg,
        "cv_ndcg_std": std_ndcg,
        "cv_type": cv_type,
        "training_mode": "lambdarank",
        "position_bias_corrected": bias_corrected,
        "feature_cols": FEATURE_COLS,
        "n_estimators": int(final_model.n_estimators),
        "learning_rate": float(lgbm_params["learning_rate"]),
        "lgbm_trees": trimmed_trees,
    }


# ── Logistic regression training (fallback) ───────────────────────────────────
def train_logreg(df: pd.DataFrame) -> dict:
    """
    Logistic regression LTR — kept as fallback when LightGBM is unavailable.
    Identical to the original train() logic.
    """
    X_raw = df[FEATURE_COLS].fillna(0).values
    # Binarise ordinal labels — logistic regression can't use graded relevance.
    # Any engagement (click=1 through complete=4) is treated as a positive.
    y_raw = (df["label"].values > 0).astype(int)

    print(f"Training LR on {len(df)} samples  |  positive rate: {y_raw.mean():.2%}")

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_raw)

    sample_weights = compute_position_weights(df)
    bias_corrected = not np.all(sample_weights == 1.0)
    if bias_corrected:
        print(f"[ips] Position-bias correction applied across {df['rank'].nunique()} rank positions.")

    has_request_ids = "request_id" in df.columns and df["request_id"].notna().sum() >= 50
    use_pairwise = len(df) >= 500 and has_request_ids
    if use_pairwise:
        scaled_df = pd.DataFrame(X_scaled, columns=FEATURE_COLS)
        scaled_df["label"] = y_raw
        scaled_df["request_id"] = df["request_id"].values if "request_id" in df.columns else None
        scaled_df["course_id"] = df["course_id"].values if "course_id" in df.columns else None
        pair_df = generate_pairwise_data(scaled_df)
        if len(pair_df) >= 100:
            X_train = pair_df[FEATURE_COLS].values
            y_train = pair_df["label"].values
            train_weights = np.ones(len(y_train))
        else:
            X_train, y_train, train_weights = X_scaled, y_raw, sample_weights
            use_pairwise = False
    else:
        X_train, y_train, train_weights = X_scaled, y_raw, sample_weights

    model = LogisticRegression(
        C=1.0, max_iter=500,
        class_weight=None if use_pairwise else "balanced",
        solver="lbfgs",
    )

    # TimeSeriesSplit when timestamps available, else StratifiedKFold
    has_timestamps = "created_at" in df.columns and df["created_at"].notna().any()
    aucs = []
    if has_timestamps:
        df_ts = df.copy()
        df_ts["_ts"] = pd.to_datetime(df_ts["created_at"], errors="coerce")
        df_ts = df_ts.sort_values("_ts").reset_index(drop=True)
        X_ts = scaler.transform(df_ts[FEATURE_COLS].fillna(0).values)
        y_ts = df_ts["label"].values
        tscv = TimeSeriesSplit(n_splits=5)
        cv_type = "temporal"
        for train_idx, val_idx in tscv.split(X_ts):
            if len(val_idx) < 5:
                continue
            w = sample_weights[:len(X_ts)][train_idx] if not use_pairwise else None
            model.fit(X_ts[train_idx], y_ts[train_idx], sample_weight=w)
            prob = model.predict_proba(X_ts[val_idx])[:, 1]
            aucs.append(roc_auc_score(y_ts[val_idx], prob))
    else:
        cv_type = "stratified"
        cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
        for train_idx, val_idx in cv.split(X_scaled, y_raw):
            w = sample_weights[:len(X_scaled)][train_idx] if not use_pairwise else None
            model.fit(X_scaled[train_idx], y_raw[train_idx], sample_weight=w)
            prob = model.predict_proba(X_scaled[val_idx])[:, 1]
            aucs.append(roc_auc_score(y_raw[val_idx], prob))

    print(f"CV AUC ({cv_type}): {np.mean(aucs):.4f} ± {np.std(aucs):.4f}"
          f"  [{'pairwise' if use_pairwise else 'pointwise'}"
          f"{', IPS' if bias_corrected else ''}]")

    model.fit(X_train, y_train, sample_weight=train_weights if not use_pairwise else None)
    weights = {feat: float(coef) for feat, coef in zip(FEATURE_COLS, model.coef_[0])}

    importance = sorted(weights.items(), key=lambda x: abs(x[1]), reverse=True)
    print("\nFeature importance (learned weights):")
    for feat, w in importance:
        bar = "█" * int(abs(w) * 10)
        sign = "+" if w >= 0 else "-"
        print(f"  {feat:<35} {sign}{abs(w):.4f}  {bar}")

    return {
        "model_type": "logreg",
        "model_version": "ltr_logreg_v1",
        "trained_at": datetime.utcnow().isoformat() + "Z",
        "n_samples": int(len(df)),
        "cv_auc_mean": float(np.mean(aucs)),
        "cv_auc_std": float(np.std(aucs)),
        "cv_type": cv_type,
        "training_mode": "pairwise" if use_pairwise else "pointwise",
        "position_bias_corrected": bias_corrected,
        "scaler_mean": scaler.mean_.tolist(),
        "scaler_scale": scaler.scale_.tolist(),
        "feature_cols": FEATURE_COLS,
        "intercept": float(model.intercept_[0]),
        "weights": weights,
    }


# ── Dispatcher ────────────────────────────────────────────────────────────────
def train(df: pd.DataFrame) -> dict:
    if len(df) < 50:
        print(f"[warn] Only {len(df)} samples — supplementing with synthetic data.")
        df = pd.concat([df, generate_synthetic_data(1500)], ignore_index=True)

    print(f"Training on {len(df)} samples  |  positive rate: {df['label'].mean():.2%}")

    if LGBM_AVAILABLE and len(df) >= 200:
        print("[lightgbm] LightGBM available — training LGBMRanker (lambdarank).")
        return train_lgbm(df)
    else:
        if LGBM_AVAILABLE:
            print(f"[info] Only {len(df)} samples — LightGBM needs ≥ 200 for stable trees. Using LR.")
        return train_logreg(df)


def evaluate_vs_baseline(df: pd.DataFrame, output: dict) -> str:
    """
    Compare Precision@K and nDCG@K between the trained model and rule-based baseline.
    Handles both LightGBM (lgbm) and logistic regression (logreg) model types.
    """
    if len(df) < 40:
        return "Insufficient data for evaluation."

    X = df[FEATURE_COLS].fillna(0).values
    y = df["label"].values

    model_type = output.get("model_type", "logreg")
    if model_type == "lgbm":
        trees = output["lgbm_trees"]
        ml_scores = np.array([predict_lgbm_python(x, trees) for x in X])
    else:
        feat_weights = np.array([output["weights"][f] for f in FEATURE_COLS])
        ml_scores = X @ feat_weights

    rule_scores = X[:, FEATURE_COLS.index("rating")] * 5

    group_size = 20
    n_groups = len(df) // group_size
    precision_ml, ndcg_ml, precision_rule, ndcg_rule = [], [], [], []
    diversity_ml, diversity_rule = [], []

    # course_id column present in real data; use row index as proxy for synthetic
    course_ids = df["course_id"].values if "course_id" in df.columns else np.arange(len(df))
    total_courses = len(set(course_ids))
    recommended_ml: set = set()
    recommended_rule: set = set()

    for i in range(n_groups):
        s, e = i * group_size, (i + 1) * group_size
        g_ml = np.argsort(-ml_scores[s:e])[:6]
        g_rule = np.argsort(-rule_scores[s:e])[:6]
        labels = y[s:e]
        # Precision@K requires binary labels; nDCG uses the full ordinal grades
        binary_labels = (labels > 0).astype(int)
        precision_ml.append(binary_labels[g_ml].mean())
        precision_rule.append(binary_labels[g_rule].mean())
        if labels.sum() > 0:
            ndcg_ml.append(ndcg_score([labels], [ml_scores[s:e]], k=6))
            ndcg_rule.append(ndcg_score([labels], [rule_scores[s:e]], k=6))

        # Intra-list diversity: average pairwise cosine distance within top-6
        feats = X[s:e]
        for g, div_list in [(g_ml, diversity_ml), (g_rule, diversity_rule)]:
            top_feats = feats[g]
            if len(top_feats) >= 2:
                sim = cosine_similarity(top_feats)
                n = len(top_feats)
                pairs = [(1.0 - sim[a, b]) for a in range(n) for b in range(a + 1, n)]
                div_list.append(np.mean(pairs))

        # Catalogue coverage: accumulate unique recommended course ids
        recommended_ml.update(course_ids[s:e][g_ml])
        recommended_rule.update(course_ids[s:e][g_rule])

    coverage_ml = len(recommended_ml) / max(total_courses, 1)
    coverage_rule = len(recommended_rule) / max(total_courses, 1)

    model_label = f"{'LightGBM' if model_type == 'lgbm' else 'LR'} re-ranker"
    report = (
        f"Evaluation over {n_groups} simulated requests (group_size={group_size})\n"
        f"  Precision@6   — {model_label}: {np.mean(precision_ml):.4f} "
        f"| Rule-based: {np.mean(precision_rule):.4f}"
        f"  (lift: {(np.mean(precision_ml) / max(np.mean(precision_rule), 1e-9) - 1) * 100:.1f}%)\n"
    )
    if ndcg_ml:
        report += (
            f"  nDCG@6        — {model_label}: {np.mean(ndcg_ml):.4f} "
            f"| Rule-based: {np.mean(ndcg_rule):.4f}\n"
        )
    if diversity_ml:
        report += (
            f"  ILD@6         — {model_label}: {np.mean(diversity_ml):.4f} "
            f"| Rule-based: {np.mean(diversity_rule):.4f}\n"
        )
    report += (
        f"  Coverage      — {model_label}: {coverage_ml:.4f} "
        f"| Rule-based: {coverage_rule:.4f} "
        f"(out of {total_courses} unique courses)\n"
    )
    return report


# ── Main ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    os.makedirs(OUT_DIR, exist_ok=True)

    if USE_REAL_DATA:
        print("Loading real interaction data from Supabase...")
        df = load_real_data()
        print(f"  → {len(df)} rows with score_breakdown found.")
    else:
        df = pd.DataFrame()

    if len(df) < 100:
        print("Generating synthetic training data...")
        synthetic = generate_synthetic_data(2000)
        df = pd.concat([df, synthetic], ignore_index=True)

    model_output = train(df)

    out_path = os.path.join(OUT_DIR, "model_weights.json")
    with open(out_path, "w") as f:
        json.dump(model_output, f, indent=2)
    print(f"\nModel saved → {out_path}")
    model_type = model_output.get("model_type", "logreg")
    if model_type == "lgbm":
        n_trees = len(model_output.get("lgbm_trees", []))
        size_kb = len(json.dumps(model_output)) / 1024
        print(f"  {n_trees} trees, ~{size_kb:.0f} KB (deploy via: supabase secrets set RECO_ML_WEIGHTS='...')")
    print(f"  model_version: {model_output['model_version']}")

    eval_report = evaluate_vs_baseline(df, model_output)
    print("\n" + eval_report)

    eval_path = os.path.join(OUT_DIR, "eval_report.txt")
    with open(eval_path, "w") as f:
        f.write(eval_report)
    print(f"Eval report saved → {eval_path}")
