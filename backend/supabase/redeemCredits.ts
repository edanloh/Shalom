import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const ok = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const fail = (message: string, status = 500) =>
  ok({ success: false, message }, status);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return fail("Method not allowed", 405);

  try {
    const body = await req.json();
    const { userId, itemId, action } = body;

    if (!userId) return fail("userId is required", 400);
    if (!itemId) return fail("itemId is required", 400);
    if (action !== "purchase" && action !== "equip") {
      return fail("action must be 'purchase' or 'equip'", 400);
    }

    // Fetch item
    const { data: item, error: itemErr } = await supabase
      .from("shop_items")
      .select("id, name, cost, type, icon")
      .eq("id", itemId)
      .eq("is_active", true)
      .maybeSingle();
    if (itemErr) throw itemErr;
    if (!item) return fail("Item not found", 404);

    // Check existing unlock
    let { data: existing, error: existErr } = await supabase
      .from("user_unlocked_items")
      .select("id, is_equipped")
      .eq("user_id", userId)
      .eq("item_id", itemId)
      .maybeSingle();
    if (existErr) throw existErr;

    if (action === "equip") {
      if (!existing) {
        const { data: purchaseEvent, error: purchaseLookupErr } = await supabase
          .from("credits_events")
          .select("id")
          .eq("user_id", userId)
          .eq("type", "shop_purchase")
          .eq("reference_key", `shop_purchase:${itemId}`)
          .maybeSingle();
        if (purchaseLookupErr) throw purchaseLookupErr;
        if (!purchaseEvent) return fail("Item not unlocked", 403);

        const { error: repairErr } = await supabase
          .from("user_unlocked_items")
          .upsert(
            {
              user_id: userId,
              item_id: itemId,
              is_equipped: false,
            },
            { onConflict: "user_id,item_id", ignoreDuplicates: true }
          );
        if (repairErr) throw repairErr;

        const repaired = await supabase
          .from("user_unlocked_items")
          .select("id, is_equipped")
          .eq("user_id", userId)
          .eq("item_id", itemId)
          .maybeSingle();
        if (repaired.error) throw repaired.error;
        existing = repaired.data;
      }

      // Unequip all other items of the same type, then equip this one
      const { data: sameType, error: sameTypeErr } = await supabase
        .from("shop_items")
        .select("id")
        .eq("type", item.type)
        .eq("is_active", true);
      if (sameTypeErr) throw sameTypeErr;

      const sameTypeIds = (sameType ?? []).map((i) => i.id);

      const { error: unequipErr } = await supabase
        .from("user_unlocked_items")
        .update({ is_equipped: false })
        .eq("user_id", userId)
        .in("item_id", sameTypeIds);
      if (unequipErr) throw unequipErr;

      const { error: equipErr } = await supabase
        .from("user_unlocked_items")
        .update({ is_equipped: true })
        .eq("user_id", userId)
        .eq("item_id", itemId);
      if (equipErr) throw equipErr;

      return ok({ success: true, data: { action: "equip", itemId, itemName: item.name } });
    }

    // Verify balance
    const { data: events, error: balErr } = await supabase
      .from("credits_events")
      .select("points")
      .eq("user_id", userId);
    if (balErr) throw balErr;
    const balance = (events ?? []).reduce((sum, r) => sum + (Number(r.points) || 0), 0);

    // action === "purchase"
    if (existing) {
      return ok({
        success: true,
        data: {
          action: "purchase",
          itemId,
          itemName: item.name,
          newBalance: balance,
          alreadyUnlocked: true,
        },
      });
    }

    if (item.cost > 0 && balance < item.cost) {
      return fail(`Not enough credits. Need ${item.cost}, have ${balance}.`, 402);
    }

    // Deduct credits via a negative credit event
    const referenceKey = `shop_purchase:${itemId}`;
    const { error: deductErr } = await supabase.from("credits_events").insert({
      user_id: userId,
      type: "shop_purchase",
      title: `Unlocked "${item.name}"`,
      points: -item.cost,
      reference_key: referenceKey,
      timestamp: new Date().toISOString(),
    });
    if (deductErr && deductErr.code !== "23505") throw deductErr;

    // Ensure the unlock row exists whether this is the first successful purchase
    // or a repair of a previously deducted item.
    const { error: unlockErr } = await supabase
      .from("user_unlocked_items")
      .upsert(
        {
          user_id: userId,
          item_id: itemId,
          is_equipped: false,
        },
        { onConflict: "user_id,item_id", ignoreDuplicates: true }
      );
    if (unlockErr) throw unlockErr;

    const alreadyUnlocked = deductErr?.code === "23505";
    const newBalance = alreadyUnlocked ? balance : balance - item.cost;
    return ok({
      success: true,
      data: { action: "purchase", itemId, itemName: item.name, newBalance, alreadyUnlocked },
    });
  } catch (err: any) {
    console.error("redeemCredits error", err);
    return fail("Failed to process redemption", 500);
  }
});
