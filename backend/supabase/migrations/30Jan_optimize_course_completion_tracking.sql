-- =====================================================
-- OPTIMIZED RPC FUNCTIONS FOR USER ENROLLMENT QUERIES
-- =====================================================
-- Fixed version: Drops existing functions before creating

-- Drop existing functions first
DROP FUNCTION IF EXISTS get_video_counts_by_course(UUID[]);
DROP FUNCTION IF EXISTS get_quiz_counts_by_course(UUID[]);
DROP FUNCTION IF EXISTS get_pdf_counts_by_course(UUID[]);
DROP FUNCTION IF EXISTS get_section_counts_by_course(UUID[]);
DROP FUNCTION IF EXISTS get_user_completed_videos_by_course(UUID, UUID[]);
DROP FUNCTION IF EXISTS get_user_passed_quizzes_by_course(UUID, UUID[]);
DROP FUNCTION IF EXISTS get_user_completed_pdfs_by_course(UUID, UUID[]);
DROP FUNCTION IF EXISTS get_user_completed_modules_by_course(UUID, UUID[]);
DROP FUNCTION IF EXISTS calculate_course_progress(UUID, UUID);
DROP FUNCTION IF EXISTS update_enrollment_on_video_progress();
DROP FUNCTION IF EXISTS update_enrollment_on_quiz_attempt();
DROP FUNCTION IF EXISTS update_enrollment_on_pdf_progress();

-- =====================================================
-- CREATE RPC FUNCTIONS
-- =====================================================

