-- Expand the credit shop beyond titles so it feels like a real storefront.
-- Adds light metadata for UI merchandising plus a broader seeded catalog.

ALTER TABLE IF EXISTS shop_items
  ADD COLUMN IF NOT EXISTS rarity TEXT NOT NULL DEFAULT 'common';

ALTER TABLE IF EXISTS shop_items
  ADD COLUMN IF NOT EXISTS collection TEXT;

ALTER TABLE IF EXISTS shop_items
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE IF EXISTS shop_items
  ADD COLUMN IF NOT EXISTS is_limited BOOLEAN NOT NULL DEFAULT FALSE;

-- Set meaningful rarities on the base title catalog
UPDATE shop_items SET rarity = 'common'    WHERE name = 'Newcomer'          AND type = 'title';
UPDATE shop_items SET rarity = 'common'    WHERE name = 'Scholar'            AND type = 'title';
UPDATE shop_items SET rarity = 'common'    WHERE name = 'Dedicated Learner'  AND type = 'title';
UPDATE shop_items SET rarity = 'rare'      WHERE name = 'Quiz Champion'      AND type = 'title';
UPDATE shop_items SET rarity = 'rare'      WHERE name = 'Course Conqueror'   AND type = 'title';
UPDATE shop_items SET rarity = 'epic'      WHERE name = 'Knowledge Seeker'   AND type = 'title';
UPDATE shop_items SET rarity = 'legendary' WHERE name = 'Elite Learner'      AND type = 'title';

-- Mark Quiz Champion as the default featured pick for new installs that only have titles
UPDATE shop_items SET is_featured = TRUE WHERE name = 'Quiz Champion' AND type = 'title';

INSERT INTO shop_items (
  name,
  description,
  type,
  cost,
  icon,
  color,
  rarity,
  collection,
  is_featured,
  is_limited,
  sort_order
)
SELECT
  seed.name,
  seed.description,
  seed.type,
  seed.cost,
  seed.icon,
  seed.color,
  seed.rarity,
  seed.collection,
  seed.is_featured,
  seed.is_limited,
  seed.sort_order
FROM (
  VALUES
    ('Aurora Frame', 'A glowing border for your profile photo.', 'avatar_frame', 180, '🟢', '#4ADE80', 'common', 'Profile Glow', true, false, 20),
    ('Royal Frame', 'A polished violet frame with a premium feel.', 'avatar_frame', 420, '👑', '#8B5CF6', 'rare', 'Profile Glow', false, false, 21),
    ('Solar Frame', 'A bright gold frame for standout learners.', 'avatar_frame', 900, '☀️', '#F59E0B', 'epic', 'Profile Glow', false, false, 22),

    ('Ocean Banner', 'Refresh your profile with cool coastal tones.', 'profile_banner', 220, '🌊', '#06B6D4', 'common', 'Profile Backdrops', true, false, 30),
    ('Sunset Banner', 'Warm gradients that make your profile pop.', 'profile_banner', 520, '🌇', '#FB7185', 'rare', 'Profile Backdrops', false, false, 31),
    ('Nebula Banner', 'A deep cosmic banner for your profile header.', 'profile_banner', 980, '🌌', '#6366F1', 'epic', 'Profile Backdrops', false, false, 32),

    ('Spotlight Shelf', 'Spotlight your achievements with a cleaner showcase.', 'achievement_showcase', 300, '🏅', '#F97316', 'common', 'Trophy Room', false, false, 40),
    ('Hall of Fame', 'A polished showcase look for top-tier achievements.', 'achievement_showcase', 760, '🏛️', '#EAB308', 'rare', 'Trophy Room', true, false, 41),

    ('Cheer Burst', 'Unlock a brighter reaction style for social moments.', 'reaction_pack', 250, '🎉', '#EC4899', 'common', 'Social Spark', false, false, 50),
    ('Study Buddy Pack', 'A playful reaction pack built for learners.', 'reaction_pack', 580, '💬', '#10B981', 'rare', 'Social Spark', false, false, 51),

    ('Confetti Bloom', 'Celebrate wins with a soft confetti finish.', 'celebration_effect', 450, '✨', '#22C55E', 'rare', 'Victory Effects', false, false, 60),
    ('Fireworks Flash', 'A louder finish for major learning milestones.', 'celebration_effect', 1100, '🎆', '#F43F5E', 'epic', 'Victory Effects', false, true, 61),

    ('Spring Scholar', 'A seasonal title for this learning season.', 'title', 650, '🌸', '#F472B6', 'rare', 'Seasonal Drop', false, true, 70),
    ('Founders'' Favorite', 'A featured cosmetic picked for early adopters.', 'title', 1400, '⭐', '#FACC15', 'legendary', 'Seasonal Drop', true, true, 71)
) AS seed(
  name,
  description,
  type,
  cost,
  icon,
  color,
  rarity,
  collection,
  is_featured,
  is_limited,
  sort_order
)
WHERE NOT EXISTS (
  SELECT 1
  FROM shop_items existing
  WHERE existing.name = seed.name
);
