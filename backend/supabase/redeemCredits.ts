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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return fail("Method not allowed", 405);

  try {
    const body = await req.json();
    const { userId, itemId, action } = body;

    if (!userId) return fail("userId is required", 400);
    if (!itemId) return fail("itemId is required", 400);
    if (action !== "purchase" && action !== "equip" && action !== "unequip") {
      return fail("action must be 'purchase', 'equip', or 'unequip'", 400);
    }

    const auth = await getAuthenticatedPublicUserId(req, supabase);
    if (!auth.userId) {
      return fail(auth.message ?? "Unauthorized", auth.status ?? 401);
    }
    if (auth.userId !== userId) {
      return fail("Forbidden", 403);
    }

    const { data, error } = await supabase.rpc("redeem_shop_item", {
      p_user_id: userId,
      p_item_id: itemId,
      p_action: action,
    });
    if (error) {
      const msg = error.message ?? "Failed to process redemption";
      if (error.code === "P4020") return fail(msg, 402);
      if (error.code === "P4030") return fail(msg, 403);
      if (error.code === "P4040") return fail(msg, 404);
      if (error.code === "P4000") return fail(msg, 400);
      throw error;
    }

    const row = Array.isArray(data) ? data[0] : data;
    return ok({
      success: true,
      data: {
        action: row?.action ?? action,
        itemId: row?.item_id ?? itemId,
        itemName: row?.item_name ?? null,
        newBalance: Number(row?.new_balance ?? 0),
        alreadyUnlocked: !!row?.already_unlocked,
      },
    });
  } catch (err: any) {
    console.error("redeemCredits error", err);
    return fail("Failed to process redemption", 500);
  }
});
