-- Migration: Create functions for section/module completion tracking
-- Purpose: Calculate if all videos and quizzes in a section are completed by a user
-- Date: 2026-01-07

-- Function 1: Get total count of videos and quizzes in a section
CREATE OR REPLACE FUNCTION get_section_totals(p_section_id UUID)
RETURNS TABLE (
  total_videos BIGINT,
  total_quizzes BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(cv.id) FILTER (WHERE cv.id IS NOT NULL) AS total_videos,
    COUNT(cq.id) FILTER (WHERE cq.id IS NOT NULL) AS total_quizzes
  FROM course_sections cs
  LEFT JOIN course_videos cv ON cv.section_id = cs.id
  LEFT JOIN course_quizzes cq ON cq.section_id = cs.id
  WHERE cs.id = p_section_id
  GROUP BY cs.id;
END;
$$ LANGUAGE plpgsql;

-- Function 2: Get count of completed videos and passed quizzes for a user in a section
CREATE OR REPLACE FUNCTION get_section_completion(
  p_user_id UUID,
  p_section_id UUID
)
RETURNS TABLE (
  completed_videos BIGINT,
  passed_quizzes BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT vp.video_id) FILTER (WHERE vp.is_completed = true) AS completed_videos,
    COUNT(DISTINCT qa.quiz_id) FILTER (WHERE qa.is_passed = true) AS passed_quizzes
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
  WHERE cs.id = p_section_id
  GROUP BY cs.id;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_section_totals(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_section_completion(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_section_totals(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_section_completion(UUID, UUID) TO service_role;

-- Add helpful comments
COMMENT ON FUNCTION get_section_totals IS 'Returns total count of videos and quizzes in a given section';
COMMENT ON FUNCTION get_section_completion IS 'Returns count of completed videos and passed quizzes for a user in a given section';
