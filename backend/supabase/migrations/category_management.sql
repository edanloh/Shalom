-- Drop the description column
ALTER TABLE categories DROP COLUMN IF EXISTS description;

-- SQL Functions for Category Management

-- Function to update course counts for all categories
CREATE OR REPLACE FUNCTION update_category_counts()
RETURNS void AS $$
BEGIN
  UPDATE categories
  SET course_count = (
    SELECT COUNT(*)
    FROM courses
    WHERE courses.category_id = categories.id
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get courses affected by category deletion
CREATE OR REPLACE FUNCTION get_courses_by_category(category_uuid UUID)
RETURNS TABLE (
  id UUID,
  title VARCHAR(500)
) AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.title
  FROM courses c
  WHERE c.category_id = category_uuid;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update category counts when courses change
CREATE OR REPLACE FUNCTION update_category_count_on_course_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Update old category count if category changed
  IF TG_OP = 'UPDATE' AND OLD.category_id IS DISTINCT FROM NEW.category_id THEN
    UPDATE categories
    SET course_count = (
      SELECT COUNT(*)
      FROM courses
      WHERE category_id = OLD.category_id
    )
    WHERE id = OLD.category_id;
  END IF;

  -- Update new category count
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE categories
    SET course_count = (
      SELECT COUNT(*)
      FROM courses
      WHERE category_id = NEW.category_id
    )
    WHERE id = NEW.category_id;
  END IF;

  -- Update old category count on delete
  IF TG_OP = 'DELETE' THEN
    UPDATE categories
    SET course_count = (
      SELECT COUNT(*)
      FROM courses
      WHERE category_id = OLD.category_id
    )
    WHERE id = OLD.category_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_category_count ON courses;

-- Create trigger
CREATE TRIGGER trigger_update_category_count
AFTER INSERT OR UPDATE OR DELETE ON courses
FOR EACH ROW
EXECUTE FUNCTION update_category_count_on_course_change();

-- Initialize counts for existing categories
SELECT update_category_counts();

-- Fix existing courses with no category
UPDATE courses 
SET category_id = (SELECT id FROM categories WHERE name = 'General' LIMIT 1)
WHERE category_id IS NULL;