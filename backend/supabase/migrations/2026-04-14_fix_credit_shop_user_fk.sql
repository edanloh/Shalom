-- Align credit shop unlock ownership with the app's public users table.
-- The mobile app and credits system use public.users.id, not auth.users.id.
-- NOT VALID avoids failing immediately if old bad rows already exist.

ALTER TABLE IF EXISTS user_unlocked_items
  DROP CONSTRAINT IF EXISTS user_unlocked_items_user_id_fkey;

ALTER TABLE IF EXISTS user_unlocked_items
  ADD CONSTRAINT user_unlocked_items_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE NOT VALID;
