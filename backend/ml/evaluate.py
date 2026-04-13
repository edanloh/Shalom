"""
ml/evaluate.py
--------------
Academic evaluation of the recommendation system.
Produces metrics tables suitable for inclusion in your FYP report.

METRICS COMPUTED
----------------
  Precision@K   — of top-K, how many did the user engage with
  nDCG@K        — normalised discounted cumulative gain (rank-aware)
  Coverage      — % of course catalogue ever recommended
  ILD           — Intra-List Diversity (dominant-signal diversity per list)
                  Measures how many distinct recommendation drivers appear in
                  the top-K (e.g. tag_affinity, category_affinity, rating).
                  A score of 1.0 means every item is recommended for a different
                  reason; ~0.17 means all items share the same primary driver.

SYSTEMS COMPARED
----------------
  1. Random baseline          — random selection from catalogue
  2. Popularity baseline      — always return highest-rated courses
  3. Your rule-based system   — rule_score from score_breakdown
  4. ML re-ranker             — logistic regression re-ranked score

Run: python ml/evaluate.py
"""

import json, math, random, os
from datetime import datetime, timedelta, UTC
from collections import defaultdict
import numpy as np
import pandas as pd

# ── Optional LightGBM tree inference ─────────────────────────────────────────
# Mirrors the traverseTree / predictLGBM logic in getMLRecommendations.ts.
def _traverse_tree(node: dict, features: list) -> float:
    if "leaf_value" in node:
        return float(node["leaf_value"])
    val = features[node["split_feature"]] if node["split_feature"] < len(features) else float("nan")
    go_left = node.get("default_left", False) if math.isnan(val) else (val <= node["threshold"])
    return _traverse_tree(node["left_child"] if go_left else node["right_child"], features)

def _predict_lgbm(breakdown: dict, feature_cols: list, trees: list) -> float:
    feats = [breakdown.get(f, 0.0) for f in feature_cols]
    return sum(_traverse_tree(tree, feats) for tree in trees)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
POSITIVE_EVENTS = {"click", "start", "enroll", "complete", "wishlist", "save"}

# ── Supabase real data loader ─────────────────────────────────────────────────
def load_real_requests(lookback_days: int = 90):
    """
    Loads real recommendation events from Supabase.
    Requires that your mobile app saves score_breakdown in the event context.
    Groups events by request_id so each group = one recommendation request,
    matching the structure of make_synthetic_requests().

    Temporal split: events are tagged with their `created_at` timestamp so
    the caller can split into train-era vs evaluation-era requests, preventing
    data leakage where the model is evaluated on data it could have seen during
    training.
    """
    try:
        from supabase import create_client
        from dotenv import load_dotenv
        load_dotenv(os.path.join(SCRIPT_DIR, ".env"))
        load_dotenv(os.path.join(SCRIPT_DIR, "..", ".env"))  # repo root fallback

        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        if not url or not key:
            print("[warn] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — skipping real data.")
            return None

        sb = create_client(url, key)
        since = (datetime.now(UTC) - timedelta(days=lookback_days)).isoformat()
        resp = (
            sb.table("recommendation_events")
            .select("course_id, event_type, context, timestamp")
            .gte("timestamp", since)
            .order("timestamp", desc=False)  # oldest first — for temporal ordering
            .limit(2000)
            .execute()
        )
        rows = resp.data or []
        if not rows:
            print("[warn] No events found in Supabase for this period.")
            return None

        # Group by request_id — each group is one call to getRecommendations
        groups = defaultdict(list)
        ungrouped = []
        for ev in rows:
            ctx = ev.get("context") or {}
            breakdown = ctx.get("score_breakdown")
            if not breakdown:
                continue  # skip events without score_breakdown — see guide
            request_id = ctx.get("requestId") or ctx.get("request_id")
            label = 1 if (ev.get("event_type") or "").lower() in POSITIVE_EVENTS else 0
            # Note: real events don't carry course tags through the event payload,
            # so we leave tags empty. ILD now uses score_breakdown drivers instead.
            created_at = ev.get("timestamp")
            item = {
                "id": ev.get("course_id"),
                "breakdown": breakdown,
                "label": label,
                "tags": [],
                "created_at": created_at,
            }
            if request_id:
                groups[request_id].append(item)
            else:
                ungrouped.append(item)

        requests = [items for items in groups.values() if len(items) >= 3]
        for i in range(0, len(ungrouped), 20):
            chunk = ungrouped[i:i+20]
            if len(chunk) >= 3:
                requests.append(chunk)

        if not requests:
            print("[warn] Events found but none had score_breakdown — update the mobile app to send it.")
            return None

        n_events = sum(len(r) for r in requests)
        print(f"[real data] {n_events} events across {len(requests)} requests loaded from Supabase.")
        return requests

    except Exception as e:
        print(f"[warn] Could not load real data: {e}")
        return None


