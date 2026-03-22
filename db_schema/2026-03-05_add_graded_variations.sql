-- Add graded_answers column to quiz_attempts table for manual grading
-- This stores instructor feedback and points for short-answer questions
-- Also add grades_released flag to control when students can see their grades

ALTER TABLE quiz_attempts 
ADD COLUMN IF NOT EXISTS graded_answers jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS grades_released boolean DEFAULT true;

COMMENT ON COLUMN quiz_attempts.graded_answers IS 'Stores manual grading data for short-answer questions. Format: { questionId: { pointsAwarded: number, maxPoints: number, feedback: string, gradedAt: timestamp } }';

COMMENT ON COLUMN quiz_attempts.grades_released IS 'Controls whether students can see their grades. False = grades hidden until instructor releases them';



-- Add graded_variations column to quiz_questions table
-- This stores instructor grading templates for answer variations
-- When multiple students submit the same answer, grade it once and reuse

ALTER TABLE quiz_questions 
ADD COLUMN IF NOT EXISTS graded_variations jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN quiz_questions.graded_variations IS 'Stores grading templates for answer variations. Format: { normalizedAnswer: { answerText: string, pointsAwarded: number, feedback: string, gradedAt: timestamp, gradedBy: uuid, studentCount: number } }';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_quiz_questions_graded_variations 
ON quiz_questions USING GIN (graded_variations);
