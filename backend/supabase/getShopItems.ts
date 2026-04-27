import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

type AuthResult = {
  userId?: string;
  status?: number;
  message?: string;
};

const getAuthenticatedPublicUserId = async (
  req: Request,
  adminClient: ReturnType<typeof createClient>
): Promise<AuthResult> => {
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader) return { status: 401, message: "Missing auth header" };

  const authClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } }
  );

  const {
    data: { user },
    error,
  } = await authClient.auth.getUser();
  if (error || !user?.email) return { status: 401, message: "Unauthorized" };

  const { data: publicUser, error: userErr } = await adminClient
    .from("users")
    .select("id")
    .eq("email", user.email)
    .maybeSingle();
  if (userErr) throw userErr;
  if (!publicUser?.id) return { status: 403, message: "Public user profile not found" };

  return { userId: publicUser.id };
};

const ok = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const fail = (message: string, status = 500) =>
  ok({ success: false, message }, status);

type UnlockedItemRow = {
  item_id: string;
  is_equipped: boolean;
  unlocked_at: string | null;
};

type ShopItemRow = {
  id: string;
  name: string;
  description: string | null;
  type: string;
  cost: number;
  icon: string | null;
  color: string | null;
  rarity: string | null;
  collection: string | null;
  is_featured: boolean | null;
  is_limited: boolean | null;
  sort_order: number;
};

type CreditEventSummaryRow = {
  points: number | null;
  type: string | null;
  reference_key: string | null;
};

type UnlockState = {
  isEquipped: boolean;
  unlockedAt: string | null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") return fail("Method not allowed", 405);

  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    if (!userId) return fail("userId is required", 400);

    const auth = await getAuthenticatedPublicUserId(req, supabase);
    if (!auth.userId) {
      return fail(auth.message ?? "Unauthorized", auth.status ?? 401);
    }
    if (auth.userId !== userId) {
      return fail("Forbidden", 403);
    }

    // Fetch all active shop items
    const { data: items, error: itemsErr } = await supabase
      .from("shop_items")
      .select("id, name, description, type, cost, icon, color, rarity, collection, is_featured, is_limited, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (itemsErr) throw itemsErr;
    const shopRows = (items ?? []) as ShopItemRow[];

    // Fetch what the user has already unlocked
    const { data: unlocked, error: unlockedErr } = await supabase
      .from("user_unlocked_items")
      .select("item_id, is_equipped, unlocked_at")
      .eq("user_id", userId);
    if (unlockedErr) throw unlockedErr;

    const unlockedRows = (unlocked ?? []) as UnlockedItemRow[];
    const unlockedMap = new Map<string, UnlockState>(
      unlockedRows.map((r) => [r.item_id, { isEquipped: r.is_equipped, unlockedAt: r.unlocked_at }])
    );

    // Fetch credit events once for balance and historical purchase repair.
    const { data: creditEvents, error: creditEventsErr } = await supabase
      .from("credits_events")
      .select("points, type, reference_key")
      .eq("user_id", userId);
    if (creditEventsErr) throw creditEventsErr;

    const creditRows = (creditEvents ?? []) as CreditEventSummaryRow[];
    const balance = creditRows.reduce((sum, r) => sum + (Number(r.points) || 0), 0);
    const purchasedItemIds = new Set(
      creditRows
        .filter((row) => row.type === "shop_purchase")
        .map((row) => String(row.reference_key ?? ""))
        .filter((key) => key.startsWith("shop_purchase:"))
        .map((key) => key.slice("shop_purchase:".length))
    );

    const result = shopRows.map((item) => {
      const unlock = unlockedMap.get(item.id);
      return {
        ...item,
        description: item.description ?? "",
        icon: item.icon ?? "✨",
        color: item.color ?? "#6366F1",
        rarity: item.rarity ?? "common",
        collection: item.collection ?? null,
        isFeatured: item.is_featured ?? false,
        isLimited: item.is_limited ?? false,
        isUnlocked: !!unlock || purchasedItemIds.has(item.id),
        isEquipped: unlock?.isEquipped ?? false,
        unlockedAt: unlock?.unlockedAt ?? null,
        canAfford: balance >= item.cost,
      };
    });

    return ok({ success: true, data: { items: result, balance } });
  } catch (err: any) {
    console.error("getShopItems error", err);
    return fail("Failed to fetch shop items", 500);
  }
});