MODEL_PATH = os.path.join(SCRIPT_DIR, "model_weights.json")
if not os.path.exists(MODEL_PATH):
    raise FileNotFoundError(
        f"[err] Missing model file at {MODEL_PATH}. Train reranker first: python backend/ml/train_reranker.py"
    )

with open(MODEL_PATH, "r") as f:
    MODEL = json.load(f)

FEATURE_COLS = MODEL["feature_cols"]


def ml_score(breakdown: dict) -> float:
    """Dispatch to the right inference function based on model_type."""
    model_type = MODEL.get("model_type", "logreg")
    if model_type == "lgbm":
        return _predict_lgbm(breakdown, FEATURE_COLS, MODEL["lgbm_trees"])
    # Logistic regression path (legacy)
    logit = MODEL.get("intercept", 0.0)
    for i, feat in enumerate(FEATURE_COLS):
        raw = breakdown.get(feat, 0.0)
        scaled = (raw - MODEL["scaler_mean"][i]) / MODEL["scaler_scale"][i]
        logit += scaled * MODEL["weights"].get(feat, 0.0)
    return 1 / (1 + math.exp(-logit))


# ── Synthetic request generator ───────────────────────────────────────────────
def make_synthetic_requests(n_requests=200, candidates_per_request=20, seed=0):
    """
    Generates (candidates, labels) pairs that simulate real inference requests.
    Each request has ~20 candidates; each candidate has a score_breakdown and
    a ground-truth label (1 = user would have clicked, 0 = not).
    """
    rng = np.random.default_rng(seed)
    requests = []

    for _ in range(n_requests):
        n = candidates_per_request
        candidates = []
        for cid in range(n):
            breakdown = {
                "rating":                    float(rng.uniform(0, 1)),
                "user_ctr":                  float(rng.uniform(0, 1)),
                "user_recency":              float(rng.uniform(0, 1)),
                "category_affinity":         float(rng.uniform(0, 1)),
                "instructor_affinity":       float(rng.uniform(0, 1)),
                "tag_affinity":              float(rng.uniform(0, 1)),
                "difficulty_match":          float(rng.uniform(0, 1)),
                "freshness":                 float(rng.uniform(0, 1)),
                "session_intent_boost":      float(rng.uniform(0, 0.5)),
                "popularity":                float(rng.uniform(0, 1)),
                "global_ctr":               float(rng.uniform(0, 1)),
                "ignored_penalty":           float(rng.uniform(0, 1)),
                "dismiss_penalty":           float(rng.uniform(0, 1)),
                "suppression_penalty":       float(rng.uniform(0, 1)),
                "overexposed_penalty":       float(rng.uniform(0, 0.5)),
                "instructor_fatigue_penalty":float(rng.uniform(0, 0.5)),
                "quality_penalty":           float(rng.uniform(0, 0.5)),
                "session_cf_boost":          float(rng.beta(1.5, 3)),
            }
            # Simulated "true" click probability (ground truth)
            true_logit = (
                1.2 * breakdown["rating"]
                + 1.0 * breakdown["category_affinity"]
                + 0.8 * breakdown["tag_affinity"]
                + 0.6 * breakdown["user_ctr"]
                - 0.9 * breakdown["ignored_penalty"]
                - 1.1 * breakdown["dismiss_penalty"]
                - 2.5
            )
            true_prob = 1 / (1 + math.exp(-true_logit))
            label = int(rng.uniform(0, 1) < true_prob)
            tags = [f"tag_{rng.integers(0, 8)}" for _ in range(rng.integers(1, 4))]
            candidates.append({"id": cid, "breakdown": breakdown, "label": label, "tags": tags})
        requests.append(candidates)
    return requests


# ── Scoring functions for each system ─────────────────────────────────────────
def score_random(c):       return random.random()
def score_popularity(c):   return c["breakdown"]["rating"]
def score_rules(c):        return c["breakdown"]["rating"] * 5.5 + c["breakdown"]["category_affinity"] * 1.5
def score_ml(c):           return ml_score(c["breakdown"])


# ── Metric helpers ────────────────────────────────────────────────────────────
def precision_at_k(ranked_labels, k):
    return sum(ranked_labels[:k]) / k

def ndcg_at_k(ranked_labels, k):
    dcg  = sum(l / math.log2(i + 2) for i, l in enumerate(ranked_labels[:k]))
    idcg = sum(1 / math.log2(i + 2) for i in range(min(sum(ranked_labels), k)))
    return dcg / idcg if idcg > 0 else 0.0

