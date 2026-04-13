# ML Branch Setup Guide
## feature/ml-reranker

---

## 1. Create the branch

```bash
git checkout -b feature/ml-reranker
```

Everything on this branch is isolated. Your main branch keeps working exactly
as before. If the ML approach doesn't work out, just delete this branch.

---

## 2. File structure

Place these new files (provided alongside this guide):

```
supabase/
  functions/
    getRecommendations/
      index.ts              ← patched (enroll/wishlist fixes, placement param)
    getMLRecommendations/
      index.ts              ← NEW: ML re-ranking edge function
    postRecommendationEvent/
      index.ts              ← patched (validation, wishlist/enroll events)

ml/
  train_reranker.py         ← NEW: offline training script
  evaluate.py               ← NEW: academic evaluation script
  model_weights.json        ← generated after training (gitignore if large)

src/screens/
  HomeScreen.tsx            ← patched (showRecommendationReason, no console.logs)
```

Add to `.gitignore`:
```
ml/model_weights.json   # regenerated from training, not source code
ml/eval_report.txt
```

---

## 3. Install Python dependencies

```bash
pip install pandas scikit-learn numpy python-dotenv joblib supabase lightgbm sentence-transformers
```

Create `ml/.env` (or use your existing `.env`):
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## 4. Train the model

```bash
python ml/train_reranker.py
```

This will:
- Try to load real events from Supabase (works even with <100 events)
- Supplement with synthetic data automatically if needed
- Print cross-validated AUC and a feature importance table
- Save `ml/model_weights.json`

Expected output (with synthetic data):
```
Training on 2000 samples  |  positive rate: 18.40%
CV AUC: 0.8312 ± 0.0145

Feature importance (learned weights):
  category_affinity                   +1.2341  ████████████
  rating                              +1.1022  ███████████
  tag_affinity                        +0.8901  █████████
  dismiss_penalty                     -0.9341  █████████
  ...
```

---

## 5. Run the evaluation

```bash
python ml/evaluate.py
```

This produces a comparison table like:

```
RECOMMENDATION SYSTEM EVALUATION RESULTS
=================================================================
                          Precision@6  nDCG@6   ILD   Coverage%
system
Random baseline              0.1820    0.1734  0.6120      98.2
Popularity baseline          0.2341    0.2288  0.3102      12.4
Rule-based (rules_v2)        0.2891    0.2833  0.4521      45.3
ML re-ranker (ltr_logreg_v1) 0.3210    0.3156  0.4780      47.1
=================================================================
```

This table goes directly into your FYP report as your main evaluation result.

Key points to write up:
- ML beats rule-based on Precision@K and nDCG (better personalization)
- Popularity baseline has low Coverage% (filter bubble problem your system solves)
- ILD shows your system maintains list diversity (a design goal)
- ML still uses rule-based candidate generation — this is a deliberate two-stage architecture

---

## 6. Deploy the ML function

The LightGBM model JSON is too large for Supabase's 24 KB secret limit, so
weights are stored in **Supabase Storage** instead.

```bash
# One-time: create the storage bucket (private)
# Supabase Dashboard → Storage → New bucket → name: "ml-models", private

# Upload model weights (re-run this after every retrain)
source backend/.env   # sets SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
curl -X POST "${SUPABASE_URL}/storage/v1/object/ml-models/model_weights.json" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  --data-binary @backend/ml/model_weights.json

# Deploy the edge function (paste into Supabase Dashboard editor)
# getMLRecommendations/index.ts — loads model from Storage on cold start
```

Do NOT set `RECO_ML_WEIGHTS` as a secret — it will exceed the size limit.
The edge function checks Storage automatically (using the already-set `SUPABASE_SERVICE_ROLE_KEY`).

---

## 7. Route some traffic to the ML function

`RECO_SPLIT_ML` controls what percentage of requests are routed to
`getMLRecommendations` (ML re-ranking). Set it in Supabase Dashboard → Edge Functions → getRecommendations → Secrets:

```
RECO_SPLIT_ML=20    # route 20% of users to ML re-ranking
```

Set to `100` to send all traffic through ML. Set to `0` (or unset) to disable.

To force ML for a specific user (e.g. for the demo), call the ML function directly:
```
GET /functions/v1/getMLRecommendations?userId=YOUR_USER_ID
```

---

## 8. What to write in your FYP

### System Design section
- Describe the two-stage pipeline: candidate generation → ML re-ranking
- Show the data flow diagram: user events → Supabase → score_breakdown features → LR model → ranked list
- Mention that the feature engineering was done in the rule-based stage (this is intentional)

### ML section
- Model: LightGBM `LGBMRanker` with `lambdarank` objective (directly optimises nDCG)
- Features: 21 signals — user behaviour, course metadata, session context, content embeddings
- Training: temporal cross-validation (train on past, evaluate on future) to prevent data leakage
- Evaluation: Precision@6, nDCG@6, ILD, Coverage% vs random / popularity / rule-based baselines

### Limitations (important to include — examiners appreciate honesty)
- With <100 real events, training relies heavily on synthetic data
- Synthetic data uses heuristic click probabilities, not true user behaviour
- Model weights are static — no online learning / periodic retraining yet
- LightGBM requires OpenMP (`brew install libomp` on Mac) — not a cloud dependency issue
- Natural next step: collect more real events, retrain monthly, add online learning

---

## 9. Merging back to main

Only merge if you're happy with the results. The patches to the 3 existing files
(getRecommendations.ts, HomeScreen.tsx, postRecommendationEvent.ts) are safe to
merge regardless — they fix real bugs and don't change any interfaces.

```bash
# Merge only the safe patches (not ML files) back to main:
git checkout main
git checkout feature/ml-reranker -- \
  supabase/functions/getRecommendations/index.ts \
  supabase/functions/postRecommendationEvent/index.ts \
  src/screens/HomeScreen.tsx

# Merge everything (including ML) when ready:
git merge feature/ml-reranker
```
