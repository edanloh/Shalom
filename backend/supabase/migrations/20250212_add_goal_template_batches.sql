CREATE TABLE IF NOT EXISTS goal_template_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template_ids UUID[] NOT NULL,
  is_consumed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_goal_template_batches_user_active
  ON goal_template_batches(user_id, is_consumed, created_at DESC);
