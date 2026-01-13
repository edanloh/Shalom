-- ============================================================================
-- STANDARDIZED COURSE COMPLETION SYSTEM
-- Purpose: Fix module/section completion logic to include ALL content types
-- ============================================================================

-- Step 0: Drop existing functions to prepare for updates
-- ============================================================================
DROP FUNCTION IF EXISTS public.get_section_totals(uuid);
DROP FUNCTION IF EXISTS public.get_section_completion(uuid, uuid);
DROP FUNCTION IF EXISTS public.is_section_completed(uuid, uuid);
DROP FUNCTION IF EXISTS public.calculate_course_progress(uuid, uuid);

-- Step 1: Update get_section_totals to include PDFs
-- ============================================================================
CREATE OR REPLACE FUNCTION "public"."get_section_totals"("p_section_id" "uuid") 
RETURNS TABLE("total_videos" bigint, "total_quizzes" bigint, "total_pdfs" bigint)
LANGUAGE "plpgsql"
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(cv.id) FILTER (WHERE cv.id IS NOT NULL) AS total_videos,
    COUNT(cq.id) FILTER (WHERE cq.id IS NOT NULL) AS total_quizzes,
    COUNT(cr.id) FILTER (WHERE cr.id IS NOT NULL) AS total_pdfs
  FROM course_sections cs
  LEFT JOIN course_videos cv ON cv.section_id = cs.id
  LEFT JOIN course_quizzes cq ON cq.section_id = cs.id
  LEFT JOIN course_resources cr ON cr.section_id = cs.id AND cr.resource_type = 'pdf'
  WHERE cs.id = p_section_id
  GROUP BY cs.id;
END;
$$;

COMMENT ON FUNCTION "public"."get_section_totals"("p_section_id" "uuid") 
IS 'Returns total count of videos, quizzes, and PDFs in a given section';


-- Step 2: Update get_section_completion to include PDFs
-- ============================================================================
CREATE OR REPLACE FUNCTION "public"."get_section_completion"("p_user_id" "uuid", "p_section_id" "uuid") 
RETURNS TABLE("completed_videos" bigint, "passed_quizzes" bigint, "completed_pdfs" bigint)
LANGUAGE "plpgsql"
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT vp.video_id) FILTER (WHERE vp.is_completed = true) AS completed_videos,
    COUNT(DISTINCT qa.quiz_id) FILTER (WHERE qa.is_passed = true) AS passed_quizzes,
    COUNT(DISTINCT rp.resource_id) FILTER (WHERE rp.is_completed = true) AS completed_pdfs
  FROM course_sections cs
  LEFT JOIN course_videos cv ON cv.section_id = cs.id
  LEFT JOIN video_progress vp ON vp.video_id = cv.id AND vp.user_id = p_user_id
  LEFT JOIN course_quizzes cq ON cq.section_id = cs.id
  LEFT JOIN LATERAL (
    SELECT DISTINCT ON (quiz_id) 
      quiz_id, 
      is_passed
    FROM quiz_attempts
    WHERE user_id = p_user_id 
      AND quiz_id = cq.id
    ORDER BY quiz_id, attempt_number DESC
  ) qa ON qa.quiz_id = cq.id
  LEFT JOIN course_resources cr ON cr.section_id = cs.id AND cr.resource_type = 'pdf'
  LEFT JOIN resource_progress rp ON rp.resource_id = cr.id AND rp.user_id = p_user_id
  WHERE cs.id = p_section_id
  GROUP BY cs.id;
END;
$$;

COMMENT ON FUNCTION "public"."get_section_completion"("p_user_id" "uuid", "p_section_id" "uuid") 
IS 'Returns count of completed videos, passed quizzes, and completed PDFs for a user in a given section';


-- Step 3: Create helper function to check if a section is completed
-- ============================================================================
CREATE OR REPLACE FUNCTION "public"."is_section_completed"(
  "p_user_id" "uuid", 
  "p_section_id" "uuid"
) 
RETURNS boolean
LANGUAGE "plpgsql"
AS $$
DECLARE
  v_total_videos bigint;
  v_total_quizzes bigint;
  v_total_pdfs bigint;
  v_completed_videos bigint;
  v_passed_quizzes bigint;
  v_completed_pdfs bigint;
  v_has_content boolean;
  v_videos_complete boolean;
  v_quizzes_complete boolean;
  v_pdfs_complete boolean;
BEGIN
  -- Get totals
  SELECT total_videos, total_quizzes, total_pdfs
  INTO v_total_videos, v_total_quizzes, v_total_pdfs
  FROM get_section_totals(p_section_id);

  -- Get completed counts
  SELECT completed_videos, passed_quizzes, completed_pdfs
  INTO v_completed_videos, v_passed_quizzes, v_completed_pdfs
  FROM get_section_completion(p_user_id, p_section_id);

  -- Check if section has any content
  v_has_content := (v_total_videos > 0 OR v_total_quizzes > 0 OR v_total_pdfs > 0);

  -- Check completion for each type
  v_videos_complete := (v_total_videos = 0 OR v_completed_videos = v_total_videos);
  v_quizzes_complete := (v_total_quizzes = 0 OR v_passed_quizzes = v_total_quizzes);
  v_pdfs_complete := (v_total_pdfs = 0 OR v_completed_pdfs = v_total_pdfs);

  -- Section is complete if it has content AND all types are complete
  RETURN v_has_content AND v_videos_complete AND v_quizzes_complete AND v_pdfs_complete;
