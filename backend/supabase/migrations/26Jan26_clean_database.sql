/*
CHANGES: 26 Jan 2026
remove course_requirements, discussion_replies, course_discussions, user_lesson_progress table
modify course_resources: remove thumbnail_url field
rename video_progress table to user_video_progress
*/

-- 1. DROP TABLES
-- =====================================================
-- Drop course_requirements table
DROP TABLE IF EXISTS public.course_requirements CASCADE;

-- Drop discussion_replies table (drop first due to foreign key)
DROP TABLE IF EXISTS public.discussion_replies CASCADE;

-- Drop course_discussions table
DROP TABLE IF EXISTS public.course_discussions CASCADE;

-- Drop user_lesson_progress table
DROP TABLE IF EXISTS public.user_lesson_progress CASCADE;

-- Drop learning_path_courses table (drop first due to foreign key)
DROP TABLE IF EXISTS public.learning_path_courses CASCADE;

-- Drop learning_paths table
DROP TABLE IF EXISTS public.learning_paths CASCADE;

-- Drop user_learning_path_progress table
DROP TABLE IF EXISTS public.user_learning_path_progress CASCADE;

-- 2. MODIFY course_resources TABLE
-- =====================================================

-- Remove thumbnail_url field
ALTER TABLE public.course_resources 
DROP COLUMN IF EXISTS thumbnail_url;


-- 3. MODIFY certificates TABLE
-- =====================================================

-- Remove learning_path_id field from certificates
ALTER TABLE public.certificates
DROP COLUMN IF EXISTS learning_path_id;


-- 4. RENAME video_progress TABLE
-- =====================================================

-- Rename the table
ALTER TABLE public.video_progress 
RENAME TO user_video_progress;

-- Rename associated constraints and indexes
ALTER INDEX IF EXISTS video_progress_pkey 
RENAME TO user_video_progress_pkey;

ALTER INDEX IF EXISTS video_progress_user_id_video_id_key 
RENAME TO user_video_progress_user_id_video_id_key;

ALTER INDEX IF EXISTS idx_video_progress_user 
RENAME TO idx_user_video_progress_user;

-- Rename the trigger
DROP TRIGGER IF EXISTS update_video_progress_updated_at ON public.user_video_progress;
CREATE TRIGGER update_user_video_progress_updated_at 
BEFORE UPDATE ON public.user_video_progress 
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- 5. UPDATE FOREIGN KEY REFERENCES
-- =====================================================

-- Update course_enrollments foreign key reference
ALTER TABLE public.course_enrollments 
DROP CONSTRAINT IF EXISTS course_enrollments_current_video_id_fkey;

-- Note: The current_video_id references course_videos, not video_progress,
-- so no FK update needed for the table rename

-- 6. VERIFY CHANGES
-- =====================================================
-- Check user_video_progress table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'user_video_progress'
) as user_video_progress_exists;

-- Check dropped tables no longer exist
SELECT 
  NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'course_requirements') as course_requirements_dropped,
  NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'discussion_replies') as discussion_replies_dropped,
  NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'course_discussions') as course_discussions_dropped,
  NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_lesson_progress') as user_lesson_progress_dropped;


