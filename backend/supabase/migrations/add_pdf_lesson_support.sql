-- Migration: Add support for PDF lessons in course_resources table
-- Date: 2026-01-09
-- Purpose: Enable PDF resources to be used as lessons alongside videos

-- Add section_id to course_resources if it doesn't exist
ALTER TABLE course_resources 
ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES course_sections(id) ON DELETE CASCADE;

-- Add foreign key constraint for section_id if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'course_resources_section_id_fkey' 
        AND table_name = 'course_resources'
    ) THEN
        ALTER TABLE course_resources 
        ADD CONSTRAINT course_resources_section_id_fkey 
        FOREIGN KEY (section_id) REFERENCES course_sections(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add thumbnail_url for preview
ALTER TABLE course_resources 
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Add is_preview flag (similar to course_videos)
ALTER TABLE course_resources 
ADD COLUMN IF NOT EXISTS is_preview BOOLEAN DEFAULT false;

-- Update resource_type to use enum-like constraint if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage 
        WHERE table_name = 'course_resources' 
        AND constraint_name = 'course_resources_resource_type_check'
    ) THEN
        ALTER TABLE course_resources 
        ADD CONSTRAINT course_resources_resource_type_check 
        CHECK (resource_type IN ('pdf', 'document', 'slides', 'worksheet', 'ebook', 'other'));
    END IF;
END $$;

-- Create index on section_id for better query performance
CREATE INDEX IF NOT EXISTS idx_course_resources_section_id ON course_resources(section_id);

-- Create index on course_id and section_id for filtering
CREATE INDEX IF NOT EXISTS idx_course_resources_course_section ON course_resources(course_id, section_id);

-- Add updated_at column for tracking modifications
ALTER TABLE course_resources 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Create trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_course_resources_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS course_resources_updated_at_trigger ON course_resources;
CREATE TRIGGER course_resources_updated_at_trigger
    BEFORE UPDATE ON course_resources
    FOR EACH ROW
    EXECUTE FUNCTION update_course_resources_updated_at();

-- Comments for documentation
COMMENT ON COLUMN course_resources.section_id IS 'Links PDF resource to a specific course section, making it a lesson';
COMMENT ON COLUMN course_resources.resource_type IS 'Type of resource: pdf, document, slides, worksheet, ebook, other';
COMMENT ON COLUMN course_resources.is_preview IS 'Whether this resource is available as a preview before enrollment';
COMMENT ON COLUMN course_resources.order_index IS 'Order of the resource within the section (0-based)';
COMMENT ON COLUMN course_resources.thumbnail_url IS 'Preview image for the PDF/document';

-- Example insert for PDF lesson
-- INSERT INTO course_resources (
--     course_id, 
--     section_id, 
--     title, 
--     description, 
--     resource_type, 
--     resource_url, 
--     file_size_bytes,
--     thumbnail_url,
--     is_preview,
--     is_downloadable,
--     order_index
-- ) VALUES (
--     '550e8400-e29b-41d4-a716-446655440401',
--     '550e8400-e29b-41d4-a716-446655440501',
--     'Course Introduction Slides',
--     'Introduction to web development concepts and overview',
--     'pdf',
--     'https://example.com/slides/intro.pdf',
--     2048576,
--     'https://example.com/thumbnails/intro-slides.jpg',
--     true,
--     true,
--     0
-- );
