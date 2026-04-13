#!/bin/bash
# backend/ml/retrain_and_deploy.sh
# ---------------------------------
# Retrains the ML re-ranker, uploads model_weights.json to Supabase Storage,
# and redeploys the getMLRecommendations edge function.
#
# Model weights are stored in the "ml-models" Storage bucket (not a secret)
# because the LightGBM JSON exceeds Supabase's 24 KB secret limit.
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

# ── Step 2: Upload model weights to Supabase Storage ─────────────────────────
echo "▶ Step 2/3 — Uploading model_weights.json to Supabase Storage (ml-models bucket)..."

# Load .env for SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
if [ -f "$BACKEND_DIR/.env" ]; then
  set -a; source "$BACKEND_DIR/.env"; set +a
elif [ -f "$BACKEND_DIR/../.env" ]; then
  set -a; source "$BACKEND_DIR/../.env"; set +a
fi

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "✗ SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set. Add them to backend/.env"
  exit 1
fi

HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "${SUPABASE_URL}/storage/v1/object/ml-models/model_weights.json" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  --data-binary @"$WEIGHTS_FILE")

if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "201" ]; then
  echo "  ✓ Upload succeeded (HTTP $HTTP_STATUS)"
else
  echo "  ✗ Upload failed (HTTP $HTTP_STATUS)"
  echo "    Make sure the 'ml-models' bucket exists (Supabase Dashboard → Storage → New bucket)"
  exit 1
fi
echo ""

# ── Step 3: Redeploy edge function ───────────────────────────────────────────
echo "▶ Step 3/3 — Model uploaded. To apply new weights:"
echo "   The edge function loads from Storage on cold start — no redeploy needed."
echo "   To force an immediate reload, redeploy via Dashboard or:"
echo "     supabase functions deploy getMLRecommendations --project-ref cmtfxsntlfoxgcznanpe"
echo ""

echo "✓ Done. Model retrained and uploaded."
echo "  Weights file: $WEIGHTS_FILE"
echo "  Run evaluate.py to get updated metrics."
