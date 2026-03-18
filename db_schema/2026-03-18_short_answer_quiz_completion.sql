-- Ensure short-answer quizzes are treated as completed after any submission.
-- Date: 2026-03-18
-- Change summary:
-- 1) get_section_completion: count quiz as complete if passed OR exhausted attempts OR has short-answer and has any attempt
-- 2) calculate_course_progress: same quiz completion semantics for enrollment progress
-- 3) get_user_passed_quizzes_by_course: same semantics for enrollment detail APIs

CREATE OR REPLACE FUNCTION "public"."get_section_completion"("p_user_id" "uuid", "p_section_id" "uuid")
RETURNS TABLE("completed_videos" bigint, "passed_quizzes" bigint, "completed_pdfs" bigint)
LANGUAGE "plpgsql"
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT vp.video_id) FILTER (WHERE vp.is_completed = true) AS completed_videos,
    COUNT(DISTINCT qa.quiz_id) FILTER (
      WHERE qa.quiz_id IS NOT NULL
        AND (
          qa.is_passed = true
          OR (
            cq.max_attempts IS NOT NULL
            AND qa.attempt_number >= cq.max_attempts
          )
          OR EXISTS (
            SELECT 1
            FROM quiz_questions qq
            WHERE qq.quiz_id = cq.id
              AND qq.question_type IN ('short-answer', 'text')
          )
        )
    ) AS passed_quizzes,
    COUNT(DISTINCT rp.resource_id) FILTER (WHERE rp.is_completed = true) AS completed_pdfs
  FROM course_sections cs
  LEFT JOIN course_videos cv ON cv.section_id = cs.id
  LEFT JOIN user_video_progress vp ON vp.video_id = cv.id AND vp.user_id = p_user_id
  LEFT JOIN course_quizzes cq ON cq.section_id = cs.id
  LEFT JOIN LATERAL (
    SELECT DISTINCT ON (quiz_id)
      quiz_id,
      is_passed,
      attempt_number
    FROM quiz_attempts
    WHERE user_id = p_user_id
      AND quiz_id = cq.id
    ORDER BY quiz_id, attempt_number DESC
  ) qa ON qa.quiz_id = cq.id
  LEFT JOIN course_resources cr ON cr.section_id = cs.id AND cr.resource_type IN ('pdf', 'document', 'ppt')
  LEFT JOIN resource_progress rp ON rp.resource_id = cr.id AND rp.user_id = p_user_id
  WHERE cs.id = p_section_id
  GROUP BY cs.id;
END;
$$;

COMMENT ON FUNCTION "public"."get_section_completion"("p_user_id" "uuid", "p_section_id" "uuid")
IS 'Returns count of completed videos, completed quizzes (passed, exhausted attempts, or submitted short-answer), and completed resources for a user in a given section';


CREATE OR REPLACE FUNCTION "public"."calculate_course_progress"("p_user_id" "uuid", "p_course_id" "uuid")
RETURNS numeric
LANGUAGE "plpgsql" SECURITY DEFINER
AS $$
DECLARE
  v_total_items INTEGER;
  v_completed_items INTEGER;
  v_progress NUMERIC;
BEGIN
  SELECT
    (SELECT COUNT(*) FROM course_videos WHERE course_id = p_course_id) +
    (SELECT COUNT(*) FROM course_quizzes WHERE course_id = p_course_id) +
    (SELECT COUNT(*) FROM course_resources WHERE course_id = p_course_id AND resource_type = 'pdf')
  INTO v_total_items;

  IF v_total_items = 0 THEN
    RETURN 0;
  END IF;

  SELECT
    COALESCE(
      (SELECT COUNT(DISTINCT uvp.video_id)
       FROM user_video_progress uvp
       INNER JOIN course_videos cv ON cv.id = uvp.video_id
       WHERE uvp.user_id = p_user_id
         AND cv.course_id = p_course_id
         AND uvp.is_completed = true), 0
    ) +
    COALESCE(
      (
        SELECT COUNT(*)
        FROM (
          SELECT
            cq.id AS quiz_id,
            BOOL_OR(COALESCE(qa.is_passed, false)) AS has_passed,
            MAX(qa.attempt_number) AS latest_attempt,
            MAX(cq.max_attempts) AS max_attempts,
            EXISTS (
              SELECT 1
              FROM quiz_questions qq
              WHERE qq.quiz_id = cq.id
                AND qq.question_type IN ('short-answer', 'text')
            ) AS has_short_answer
          FROM course_quizzes cq
          LEFT JOIN quiz_attempts qa
            ON qa.quiz_id = cq.id
           AND qa.user_id = p_user_id
          WHERE cq.course_id = p_course_id
          GROUP BY cq.id
        ) q
        WHERE q.latest_attempt IS NOT NULL
          AND (
            q.has_short_answer
            OR q.has_passed
            OR (
              q.max_attempts IS NOT NULL
              AND q.latest_attempt >= q.max_attempts
            )
          )
      ),
      0
    ) +
    COALESCE(
      (SELECT COUNT(DISTINCT rp.resource_id)
       FROM resource_progress rp
       INNER JOIN course_resources cr ON cr.id = rp.resource_id
       WHERE rp.user_id = p_user_id
         AND cr.course_id = p_course_id
         AND cr.resource_type = 'pdf'
         AND rp.is_completed = true), 0
    )
  INTO v_completed_items;

  v_progress := (v_completed_items::NUMERIC / v_total_items::NUMERIC) * 100;
  RETURN ROUND(v_progress, 2);
END;
$$;


CREATE OR REPLACE FUNCTION "public"."get_user_passed_quizzes_by_course"("p_user_id" "uuid", "course_ids" "uuid"[])
RETURNS TABLE("course_id" "uuid", "count" bigint)
LANGUAGE "plpgsql" SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cq.course_id,
    COUNT(DISTINCT cq.id)::BIGINT AS count
  FROM course_quizzes cq
  LEFT JOIN LATERAL (
    SELECT
      qa.quiz_id,
      qa.is_passed,
      qa.attempt_number
    FROM quiz_attempts qa
    WHERE qa.user_id = p_user_id
      AND qa.quiz_id = cq.id
    ORDER BY qa.attempt_number DESC
    LIMIT 1
  ) latest_attempt ON TRUE
  WHERE cq.course_id = ANY(course_ids)
    AND latest_attempt.quiz_id IS NOT NULL
    AND (
      latest_attempt.is_passed = true
      OR (
        cq.max_attempts IS NOT NULL
        AND latest_attempt.attempt_number >= cq.max_attempts
      )
      OR EXISTS (
        SELECT 1
        FROM quiz_questions qq
        WHERE qq.quiz_id = cq.id
          AND qq.question_type IN ('short-answer', 'text')
      )
    )
  GROUP BY cq.course_id;
END;
$$;
