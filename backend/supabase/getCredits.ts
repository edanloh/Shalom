import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "" // keep this secret
);

const ok = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const fail = (message: string, status = 500, extra: Record<string, unknown> = {}) =>
  ok({ success: false, message, ...extra }, status);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  if (!userId) return fail("userId is required", 400);

  try {
    const { data, error } = await supabase
      .from("credits_events")
      .select("points,timestamp")
      .eq("user_id", userId)
      .order("timestamp", { ascending: false });

    if (error) throw error;
    const balance = (data ?? []).reduce((sum, row) => sum + (Number(row.points) || 0), 0);
    const lastUpdated = data?.[0]?.timestamp ?? new Date().toISOString();

    return ok({ success: true, data: { balance, lastUpdated } });
  } catch (err: any) {
    console.error("getCredits error", err);
    return fail("Failed to fetch credits", 500, { error: err.message });
  }
});
