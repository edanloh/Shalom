#!/bin/bash
# backend/ml/retrain_and_deploy.sh
# ---------------------------------
# Retrains the ML re-ranker, updates the Supabase secret, and redeploys
# the getMLRecommendations edge function.
#
# Usage (from backend/):
#   chmod +x ml/retrain_and_deploy.sh   ← run once to make it executable
#   ./ml/retrain_and_deploy.sh

set -e  # stop on any error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
WEIGHTS_FILE="$SCRIPT_DIR/model_weights.json"
VENV_PYTHON="$BACKEND_DIR/../.venv/bin/python"

# Use venv python if available, otherwise fall back to system python
if [ -f "$VENV_PYTHON" ]; then
  PYTHON="$VENV_PYTHON"
else
  PYTHON="python"
fi

echo "╔══════════════════════════════════════════╗"
echo "║   ML Re-ranker: Retrain & Deploy         ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ── Step 1: Retrain ───────────────────────────────────────────────────────────
echo "▶ Step 1/3 — Retraining model..."
cd "$SCRIPT_DIR"
$PYTHON train_reranker.py
echo ""

# Check weights file was generated
if [ ! -f "$WEIGHTS_FILE" ]; then
  echo "✗ model_weights.json not found after training. Aborting."
  exit 1
fi

# ── Step 2: Update Supabase secret ───────────────────────────────────────────
echo "▶ Step 2/3 — Updating Supabase secret RECO_ML_WEIGHTS..."
cd "$BACKEND_DIR"
WEIGHTS=$(cat "$WEIGHTS_FILE")
supabase secrets set RECO_ML_WEIGHTS="$WEIGHTS"
echo ""

# ── Step 3: Redeploy edge function ───────────────────────────────────────────
echo "▶ Step 3/3 — Secret updated. To apply new weights:"
echo "   1. Go to Supabase Dashboard → Edge Functions → getMLRecommendations"
echo "   2. Click 'Deploy updates' (top right)"
echo "   OR run: supabase functions deploy getMLRecommendations --project-ref cmtfxsntlfoxgcznanpe"
echo ""

echo "✓ Done. Model retrained and secret updated."
echo "  Weights file: $WEIGHTS_FILE"
echo "  Run evaluate.py to get updated metrics."