-- 1. Get video counts per course (for multiple courses at once)
CREATE OR REPLACE FUNCTION get_video_counts_by_course(course_ids UUID[])
RETURNS TABLE (course_id UUID, count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cv.course_id,
    COUNT(*)::BIGINT as count
  FROM course_videos cv
  WHERE cv.course_id = ANY(course_ids)
  GROUP BY cv.course_id;
END;
$$;

-- 2. Get quiz counts per course
CREATE OR REPLACE FUNCTION get_quiz_counts_by_course(course_ids UUID[])
RETURNS TABLE (course_id UUID, count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cq.course_id,
    COUNT(*)::BIGINT as count
  FROM course_quizzes cq
  WHERE cq.course_id = ANY(course_ids)
  GROUP BY cq.course_id;
END;
$$;

-- 3. Get PDF/resource counts per course
CREATE OR REPLACE FUNCTION get_pdf_counts_by_course(course_ids UUID[])
RETURNS TABLE (course_id UUID, count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cr.course_id,
    COUNT(*)::BIGINT as count
  FROM course_resources cr
  WHERE cr.course_id = ANY(course_ids)
    AND cr.resource_type = 'pdf'
  GROUP BY cr.course_id;
END;
$$;

-- 4. Get section counts per course
CREATE OR REPLACE FUNCTION get_section_counts_by_course(course_ids UUID[])
RETURNS TABLE (course_id UUID, count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cs.course_id,
    COUNT(*)::BIGINT as count
  FROM course_sections cs
  WHERE cs.course_id = ANY(course_ids)
  GROUP BY cs.course_id;
END;
$$;

-- 5. Get user's completed videos count per course
CREATE OR REPLACE FUNCTION get_user_completed_videos_by_course(
  p_user_id UUID,
  course_ids UUID[]
)
RETURNS TABLE (course_id UUID, count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cv.course_id,
    COUNT(DISTINCT uvp.video_id)::BIGINT as count
  FROM course_videos cv
  INNER JOIN user_video_progress uvp 
    ON uvp.video_id = cv.id 
    AND uvp.user_id = p_user_id
    AND uvp.is_completed = true
  WHERE cv.course_id = ANY(course_ids)
  GROUP BY cv.course_id;
END;
$$;

-- 6. Get user's passed quizzes count per course
CREATE OR REPLACE FUNCTION get_user_passed_quizzes_by_course(
  p_user_id UUID,
  course_ids UUID[]
)
RETURNS TABLE (course_id UUID, count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cq.course_id,
    COUNT(DISTINCT qa.quiz_id)::BIGINT as count
  FROM course_quizzes cq
  INNER JOIN quiz_attempts qa 
    ON qa.quiz_id = cq.id 
    AND qa.user_id = p_user_id
    AND qa.is_passed = true
  WHERE cq.course_id = ANY(course_ids)
  GROUP BY cq.course_id;
END;
$$;

-- 7. Get user's completed PDFs count per course
CREATE OR REPLACE FUNCTION get_user_completed_pdfs_by_course(
  p_user_id UUID,
  course_ids UUID[]
)
RETURNS TABLE (course_id UUID, count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cr.course_id,
    COUNT(DISTINCT rp.resource_id)::BIGINT as count
  FROM course_resources cr
  INNER JOIN resource_progress rp 
    ON rp.resource_id = cr.id 
    AND rp.user_id = p_user_id
    AND rp.is_completed = true
  WHERE cr.course_id = ANY(course_ids)
    AND cr.resource_type = 'pdf'
  GROUP BY cr.course_id;
END;
$$;

-- 8. Get user's completed modules/sections count per course
CREATE OR REPLACE FUNCTION get_user_completed_modules_by_course(
  p_user_id UUID,
  course_ids UUID[]
)
RETURNS TABLE (course_id UUID, count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ump.course_id,
    COUNT(DISTINCT ump.section_id)::BIGINT as count
  FROM user_module_progress ump
  WHERE ump.user_id = p_user_id
    AND ump.course_id = ANY(course_ids)
    AND ump.is_completed = true
  GROUP BY ump.course_id;
END;
$$;

-- =====================================================
-- PROGRESS CALCULATION FUNCTION
-- =====================================================

-- Function to recalculate course progress for a user
CREATE OR REPLACE FUNCTION calculate_course_progress(
  p_user_id UUID,
  p_course_id UUID
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_items INTEGER;
  v_completed_items INTEGER;
  v_progress NUMERIC;
BEGIN
  -- Count total items in course (videos + quizzes + PDFs)
  SELECT 
    (SELECT COUNT(*) FROM course_videos WHERE course_id = p_course_id) +
    (SELECT COUNT(*) FROM course_quizzes WHERE course_id = p_course_id) +
    (SELECT COUNT(*) FROM course_resources WHERE course_id = p_course_id AND resource_type = 'pdf')
  INTO v_total_items;

  -- If no items, return 0
  IF v_total_items = 0 THEN
    RETURN 0;
  END IF;

  -- Count completed items
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
      (SELECT COUNT(DISTINCT qa.quiz_id) 
       FROM quiz_attempts qa 
       INNER JOIN course_quizzes cq ON cq.id = qa.quiz_id
       WHERE qa.user_id = p_user_id 
         AND cq.course_id = p_course_id
         AND qa.is_passed = true), 0
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

  -- Calculate progress percentage
  v_progress := (v_completed_items::NUMERIC / v_total_items::NUMERIC) * 100;

  RETURN ROUND(v_progress, 2);
END;
$$;

-- =====================================================
-- TRIGGER FUNCTIONS
-- =====================================================

-- Trigger function to update enrollment progress when video is completed
CREATE OR REPLACE FUNCTION update_enrollment_on_video_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_course_id UUID;
  v_new_progress NUMERIC;
BEGIN
  -- Get course_id from video
  SELECT course_id INTO v_course_id
  FROM course_videos
  WHERE id = NEW.video_id;

  -- Only proceed if we found a course
  IF v_course_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Calculate new progress
  v_new_progress := calculate_course_progress(NEW.user_id, v_course_id);

  -- Update enrollment
  UPDATE course_enrollments
  SET 
    progress_percentage = v_new_progress,
    is_completed = (v_new_progress >= 100),
    completion_date = CASE 
      WHEN v_new_progress >= 100 AND completion_date IS NULL THEN NOW()
      ELSE completion_date
    END,
    updated_at = NOW()
  WHERE user_id = NEW.user_id 
    AND course_id = v_course_id;

  RETURN NEW;
END;
$$;

-- Trigger function to update enrollment progress when quiz is passed
CREATE OR REPLACE FUNCTION update_enrollment_on_quiz_attempt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_course_id UUID;
  v_new_progress NUMERIC;
BEGIN
  -- Get course_id from quiz
  SELECT course_id INTO v_course_id
  FROM course_quizzes
  WHERE id = NEW.quiz_id;

  -- Only proceed if we found a course
  IF v_course_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Calculate new progress
  v_new_progress := calculate_course_progress(NEW.user_id, v_course_id);

  -- Update enrollment
  UPDATE course_enrollments
  SET 
    progress_percentage = v_new_progress,
    is_completed = (v_new_progress >= 100),
    completion_date = CASE 
      WHEN v_new_progress >= 100 AND completion_date IS NULL THEN NOW()
      ELSE completion_date
    END,
    updated_at = NOW()
  WHERE user_id = NEW.user_id 
    AND course_id = v_course_id;

  RETURN NEW;
END;
$$;

-- Trigger function to update enrollment progress when PDF is completed
CREATE OR REPLACE FUNCTION update_enrollment_on_pdf_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_course_id UUID;
  v_new_progress NUMERIC;
BEGIN
  -- Get course_id from resource
  SELECT course_id INTO v_course_id
  FROM course_resources
  WHERE id = NEW.resource_id AND resource_type = 'pdf';

  -- Only proceed if it's a PDF
  IF v_course_id IS NOT NULL THEN
    -- Calculate new progress
    v_new_progress := calculate_course_progress(NEW.user_id, v_course_id);

    -- Update enrollment
    UPDATE course_enrollments
    SET 
      progress_percentage = v_new_progress,
      is_completed = (v_new_progress >= 100),
      completion_date = CASE 
        WHEN v_new_progress >= 100 AND completion_date IS NULL THEN NOW()
        ELSE completion_date
      END,
      updated_at = NOW()
    WHERE user_id = NEW.user_id 
      AND course_id = v_course_id;
  END IF;

  RETURN NEW;
END;
$$;

-- =====================================================
-- CREATE/REPLACE TRIGGERS
-- =====================================================

-- Drop existing triggers first
DROP TRIGGER IF EXISTS trigger_update_enrollment_on_video_progress ON user_video_progress;
DROP TRIGGER IF EXISTS trigger_update_enrollment_on_quiz_attempt ON quiz_attempts;
DROP TRIGGER IF EXISTS trigger_update_enrollment_on_pdf_progress ON resource_progress;

-- Create trigger on user_video_progress
CREATE TRIGGER trigger_update_enrollment_on_video_progress
AFTER INSERT OR UPDATE OF is_completed ON user_video_progress
FOR EACH ROW
WHEN (NEW.is_completed = true)
EXECUTE FUNCTION update_enrollment_on_video_progress();

-- Create trigger on quiz_attempts
CREATE TRIGGER trigger_update_enrollment_on_quiz_attempt
AFTER INSERT OR UPDATE OF is_passed ON quiz_attempts
FOR EACH ROW
WHEN (NEW.is_passed = true)
EXECUTE FUNCTION update_enrollment_on_quiz_attempt();

-- Create trigger on resource_progress
CREATE TRIGGER trigger_update_enrollment_on_pdf_progress
AFTER INSERT OR UPDATE OF is_completed ON resource_progress
FOR EACH ROW
WHEN (NEW.is_completed = true)
EXECUTE FUNCTION update_enrollment_on_pdf_progress();

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_video_counts_by_course TO authenticated;
GRANT EXECUTE ON FUNCTION get_quiz_counts_by_course TO authenticated;
GRANT EXECUTE ON FUNCTION get_pdf_counts_by_course TO authenticated;
GRANT EXECUTE ON FUNCTION get_section_counts_by_course TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_completed_videos_by_course TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_passed_quizzes_by_course TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_completed_pdfs_by_course TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_completed_modules_by_course TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_course_progress TO authenticated;

-- Grant to service role for edge functions
GRANT EXECUTE ON FUNCTION get_video_counts_by_course TO service_role;
GRANT EXECUTE ON FUNCTION get_quiz_counts_by_course TO service_role;
GRANT EXECUTE ON FUNCTION get_pdf_counts_by_course TO service_role;
GRANT EXECUTE ON FUNCTION get_section_counts_by_course TO service_role;
GRANT EXECUTE ON FUNCTION get_user_completed_videos_by_course TO service_role;
GRANT EXECUTE ON FUNCTION get_user_passed_quizzes_by_course TO service_role;
GRANT EXECUTE ON FUNCTION get_user_completed_pdfs_by_course TO service_role;
GRANT EXECUTE ON FUNCTION get_user_completed_modules_by_course TO service_role;
GRANT EXECUTE ON FUNCTION calculate_course_progress TO service_role;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Uncomment to verify installation:
-- SELECT proname, proargnames, proargtypes FROM pg_proc WHERE proname LIKE 'get_%_by_course';
-- SELECT trigger_name, event_object_table FROM information_schema.triggers WHERE trigger_name LIKE '%enrollment%';