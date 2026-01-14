-- Add estimated_read_minutes for PDF resources
ALTER TABLE course_resources
ADD COLUMN IF NOT EXISTS estimated_read_minutes INTEGER DEFAULT 0;

COMMENT ON COLUMN course_resources.estimated_read_minutes IS 'Estimated reading time in minutes for PDF resources';
