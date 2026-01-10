import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
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

const fail = (message: string, status = 500, extra: Record<string, unknown> = {}) =>
  ok({ success: false, message, ...extra }, status);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") return fail("Method not allowed", 405);

  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  const limitRaw = url.searchParams.get("limit");
  const limit = Math.min(Math.max(Number(limitRaw) || 50, 1), 200);

  if (!userId) return fail("userId is required", 400);

  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("id,user_id,title,message,type,is_read,created_at,action_url")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return ok({ success: true, data: data ?? [] });
  } catch (err: any) {
    console.error("getNotifications error", err);
    return fail("Failed to fetch notifications", 500, { error: err.message });
  }
});
