"""
backend/ml/embed_courses.py
---------------------------
Computes 384-dim sentence embeddings for every published course and upserts
them into the `courses.embedding` (vector) column in Supabase.

Run this once after applying add_embeddings.sql, and again whenever your
course catalogue changes significantly (new courses, major description edits).
The script is safe to re-run — by default it only embeds courses whose
embedding is currently NULL. Use --force to re-embed everything.

SETUP
-----
    pip install sentence-transformers supabase python-dotenv

    # Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/ml/.env
    # or backend/.env (repo root fallback).

USAGE
-----
    python backend/ml/embed_courses.py           # embed new/unembedded courses
    python backend/ml/embed_courses.py --force   # re-embed all courses

AFTER RUNNING
-------------
    Set RECO_EMBEDDINGS_ENABLED=true in Supabase secrets to activate pgvector
    similarity in getRecommendations.ts:
        supabase secrets set RECO_EMBEDDINGS_ENABLED=true
"""

import argparse, os, sys, time
from dotenv import load_dotenv

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(SCRIPT_DIR, ".env"))
load_dotenv(os.path.join(SCRIPT_DIR, "..", ".env"))  # repo root fallback

# ── Dependency checks ──────────────────────────────────────────────────────────
try:
    from sentence_transformers import SentenceTransformer
except ImportError:
    sys.exit(
        "[err] sentence-transformers not installed.\n"
        "      Run: pip install sentence-transformers"
    )

try:
    from supabase import create_client
except ImportError:
    sys.exit(
        "[err] supabase not installed.\n"
        "      Run: pip install supabase"
    )

# ── Config ─────────────────────────────────────────────────────────────────────
# all-MiniLM-L6-v2: 22 MB, 384 dims, fast on CPU, strong semantic quality.
# Produces normalised vectors (cosine similarity = dot product).
MODEL_NAME   = "all-MiniLM-L6-v2"
EMBED_BATCH  = 64   # sentences per model.encode() call
UPSERT_BATCH = 20   # rows per Supabase upsert (avoids request size limits)


def build_text(course: dict) -> str:
    """
    Concatenates the semantically richest fields into a single input string.
    Tags are joined with spaces so the model treats them as keywords.
    Description is capped at 400 chars — longer text adds noise, not signal,
    for short course blurbs.
    """
    title       = (course.get("title") or "").strip()
    description = (course.get("description") or "")[:400].strip()
    tags        = " ".join(t for t in (course.get("tags") or []) if isinstance(t, str))
    category    = (course.get("category_name") or "").strip()
    # Format: "Title. Category. tag1 tag2 tag3. Description snippet."
    parts = [p for p in [title, category, tags, description] if p]
    return ". ".join(parts)


def main() -> None:
    parser = argparse.ArgumentParser(description="Embed courses into Supabase pgvector.")
    parser.add_argument(
        "--force", action="store_true",
        help="Re-embed all published courses, including those already embedded."
    )
    args = parser.parse_args()

    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        sys.exit(
            "[err] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.\n"
            "      Add them to backend/ml/.env or backend/.env"
        )

    sb = create_client(url, key)

    # ── Fetch courses ──────────────────────────────────────────────────────────
    print("Fetching courses from Supabase...")
    query = (
        sb.table("courses")
        .select("id, title, description, tags, category:categories(name)")
        .eq("is_published", True)
    )
    if not args.force:
        query = query.is_("embedding", "null")

    resp = query.execute()
    courses = resp.data or []

    if not courses:
        print(
            "No courses need embedding. All published courses already have embeddings.\n"
            "Use --force to re-embed everything."
        )
        return

    # Flatten nested category join (Supabase returns {"name": "..."})
    for c in courses:
        if isinstance(c.get("category"), dict):
            c["category_name"] = c["category"].get("name") or ""

    print(f"Embedding {len(courses)} courses with {MODEL_NAME}...")
    model = SentenceTransformer(MODEL_NAME)

    texts = [build_text(c) for c in courses]

    # ── Compute embeddings in batches ──────────────────────────────────────────
    all_embeddings: list[list[float]] = []
    for i in range(0, len(texts), EMBED_BATCH):
        batch = texts[i : i + EMBED_BATCH]
        vecs = model.encode(
            batch,
            show_progress_bar=False,
            normalize_embeddings=True,  # cosine sim = dot product
            batch_size=EMBED_BATCH,
        )
        all_embeddings.extend(vecs.tolist())
        n_done = min(i + EMBED_BATCH, len(texts))
        print(f"  Encoded {n_done}/{len(courses)}", end="\r")
    print()  # newline after progress

    # ── Upsert to Supabase ─────────────────────────────────────────────────────
    print(f"Upserting {len(courses)} embeddings to Supabase (batch size {UPSERT_BATCH})...")
    success = failed = 0

    for i in range(0, len(courses), UPSERT_BATCH):
        batch_courses = courses[i : i + UPSERT_BATCH]
        batch_embs    = all_embeddings[i : i + UPSERT_BATCH]
        for course, emb in zip(batch_courses, batch_embs):
            try:
                sb.table("courses") \
                  .update({"embedding": emb}) \
                  .eq("id", course["id"]) \
                  .execute()
                success += 1
            except Exception as exc:
                print(f"\n  [warn] Update failed for course {course['id']}: {exc}")
                failed += 1
        time.sleep(0.05)  # gentle rate limiting

    print(f"\nDone.")
    print(f"  ✓ {success} courses embedded successfully.")
    if failed:
        print(f"  ✗ {failed} courses failed — re-run to retry (NULL embeddings will be retried automatically).")
    else:
        print(
            "\nNext step: activate embeddings in getRecommendations.ts by running:\n"
            "  supabase secrets set RECO_EMBEDDINGS_ENABLED=true\n"
            "Then redeploy the getRecommendations function."
        )


if __name__ == "__main__":
    main()
