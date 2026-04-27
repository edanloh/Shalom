-- Harden credit shop spending with DB constraints and transactional redemption.

DO $do$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'shop_items'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.shop_items'::regclass
      AND conname = 'shop_items_cost_nonnegative'
  ) THEN
    ALTER TABLE public.shop_items
      ADD CONSTRAINT shop_items_cost_nonnegative CHECK (cost >= 0) NOT VALID;
  END IF;
END
$do$;

CREATE UNIQUE INDEX IF NOT EXISTS credits_events_user_reference_key_uidx
  ON public.credits_events (user_id, reference_key)
  WHERE reference_key IS NOT NULL;

CREATE OR REPLACE FUNCTION public.redeem_shop_item(
  p_user_id uuid,
  p_item_id uuid,
  p_action text
)
RETURNS TABLE (
  action text,
  item_id uuid,
  item_name text,
  new_balance integer,
  already_unlocked boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item record;
  v_existing_id uuid;
  v_balance integer := 0;
  v_reference_key text;
  v_rows integer := 0;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'userId is required' USING ERRCODE = 'P4000';
  END IF;

  IF p_item_id IS NULL THEN
    RAISE EXCEPTION 'itemId is required' USING ERRCODE = 'P4000';
  END IF;

  IF p_action NOT IN ('purchase', 'equip', 'unequip') THEN
    RAISE EXCEPTION 'action must be purchase, equip, or unequip' USING ERRCODE = 'P4000';
  END IF;

  -- Serialize all shop operations for this user. This prevents two concurrent
  -- purchases from both seeing the same spendable balance.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  SELECT id, name, cost, type
    INTO v_item
  FROM public.shop_items
  WHERE id = p_item_id
    AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item not found' USING ERRCODE = 'P4040';
  END IF;

  IF v_item.cost < 0 THEN
    RAISE EXCEPTION 'Item cost cannot be negative' USING ERRCODE = 'P4000';
  END IF;

  SELECT id
    INTO v_existing_id
  FROM public.user_unlocked_items
  WHERE user_id = p_user_id
    AND item_id = p_item_id;

  SELECT COALESCE(SUM(points), 0)::integer
    INTO v_balance
  FROM public.credits_events
  WHERE user_id = p_user_id;

  IF p_action = 'equip' THEN
    IF v_existing_id IS NULL THEN
      v_reference_key := 'shop_purchase:' || p_item_id::text;

      IF NOT EXISTS (
        SELECT 1
        FROM public.credits_events
        WHERE user_id = p_user_id
          AND type = 'shop_purchase'
          AND reference_key = v_reference_key
      ) THEN
        RAISE EXCEPTION 'Item not unlocked' USING ERRCODE = 'P4030';
      END IF;

      INSERT INTO public.user_unlocked_items (user_id, item_id, is_equipped)
      VALUES (p_user_id, p_item_id, false)
      ON CONFLICT (user_id, item_id) DO NOTHING;
    END IF;

    UPDATE public.user_unlocked_items
      SET is_equipped = false
    WHERE user_id = p_user_id
      AND item_id IN (
        SELECT id
        FROM public.shop_items
        WHERE type = v_item.type
          AND is_active = true
      );

    UPDATE public.user_unlocked_items
      SET is_equipped = true
    WHERE user_id = p_user_id
      AND item_id = p_item_id;

    RETURN QUERY SELECT 'equip'::text, v_item.id, v_item.name, v_balance, false;
    RETURN;
  END IF;

  IF p_action = 'unequip' THEN
    IF v_existing_id IS NULL THEN
      RAISE EXCEPTION 'Item not unlocked' USING ERRCODE = 'P4030';
    END IF;

    UPDATE public.user_unlocked_items
      SET is_equipped = false
    WHERE user_id = p_user_id
      AND item_id = p_item_id;

    RETURN QUERY SELECT 'unequip'::text, v_item.id, v_item.name, v_balance, false;
    RETURN;
  END IF;

  -- p_action = 'purchase'
  IF v_existing_id IS NOT NULL THEN
    RETURN QUERY SELECT 'purchase'::text, v_item.id, v_item.name, v_balance, true;
    RETURN;
  END IF;

  IF v_item.cost > 0 AND v_balance < v_item.cost THEN
    RAISE EXCEPTION 'Not enough credits. Need %, have %.', v_item.cost, v_balance
      USING ERRCODE = 'P4020';
  END IF;

  v_reference_key := 'shop_purchase:' || p_item_id::text;

  INSERT INTO public.credits_events (
    user_id,
    type,
    title,
    points,
    reference_key,
    timestamp
  )
  VALUES (
    p_user_id,
    'shop_purchase',
    'Unlocked "' || v_item.name || '"',
    -v_item.cost,
    v_reference_key,
    now()
  )
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  INSERT INTO public.user_unlocked_items (user_id, item_id, is_equipped)
  VALUES (p_user_id, p_item_id, false)
  ON CONFLICT (user_id, item_id) DO NOTHING;

  IF v_rows = 0 THEN
    RETURN QUERY SELECT 'purchase'::text, v_item.id, v_item.name, v_balance, true;
    RETURN;
  END IF;

  RETURN QUERY SELECT 'purchase'::text, v_item.id, v_item.name, v_balance - v_item.cost, false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_shop_item(uuid, uuid, text) TO service_role;
