CREATE TABLE IF NOT EXISTS goal_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  label TEXT NOT NULL UNIQUE,
  description TEXT,
  difficulty VARCHAR(20) DEFAULT 'easy' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  target_hours INTEGER DEFAULT 0,
  target_courses INTEGER DEFAULT 0,
  target_points INTEGER DEFAULT 0,
  target_lessons INTEGER DEFAULT 0,
  target_quizzes INTEGER DEFAULT 0,
  duration_days INTEGER DEFAULT 7,
  reward_points INTEGER DEFAULT 50,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE IF EXISTS learning_goals
  ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES goal_templates(id) ON DELETE SET NULL;

INSERT INTO goal_templates (
  label,
  description,
  difficulty,
  target_hours,
  target_courses,
  target_points,
  target_lessons,
  target_quizzes,
  duration_days,
  reward_points
) VALUES
  ('Complete 5 lessons', 'Finish five lessons this week.', 'easy', 0, 0, 0, 5, 0, 7, 50),
  ('Watch 120 minutes', 'Watch 2 hours of lessons.', 'medium', 2, 0, 0, 0, 0, 7, 80),
  ('Pass 3 quizzes', 'Pass three quizzes.', 'medium', 0, 0, 0, 0, 3, 7, 90),
  ('Complete 1 course', 'Finish one course.', 'hard', 0, 1, 0, 0, 0, 14, 150),
  ('Earn 200 points', 'Earn 200 learning points.', 'medium', 0, 0, 200, 0, 0, 14, 120)
ON CONFLICT (label) DO NOTHING;