def intra_list_diversity(top_k_candidates):
    """
    Measures recommendation reason diversity: what fraction of the top-K items
    are recommended for *different* primary reasons.

    Uses the argmax feature from score_breakdown as a proxy for the dominant
    recommendation signal (e.g. 'tag_affinity', 'category_affinity', 'rating').
    A score of 1.0 means every item in the list is recommended for a distinct
    reason; 0.17 (~1/6) means every item is recommended for the same reason.

    This replaces the previous tag-key-based ILD which was meaningless for real
    data because tags were incorrectly set to breakdown key names.
    """
    if not top_k_candidates:
        return 0.0
    drivers = []
    for c in top_k_candidates:
        breakdown = c.get("breakdown", {})
        if breakdown:
            # Pick the feature with the largest absolute contribution
            top_feature = max(breakdown, key=lambda k: abs(float(breakdown.get(k, 0))))
            drivers.append(top_feature)
        else:
            drivers.append(str(c.get("id", "unknown")))
    if not drivers:
        return 0.0
    return len(set(drivers)) / len(drivers)


# ── Evaluation loop ───────────────────────────────────────────────────────────
def evaluate(requests, score_fn, k=6, name="system"):
    p_at_k, ndcg, ild, coverage_set = [], [], [], set()

    for candidates in requests:
        ranked = sorted(candidates, key=score_fn, reverse=True)
        top_k  = ranked[:k]
        labels = [c["label"] for c in top_k]

        p_at_k.append(precision_at_k(labels, k))
        ndcg.append(ndcg_at_k(labels, k))
        ild.append(intra_list_diversity(top_k))  # pass full candidates, not tag lists
        for c in top_k:
            coverage_set.add(c["id"])

    total_courses = len({c["id"] for req in requests for c in req})
    return {
        "system":        name,
        "Precision@6":   round(np.mean(p_at_k), 4),
        "nDCG@6":        round(np.mean(ndcg), 4),
        "ILD":           round(np.mean(ild), 4),
        "Coverage%":     round(100 * len(coverage_set) / total_courses, 1),
    }


# ── Main ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    # ── Load and optionally split real data ───────────────────────────────────
    real_requests = load_real_requests(lookback_days=90)
    data_source = "real"

    # Temporal split: if real data has timestamps, use the newest 20% for
    # evaluation only. This mirrors how a live system works — the model was
    # trained on historical data and evaluated on data it never saw.
    eval_requests = real_requests
    if real_requests and len(real_requests) >= 20:
        # Sort request groups by the earliest event timestamp in each group
        def group_min_ts(group):
            ts_vals = [c.get("created_at") or "" for c in group]
            return min((t for t in ts_vals if t), default="")

        sorted_real = sorted(real_requests, key=group_min_ts)
        split_idx = int(len(sorted_real) * 0.8)
        if split_idx > 0 and split_idx < len(sorted_real):
            eval_requests = sorted_real[split_idx:]  # newest 20% for evaluation
            print(f"[temporal-split] Using newest {len(eval_requests)}/{len(sorted_real)} request groups for evaluation.")

    if eval_requests is None or len(eval_requests) < 10:
        if eval_requests is not None:
            print(f"[warn] Only {len(eval_requests)} real requests — supplementing with synthetic data.")
        else:
            print("Falling back to synthetic data.")
        synthetic = make_synthetic_requests(n_requests=500)
        eval_requests = (eval_requests or []) + synthetic
        data_source = "synthetic" if not real_requests else "mixed"

    print(f"Evaluating on {len(eval_requests)} requests (source: {data_source})...\n")

    model_label = f"ML re-ranker ({MODEL.get('model_version', 'unknown')})"
    results = [
        evaluate(eval_requests, score_random,     name="Random baseline"),
        evaluate(eval_requests, score_popularity,  name="Popularity baseline"),
        evaluate(eval_requests, score_rules,       name="Rule-based (rules_v2)"),
        evaluate(eval_requests, score_ml,          name=model_label),
    ]

    df = pd.DataFrame(results).set_index("system")
    print("\n" + "=" * 65)
    print("RECOMMENDATION SYSTEM EVALUATION RESULTS")
    print("=" * 65)
    print(df.to_string())
    print("=" * 65)
    print("\nMetric definitions:")
    print("  Precision@6  — fraction of top-6 the user would click (higher = better)")
    print("  nDCG@6       — rank-weighted precision (higher = better, max 1.0)")
    print("  ILD          — intra-list diversity via dominant recommendation driver (higher = more varied signals)")
    print("  Coverage%    — % of catalogue that ever appears in a recommendation")

    report_path = os.path.join(SCRIPT_DIR, "eval_report.txt")
    with open(report_path, "w") as f:
        f.write(f"RECOMMENDATION SYSTEM EVALUATION RESULTS (data: {data_source})\n")
        f.write("=" * 65 + "\n")
        f.write(df.to_string())
        f.write("\n\n")
        f.write("Notes:\n")
        if data_source == "real":
            f.write("  - Evaluation used the newest 20% of request groups (temporal split).\n")
            f.write("    This prevents data leakage from training-era events.\n")
        f.write(f"  - ML model: {MODEL.get('model_type', 'logreg')} / {MODEL.get('model_version', 'unknown')}\n")
    print(f"\nSaved to {report_path}")
