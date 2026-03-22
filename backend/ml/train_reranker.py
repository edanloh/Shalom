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
  Stage 2 (new, ML):   logistic regression re-ranker     →  top 6 results

RUNNING
-------
  pip install pandas scikit-learn supabase python-dotenv joblib
  python ml/train_reranker.py

OUTPUT
------
  ml/model_weights.json   — 16 feature weights + intercept (deploy as Supabase secret)
  ml/eval_report.txt      — Precision@K, nDCG@K vs rule-based baseline
"""

import json, os, sys
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import StratifiedKFold
from sklearn.metrics import roc_auc_score
from dotenv import load_dotenv

load_dotenv()

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = SCRIPT_DIR

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
]

POSITIVE_EVENTS = {"click", "start", "enroll", "complete", "wishlist", "save"}


# ── Real data loader ──────────────────────────────────────────────────────────
def load_real_data() -> pd.DataFrame:
    """
    Joins recommendation_events with the score_breakdown stored in context.
    Also extracts `rank` (for position-bias correction) and `request_id`
    (for pairwise training) from the event context.
    """
    since = (datetime.utcnow() - timedelta(days=90)).isoformat()
    resp = (
        sb.table("recommendation_events")
        .select("course_id, event_type, context")
        .gte("timestamp", since)
        .execute()
    )
    rows = []
    for ev in resp.data or []:
        ctx = ev.get("context") or {}
        breakdown = ctx.get("score_breakdown")
        if not breakdown:
            continue
        label = 1 if (ev.get("event_type") or "").lower() in POSITIVE_EVENTS else 0
        row = {"label": label, "course_id": ev.get("course_id")}
        for feat in FEATURE_COLS:
            row[feat] = float(breakdown.get(feat, 0.0))
        # Position in the recommendation list — used for position-bias correction
        row["rank"] = int(ctx.get("rank") or ctx.get("recommendation_rank") or 0)
        # Request ID — used to group candidates for pairwise training
        row["request_id"] = ctx.get("requestId") or ctx.get("request_id") or None
        rows.append(row)
    return pd.DataFrame(rows)


# ── Synthetic data generator ──────────────────────────────────────────────────
def generate_synthetic_data(n_samples: int = 2000) -> pd.DataFrame:
    """
    Generates plausible (features, label) pairs that mimic real user behaviour.
    Logic: users are more likely to click courses with high rating, high
    category/tag affinity, and low penalties.
    """
    rng = np.random.default_rng(42)
    data = {feat: rng.uniform(0, 1, n_samples) for feat in FEATURE_COLS}
    # penalties should be non-negative
    for pen in ["ignored_penalty", "dismiss_penalty", "suppression_penalty",
                "overexposed_penalty", "instructor_fatigue_penalty", "quality_penalty"]:
        data[pen] = rng.uniform(0, 2, n_samples)
    # thompson_bonus is a 0-1 exploration signal; new courses cluster near 0.6
    data["thompson_bonus"] = rng.beta(2, 2, n_samples)
    # difficulty_progression: 0=wrong direction, 0.5=neutral, 1=perfect next step
    data["difficulty_progression"] = rng.choice([0.1, 0.4, 0.5, 0.6, 1.0], n_samples)

    df = pd.DataFrame(data)

    logit = (
        1.2 * df["rating"]
        + 1.0 * df["category_affinity"]
        + 0.9 * df["tag_affinity"]
        + 0.8 * df["content_similarity_boost"]
        + 0.7 * df["user_ctr"]
        + 0.6 * df["difficulty_progression"]  # next-step courses get clicked more
        + 0.5 * df["popularity"]
        + 0.4 * df["freshness"]
        + 0.3 * df["thompson_bonus"]
        + 0.3 * df["session_intent_boost"]
        - 0.8 * df["ignored_penalty"]
        - 1.0 * df["dismiss_penalty"]
        - 0.6 * df["suppression_penalty"]
        - 3.0
    )
    prob = 1 / (1 + np.exp(-logit))
    df["label"] = (rng.uniform(0, 1, n_samples) < prob).astype(int)

    return df


# ── Position-bias correction ──────────────────────────────────────────────────
def compute_position_weights(df: pd.DataFrame) -> np.ndarray:
    """
    Inverse propensity scoring (IPS) to correct for position bias.

    Items shown at rank 1 receive far more clicks than rank 6 purely because of
    their position, not their quality. Without correction, the model learns to
    treat high rule-based score (which drives rank) as a click signal, creating
    a feedback loop that amplifies existing biases.

    We estimate the click-through rate at each observed rank position and
    reweight each training example by 1/propensity, so that a click at rank 5
    is treated as more informative than a click at rank 1.

    Requires 'rank' column populated from event context. Falls back to uniform
    weights if rank data is unavailable or too sparse.
    """
    if "rank" not in df.columns or (df["rank"] == 0).all():
        return np.ones(len(df))

    ranked = df[df["rank"] > 0]
    if len(ranked) < 30:
        return np.ones(len(df))

    # Smooth propensity toward the global mean to avoid extreme weights
    global_ctr = ranked["label"].mean()
    position_ctr = ranked.groupby("rank")["label"].mean()
    smoothed_ctr = position_ctr * 0.6 + global_ctr * 0.4

    weights = df["rank"].map(
        lambda r: 1.0 / max(float(smoothed_ctr.get(r, global_ctr)), 0.01)
        if r > 0 else 1.0
    ).astype(float)

    # Normalise so mean weight = 1 (prevents learning-rate scaling issues)
    return (weights / weights.mean()).values


# ── Pairwise preference data ───────────────────────────────────────────────────
def generate_pairwise_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    Converts pointwise events into BradleyTerry preference pairs for pairwise LTR.

    For each recommendation request where at least one item was clicked and one
    was not, generates (features_A - features_B, label=1) pairs where A was
    preferred (clicked) over B.

    DATA QUALITY: raw event rows include one row per event type per course
    (impression, click, start, complete…). Mixing these directly creates noise
    because the same course appears multiple times per request with different
    labels. We first deduplicate to one row per (request_id, course_id), keeping
    the strongest signal (highest label) so a course that was clicked is always
    label=1 regardless of how many impression rows it also has.
    """
    if "request_id" not in df.columns or df["request_id"].isna().all():
        return pd.DataFrame(columns=FEATURE_COLS + ["label"])

    # Deduplicate: one canonical row per (request_id, course_id).
    # Sort by label descending so the strongest signal (click=1) wins keep="first".
    deduped = (
        df[df["request_id"].notna()]
        .sort_values("label", ascending=False)
        .drop_duplicates(subset=["request_id", "course_id"] if "course_id" in df.columns else ["request_id"], keep="first")
    )

    pairs: list[dict] = []
    for req_id, group in deduped.groupby("request_id"):
        if pd.isna(req_id):
            continue
        pos = group[group["label"] == 1]
        neg = group[group["label"] == 0]
        if pos.empty or neg.empty:
            continue
        # Cap samples per request to avoid combinatorial explosion
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


