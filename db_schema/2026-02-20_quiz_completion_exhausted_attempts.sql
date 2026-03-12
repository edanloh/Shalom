-- Update get_section_completion function to mark quizzes as complete when attempts are exhausted
-- Date: 2026-02-20
-- Change: Count quizzes as complete if EITHER passed OR exhausted all attempts

CREATE OR REPLACE FUNCTION "public"."get_section_completion"("p_user_id" "uuid", "p_section_id" "uuid") 
RETURNS TABLE("completed_videos" bigint, "passed_quizzes" bigint, "completed_pdfs" bigint)
LANGUAGE "plpgsql"
AS $$BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT vp.video_id) FILTER (WHERE vp.is_completed = true) AS completed_videos,
    COUNT(DISTINCT qa.quiz_id) FILTER (
      WHERE qa.is_passed = true 
         OR qa.attempt_number >= cq.max_attempts
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
END;$$;

COMMENT ON FUNCTION "public"."get_section_completion"("p_user_id" "uuid", "p_section_id" "uuid") 
IS 'Returns count of completed videos, passed quizzes (or exhausted attempts), and completed resources for a user in a given section';