END;
$$;

COMMENT ON FUNCTION "public"."is_section_completed"("p_user_id" "uuid", "p_section_id" "uuid") 
IS 'Returns true if all videos, quizzes, and PDFs in a section are completed by the user';


-- Step 4: Create function to calculate course progress percentage
-- ============================================================================
CREATE OR REPLACE FUNCTION "public"."calculate_course_progress"(
  "p_user_id" "uuid", 
  "p_course_id" "uuid"
) 
RETURNS TABLE(
  "progress_percentage" numeric,
  "is_completed" boolean,
  "completed_items" integer,
  "total_items" integer,
  "completed_videos" integer,
  "total_videos" integer,
  "passed_quizzes" integer,
  "total_quizzes" integer,
  "completed_pdfs" integer,
  "total_pdfs" integer
)
LANGUAGE "plpgsql"
AS $$
DECLARE
  v_total_videos integer := 0;
  v_total_quizzes integer := 0;
  v_total_pdfs integer := 0;
  v_completed_videos integer := 0;
  v_passed_quizzes integer := 0;
  v_completed_pdfs integer := 0;
  v_total_items integer;
  v_completed_items integer;
  v_progress_pct numeric;
  v_is_completed boolean;
BEGIN
  -- Get all videos for this course
  SELECT COUNT(*) INTO v_total_videos
  FROM course_videos
  WHERE course_id = p_course_id;

  -- Get all quizzes for this course
  SELECT COUNT(*) INTO v_total_quizzes
  FROM course_quizzes
  WHERE course_id = p_course_id;

  -- Get all PDFs for this course
  SELECT COUNT(*) INTO v_total_pdfs
  FROM course_resources
  WHERE course_id = p_course_id AND resource_type = 'pdf';

  -- Get completed videos
  SELECT COUNT(DISTINCT vp.video_id) INTO v_completed_videos
  FROM video_progress vp
  INNER JOIN course_videos cv ON cv.id = vp.video_id
  WHERE vp.user_id = p_user_id 
    AND vp.is_completed = true
    AND cv.course_id = p_course_id;

  -- Get passed quizzes (only count latest attempt per quiz)
  SELECT COUNT(DISTINCT qa.quiz_id) INTO v_passed_quizzes
  FROM (
    SELECT DISTINCT ON (quiz_id) quiz_id, is_passed
    FROM quiz_attempts
    WHERE user_id = p_user_id
    ORDER BY quiz_id, attempt_number DESC
  ) qa
  INNER JOIN course_quizzes cq ON cq.id = qa.quiz_id
  WHERE qa.is_passed = true AND cq.course_id = p_course_id;

  -- Get completed PDFs
  SELECT COUNT(DISTINCT rp.resource_id) INTO v_completed_pdfs
  FROM resource_progress rp
  INNER JOIN course_resources cr ON cr.id = rp.resource_id
  WHERE rp.user_id = p_user_id 
    AND rp.is_completed = true
    AND cr.course_id = p_course_id
    AND cr.resource_type = 'pdf';

  -- Calculate totals
  v_total_items := v_total_videos + v_total_quizzes + v_total_pdfs;
  v_completed_items := v_completed_videos + v_passed_quizzes + v_completed_pdfs;

  -- Calculate percentage
  IF v_total_items > 0 THEN
    v_progress_pct := ROUND((v_completed_items::numeric / v_total_items::numeric) * 100, 2);
  ELSE
    v_progress_pct := 0;
  END IF;

  -- Check if completed
  v_is_completed := (v_total_items > 0 AND v_completed_items >= v_total_items);

  -- Return results
  RETURN QUERY SELECT 
    v_progress_pct,
    v_is_completed,
    v_completed_items,
    v_total_items,
    v_completed_videos,
    v_total_videos,
    v_passed_quizzes,
    v_total_quizzes,
    v_completed_pdfs,
    v_total_pdfs;
END;
$$;

COMMENT ON FUNCTION "public"."calculate_course_progress"("p_user_id" "uuid", "p_course_id" "uuid") 
IS 'Calculates comprehensive course progress including videos, quizzes, and PDFs';


-- Step 5: Grant permissions
-- ============================================================================
GRANT ALL ON FUNCTION "public"."is_section_completed"("p_user_id" "uuid", "p_section_id" "uuid") 
  TO "anon", "authenticated", "service_role";

GRANT ALL ON FUNCTION "public"."calculate_course_progress"("p_user_id" "uuid", "p_course_id" "uuid") 
  TO "anon", "authenticated", "service_role";