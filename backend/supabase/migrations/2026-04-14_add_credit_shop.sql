-- Credit Shop: profile titles users can unlock by spending credits

CREATE TABLE IF NOT EXISTS shop_items (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  description TEXT,
  type        TEXT        NOT NULL DEFAULT 'title',  -- 'title' for now
  cost        INTEGER     NOT NULL DEFAULT 0,
  icon        TEXT,       -- emoji displayed on the card
  color       TEXT,       -- hex accent color for the badge
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_unlocked_items (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id     UUID        NOT NULL REFERENCES shop_items(id) ON DELETE CASCADE,
  is_equipped BOOLEAN     NOT NULL DEFAULT FALSE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, item_id)
);

CREATE INDEX IF NOT EXISTS user_unlocked_items_user_idx ON user_unlocked_items(user_id);

-- Seed profile titles (sorted by cost ascending)
INSERT INTO shop_items (name, description, type, cost, icon, color, sort_order) VALUES
  ('Newcomer',         'Just getting started on your learning journey.',       'title',  0,    '🌱', '#49AC33', 0),
  ('Scholar',          'Proven dedication to continuous learning.',             'title',  150,  '📚', '#564BEB', 1),
  ('Dedicated Learner','Consistency is your superpower.',                       'title',  300,  '🔥', '#FF7043', 2),
  ('Quiz Champion',    'No question left unanswered.',                          'title',  500,  '🏆', '#FFD700', 3),
  ('Course Conqueror', 'Courses bow before you.',                               'title',  750,  '⚔️', '#E91E63', 4),
  ('Knowledge Seeker', 'The pursuit of wisdom never ends.',                     'title',  1000, '🔭', '#00BCD4', 5),
  ('Elite Learner',    'Top tier. The rarest title on the platform.',           'title',  2500, '💎', '#9C27B0', 6)
ON CONFLICT DO NOTHING;
