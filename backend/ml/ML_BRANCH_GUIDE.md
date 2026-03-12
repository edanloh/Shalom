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
pip install pandas scikit-learn numpy python-dotenv joblib supabase
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

```bash
# Store model weights as a Supabase secret
supabase secrets set RECO_ML_WEIGHTS="$(cat ml/model_weights.json)"

# Deploy the new function
supabase functions deploy getMLRecommendations
```

---

## 7. Route some traffic to the ML function

The A/B infrastructure is already in `getRecommendations.ts`.
To test ML on 20% of users, set these env vars in Supabase:

```
RECO_SPLIT_V2=80       # 80% rule-based
RECO_SPLIT_V2A=20      # 20% ML (point this to getMLRecommendations)
```

Or for the demo, force ML for your demo user:
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
- Model: Logistic Regression (Learning-to-Rank)
- Features: 17 signals derived from user behaviour, course metadata, and session context
- Training: supervised, binary labels (click/no-click) from interaction data
- Evaluation: 5-fold cross-validated AUC, Precision@6, nDCG@6 on held-out simulated requests

### Limitations (important to include — examiners appreciate honesty)
- With <100 real events, training relies heavily on synthetic data
- Synthetic data uses heuristic click probabilities, not true user behaviour
- Logistic regression assumes feature independence (limitation vs tree-based models)
- Model weights are static — no online learning / periodic retraining yet
- Natural next step: collect more real events, retrain monthly, compare LR vs LightGBM

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
