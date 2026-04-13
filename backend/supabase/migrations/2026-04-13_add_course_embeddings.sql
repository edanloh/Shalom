-- 2026-04-13_add_course_embeddings.sql
-- ------------------------------------
-- Adds semantic embedding infrastructure for pgvector-based recommendation
-- retrieval. Two stages are activated by setting RECO_EMBEDDINGS_ENABLED=true:
--
--   Stage 1 (candidate retrieval):
--     get_embedding_candidates() — ANN search to find semantically similar
--     courses given a user's interest profile (centroid of enrolled embeddings).
--     This REPLACES the rule-based category/long-tail candidate pools with a
--     vector search, producing a richer starting point for the ranking stage.
--
--   Stage 2 (re-scoring):
--     get_embedding_similarity() — Scores a fixed set of candidates by
--     cosine similarity to the user's interest centroid. Used to populate
--     content_similarity_boost in score_breakdown.
--
-- SETUP
-- -----
--   1. Apply this migration:
--        supabase db push
--
--   2. Generate embeddings (run once, then periodically for new courses):
--        pip install sentence-transformers supabase python-dotenv
--        python backend/ml/embed_courses.py
--
--   3. Enable in the edge function:
--        supabase secrets set RECO_EMBEDDINGS_ENABLED=true
--
-- MODEL: all-MiniLM-L6-v2 (384 dimensions, normalised vectors)
--   Produces L2-normalised embeddings so cosine similarity = 1 - L2-distance/2,
--   and conveniently cosine_ops distance = 1 - dot_product.

-- ── Enable pgvector extension ─────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS vector;

-- ── Add embedding column ──────────────────────────────────────────────────────
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS embedding vector(384);

-- ── IVFFlat index for approximate nearest-neighbour search ───────────────────
-- IVFFlat divides the vector space into `lists` partitions (Voronoi cells).
-- At query time, only the `probes` nearest partitions are searched — trading
-- recall for speed. lists ≈ sqrt(N) is the standard rule of thumb.
--
-- For a catalogue of ~100–500 courses, 50 lists with probes=5 at query time
-- gives >95% recall at very low latency.
-- For larger catalogues (1000+) increase lists to 100–200.
--
-- Index requires at least 3× lists rows to build — only materialises after
-- running embed_courses.py.
CREATE INDEX IF NOT EXISTS courses_embedding_ivfflat_idx
  ON courses
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 50);

-- ── get_embedding_similarity ──────────────────────────────────────────────────
-- Scores each candidate course by cosine similarity to the user's interest
-- centroid (average of enrolled course embeddings).
-- Used by getRecommendations.ts to populate content_similarity_boost.
--
-- Args:
--   enrolled_ids  — UUIDs of courses the user has enrolled in / positively interacted with
--   candidate_ids — UUIDs of the candidate courses to score
--
-- Returns: (course_id, similarity float in [0, 1])
CREATE OR REPLACE FUNCTION get_embedding_similarity(
  enrolled_ids uuid[],
  candidate_ids uuid[]
)
RETURNS TABLE (course_id uuid, similarity float)
LANGUAGE sql
STABLE
AS $$
  WITH user_centroid AS (
    -- Average (centroid) of enrolled course embeddings.
    -- avg() on vectors computes component-wise mean.
    SELECT avg(embedding)::vector(384) AS vec
    FROM courses
    WHERE id = ANY(enrolled_ids)
      AND embedding IS NOT NULL
  )
  SELECT
    c.id                              AS course_id,
    -- Cosine distance is 1 - similarity; flip sign for a similarity score.
    -- Clamp to [0, 1] to handle floating-point edge cases.
    GREATEST(0.0, LEAST(1.0,
      1.0 - (c.embedding <=> uc.vec)
    ))::float                        AS similarity
  FROM courses c
  CROSS JOIN user_centroid uc
  WHERE c.id = ANY(candidate_ids)
    AND c.embedding IS NOT NULL
    AND uc.vec IS NOT NULL
$$;

-- ── get_embedding_candidates ──────────────────────────────────────────────────
-- ANN retrieval: returns the top-K published courses most semantically similar
-- to the user's interest profile (centroid of enrolled course embeddings).
-- Used by getRecommendations.ts to generate an additional embedding-based
-- candidate bucket alongside the rule-based top-rated and category pools.
--
-- Args:
--   enrolled_ids    — UUIDs of courses the user has enrolled in
--   excluded_ids    — UUIDs to exclude (already-completed courses)
--   candidate_count — how many candidates to return (default 20)
--
-- Returns: (course_id, similarity float in [0, 1]) ordered by similarity desc
CREATE OR REPLACE FUNCTION get_embedding_candidates(
  enrolled_ids   uuid[],
  excluded_ids   uuid[],
  candidate_count int DEFAULT 20
)
RETURNS TABLE (course_id uuid, similarity float)
LANGUAGE sql
STABLE
AS $$
  WITH user_centroid AS (
    SELECT avg(embedding)::vector(384) AS vec
    FROM courses
    WHERE id = ANY(enrolled_ids)
      AND embedding IS NOT NULL
  )
  SELECT
    c.id                              AS course_id,
    GREATEST(0.0, LEAST(1.0,
      1.0 - (c.embedding <=> uc.vec)
    ))::float                        AS similarity
  FROM courses c
  CROSS JOIN user_centroid uc
  WHERE c.is_published = true
    AND NOT (c.id = ANY(excluded_ids))
    AND c.embedding IS NOT NULL
    AND uc.vec IS NOT NULL
  ORDER BY c.embedding <=> uc.vec    -- ascending cosine distance = descending similarity
  LIMIT candidate_count
$$;

-- ── Helper: check embedding coverage ─────────────────────────────────────────
-- Run this to verify how many courses have been embedded before enabling the feature:
--   SELECT * FROM embedding_coverage();
CREATE OR REPLACE FUNCTION embedding_coverage()
RETURNS TABLE (
  total_published  bigint,
  embedded         bigint,
  missing          bigint,
  coverage_pct     numeric
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    COUNT(*)                                                         AS total_published,
    COUNT(*) FILTER (WHERE embedding IS NOT NULL)                   AS embedded,
    COUNT(*) FILTER (WHERE embedding IS NULL)                       AS missing,
    ROUND(
      100.0 * COUNT(*) FILTER (WHERE embedding IS NOT NULL) / NULLIF(COUNT(*), 0),
      1
    )                                                               AS coverage_pct
  FROM courses
  WHERE is_published = true
$$;