# ── Training ──────────────────────────────────────────────────────────────────
def train(df: pd.DataFrame) -> dict:
    if len(df) < 50:
        print(f"[warn] Only {len(df)} samples — supplementing with synthetic data.")
        df = pd.concat([df, generate_synthetic_data(1500)], ignore_index=True)

    X_raw = df[FEATURE_COLS].fillna(0).values
    y_raw = df["label"].values

    print(f"Training on {len(df)} samples  |  positive rate: {y_raw.mean():.2%}")

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_raw)

    # ── Position-bias correction ──────────────────────────────────────────────
    sample_weights = compute_position_weights(df)
    bias_corrected = not np.all(sample_weights == 1.0)
    if bias_corrected:
        print(f"[ips] Position-bias correction applied across {df['rank'].nunique()} rank positions.")

    # ── Pairwise training when enough data exists ─────────────────────────────
    # Pairwise optimises ranking directly. Requires request_id and ≥500 samples
    # so there are enough request groups to generate reliable preference pairs.
    has_request_ids = "request_id" in df.columns and df["request_id"].notna().sum() >= 50
    use_pairwise = len(df) >= 500 and has_request_ids
    if use_pairwise:
        # Generate pairs from already-scaled features so the scaler isn't refitted
        scaled_df = pd.DataFrame(X_scaled, columns=FEATURE_COLS)
        scaled_df["label"] = y_raw
        scaled_df["request_id"] = df["request_id"].values if "request_id" in df.columns else None
        scaled_df["course_id"] = df["course_id"].values if "course_id" in df.columns else None
        pair_df = generate_pairwise_data(scaled_df)
        if len(pair_df) >= 100:
            X_train = pair_df[FEATURE_COLS].values
            y_train = pair_df["label"].values
            # Pairwise data has balanced classes by construction; skip class_weight
            train_weights = np.ones(len(y_train))
            print(f"[pairwise] Using {len(pair_df)} pairs for training.")
        else:
            X_train, y_train, train_weights = X_scaled, y_raw, sample_weights
            use_pairwise = False
    else:
        X_train, y_train, train_weights = X_scaled, y_raw, sample_weights

    model = LogisticRegression(
        C=1.0,
        max_iter=500,
        class_weight=None if use_pairwise else "balanced",
        solver="lbfgs",
    )

    # Cross-validated AUC (always on original pointwise data for comparability)
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    aucs = []
    for train_idx, val_idx in cv.split(X_scaled, y_raw):
        fold_weights = train_weights[:len(X_scaled)][train_idx] if not use_pairwise else None
        model.fit(X_scaled[train_idx], y_raw[train_idx], sample_weight=fold_weights)
        prob = model.predict_proba(X_scaled[val_idx])[:, 1]
        aucs.append(roc_auc_score(y_raw[val_idx], prob))
    print(f"CV AUC: {np.mean(aucs):.4f} ± {np.std(aucs):.4f}"
          f"  [{'pairwise' if use_pairwise else 'pointwise'}"
          f"{', IPS' if bias_corrected else ''}]")

    # Final fit on all training data
    model.fit(X_train, y_train, sample_weight=train_weights if not use_pairwise else None)

    weights = {feat: float(coef) for feat, coef in zip(FEATURE_COLS, model.coef_[0])}
    output = {
        "model_version": "ltr_logreg_v1",
        "trained_at": datetime.utcnow().isoformat() + "Z",
        "n_samples": int(len(df)),
        "cv_auc_mean": float(np.mean(aucs)),
        "cv_auc_std": float(np.std(aucs)),
        "training_mode": "pairwise" if use_pairwise else "pointwise",
        "position_bias_corrected": bias_corrected,
        "scaler_mean": scaler.mean_.tolist(),
        "scaler_scale": scaler.scale_.tolist(),
        "feature_cols": FEATURE_COLS,
        "intercept": float(model.intercept_[0]),
        "weights": weights,
    }

    importance = sorted(weights.items(), key=lambda x: abs(x[1]), reverse=True)
    print("\nFeature importance (learned weights):")
    for feat, w in importance:
        bar = "█" * int(abs(w) * 10)
        sign = "+" if w >= 0 else "-"
        print(f"  {feat:<35} {sign}{abs(w):.4f}  {bar}")

    return output


