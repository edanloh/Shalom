-- ============================================
-- FIXED: Create Course Statistics View with REAL Rating Calculations
-- This actually counts from course_ratings table instead of using courses.total_ratings
-- ============================================

-- Drop existing view
DROP VIEW IF EXISTS courses_with_stats CASCADE;

-- Create view with REAL statistics calculated from related tables
CREATE OR REPLACE VIEW courses_with_stats AS
SELECT 
  c.id,
  c.title,
  c.description,
  c.instructor_name,
  c.category_id,
  c.duration_hours,
  c.thumbnail_url,
  c.is_published,
  c.is_featured,
  c.language,
  c.tags,
  c.created_at,
  c.updated_at,
  
  -- Student count from enrollments
  COUNT(DISTINCT ce.id) as student_count,
  
  -- Rating calculations from course_ratings table (ACTUAL DATA!)
  COALESCE(ROUND(AVG(cr.rating)::numeric, 2), 0.00) as rating,
  COUNT(DISTINCT cr.id) as total_ratings,
  
  -- Category info
  cat.name as category_name,
  cat.color as category_color,
  
  -- Content statistics
  COUNT(DISTINCT cs.id) as total_sections,
  COUNT(DISTINCT cv.id) as total_videos,
  COUNT(DISTINCT cq.id) as total_quizzes,
  COUNT(DISTINCT cres.id) as total_resources
  
FROM courses c
LEFT JOIN categories cat ON c.category_id = cat.id
LEFT JOIN course_sections cs ON cs.course_id = c.id
LEFT JOIN course_videos cv ON cv.course_id = c.id
LEFT JOIN course_quizzes cq ON cq.course_id = c.id
LEFT JOIN course_resources cres ON cres.course_id = c.id
LEFT JOIN course_enrollments ce ON ce.course_id = c.id
LEFT JOIN course_ratings cr ON cr.course_id = c.id  -- ← This was missing!

GROUP BY 
  c.id, c.title, c.description, c.instructor_name, c.category_id,
  c.duration_hours, c.thumbnail_url, c.is_published,
  c.is_featured, c.language, c.tags, c.created_at, c.updated_at,
  cat.name, cat.color;

-- Set owner
ALTER VIEW courses_with_stats OWNER TO postgres;

-- ============================================
-- Test the view with actual data
-- ============================================

-- Check all courses with their real statistics
SELECT 
  id,
  title,
  student_count,
  rating,
  total_ratings,
  total_sections,
  total_videos,
  total_quizzes,
  category_name
FROM courses_with_stats
ORDER BY updated_at DESC;

-- Check a specific course in detail
SELECT 
  id,
  title,
  student_count as "Students Enrolled",
  rating as "Average Rating",
  total_ratings as "Number of Ratings",
  total_sections as "Modules",
  total_videos as "Lessons",
  total_quizzes as "Quizzes",
  total_resources as "Resources"
FROM courses_with_stats
WHERE id = '550e8400-e29b-41d4-a716-446655440401'
LIMIT 1;
