"""
ml/check_and_retrain.py
-----------------------
Event-count-triggered online retraining.

Reads `trained_at` from the current model_weights.json, counts how many new
positive recommendation events have arrived since then, and kicks off a full
retrain + Storage upload when the count crosses a configurable threshold.

This is the simplest form of "online learning" — not truly online (no
incremental gradient updates), but ensures the model re-learns from real
user behaviour automatically without needing a calendar-based cron.

USAGE
-----
  python ml/check_and_retrain.py                  # default threshold (100)
  python ml/check_and_retrain.py --threshold 50   # retrain after 50 new positives
  python ml/check_and_retrain.py --dry-run        # check count only, no retrain

INTEGRATION
-----------
  Add to a GitHub Actions workflow or a server cron:
    0 */6 * * *  cd /repo && python backend/ml/check_and_retrain.py
  This runs every 6 hours and retrains only when enough new data has arrived.
"""

import argparse, json, os, subprocess, sys
from datetime import datetime, UTC

from dotenv import load_dotenv

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(SCRIPT_DIR, ".env"))
load_dotenv(os.path.join(SCRIPT_DIR, "..", ".env"))

POSITIVE_EVENTS = {"click", "start", "enroll", "complete", "wishlist", "save"}
MODEL_PATH = os.path.join(SCRIPT_DIR, "model_weights.json")


def load_trained_at() -> str | None:
    if not os.path.exists(MODEL_PATH):
        return None
    with open(MODEL_PATH) as f:
        return json.load(f).get("trained_at")


def count_new_events(since: str) -> int:
    from supabase import create_client
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        sys.exit("[err] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set.")

    sb = create_client(url, key)
    resp = (
        sb.table("recommendation_events")
        .select("event_type", count="exact")
        .gte("timestamp", since)
        .in_("event_type", list(POSITIVE_EVENTS))
        .execute()
    )
    return resp.count or 0


def upload_model() -> bool:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        return False

    import urllib.request
    with open(MODEL_PATH, "rb") as f:
        data = f.read()

    req = urllib.request.Request(
        f"{url}/storage/v1/object/ml-models/model_weights.json",
        data=data,
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req) as resp:
            ok = resp.status in (200, 201)
            print(f"  Upload HTTP {resp.status} — {'ok' if ok else 'failed'}")
            return ok
    except Exception as exc:
        print(f"  Upload failed: {exc}")
        return False


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--threshold", type=int, default=100,
                        help="Minimum new positive events before retraining (default: 100)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Check event count but do not retrain")
    args = parser.parse_args()

    trained_at = load_trained_at()
    if not trained_at:
        print("[warn] No model_weights.json found — running initial training.")
        trained_at = "2000-01-01T00:00:00+00:00"

    print(f"Last trained at: {trained_at}")
    print(f"Counting new positive events since then...")

    count = count_new_events(trained_at)
    print(f"New positive events: {count} / threshold: {args.threshold}")

    if count < args.threshold:
        print(f"Not enough new data — skipping retrain. ({count}/{args.threshold})")
        return

    if args.dry_run:
        print("[dry-run] Would retrain — threshold reached.")
        return

    print(f"\nThreshold reached — retraining...")
    result = subprocess.run(
        [sys.executable, os.path.join(SCRIPT_DIR, "train_reranker.py")],
        capture_output=False,
    )
    if result.returncode != 0:
        print("Training failed.")
        sys.exit(result.returncode)

    print("\nUploading model to Supabase Storage...")
    if upload_model():
        print(f"\n✓ Retrain complete. New model deployed at {datetime.now(UTC).isoformat()}")
    else:
        print("\n✗ Training succeeded but upload failed. Run retrain_and_deploy.sh manually.")
        sys.exit(1)


if __name__ == "__main__":
    main()