def evaluate_vs_baseline(df: pd.DataFrame, weights: dict) -> str:
    """
    Compare Precision@K between ML re-ranker and rule-based score (the 'rating'
    column acts as a stand-in for the raw rule-based ordering).
    Groups by simulated 'request' buckets of 20 candidates.
    """
    if len(df) < 40:
        return "Insufficient data for evaluation."

    X = df[FEATURE_COLS].fillna(0).values
    y = df["label"].values
    feat_weights = np.array([weights[f] for f in FEATURE_COLS])

    ml_scores = X @ feat_weights  # simple dot product (no scaling for comparison)
    rule_scores = X[:, FEATURE_COLS.index("rating")] * 5  # rule-based proxy

    # Simulate requests as groups of 20 candidates
    group_size = 20
    n_groups = len(df) // group_size
    precision_ml, precision_rule = [], []

    for i in range(n_groups):
        s = i * group_size
        e = s + group_size
        g_ml = np.argsort(-ml_scores[s:e])[:6]
        g_rule = np.argsort(-rule_scores[s:e])[:6]
        precision_ml.append(y[s:e][g_ml].mean())
        precision_rule.append(y[s:e][g_rule].mean())

    report = (
        f"Evaluation over {n_groups} simulated requests (group_size={group_size})\n"
        f"  Precision@6  —  ML re-ranker: {np.mean(precision_ml):.4f} "
        f"| Rule-based: {np.mean(precision_rule):.4f}\n"
        f"  Lift: {(np.mean(precision_ml) / max(np.mean(precision_rule), 1e-9) - 1) * 100:.1f}%\n"
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

    eval_report = evaluate_vs_baseline(df, model_output["weights"])
    print("\n" + eval_report)

    eval_path = os.path.join(OUT_DIR, "eval_report.txt")
    with open(eval_path, "w") as f:
        f.write(eval_report)
    print(f"Eval report saved → {eval_path}")
