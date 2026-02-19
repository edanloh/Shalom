-- Migration: Add quiz enhancements (expanded question types and question images)
-- Date: 2026-02-18
-- Description: 
--   1. Expand quiz_questions question_type constraint to support all types
--   2. Add image_url column to quiz_questions for question images

BEGIN;

-- 1. Drop old constraint on question_type
ALTER TABLE quiz_questions 
DROP CONSTRAINT IF EXISTS quiz_questions_question_type_check;

-- 2. Add new constraint with expanded question types
ALTER TABLE quiz_questions 
ADD CONSTRAINT quiz_questions_question_type_check 
CHECK (question_type IN (
  'multiple-choice',      -- Single correct answer
  'multiple-correct',     -- Multiple correct answers
  'true-false',          -- True/False questions
  'short-answer',        -- Text-based short answer
  'matching',            -- Matching pairs
  'text'                 -- Legacy text type (alias for short-answer)
));

COMMENT ON CONSTRAINT quiz_questions_question_type_check ON quiz_questions IS 'Allowed question types: multiple-choice (single answer), multiple-correct, true-false, short-answer, matching, text';

COMMIT;

-- Rollback script (if needed):
-- BEGIN;
-- ALTER TABLE quiz_questions DROP COLUMN IF EXISTS image_url;
-- ALTER TABLE quiz_questions DROP CONSTRAINT IF EXISTS quiz_questions_question_type_check;
-- ALTER TABLE quiz_questions ADD CONSTRAINT quiz_questions_question_type_check CHECK (question_type IN ('multiple-choice', 'true-false', 'text'));
-- COMMIT;
