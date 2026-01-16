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
  const limitRaw = url.searchParams.get("limit");
  const offsetRaw = url.searchParams.get("offset");
  const limit = Math.min(Math.max(Number(limitRaw) || 50, 1), 200);
  const offset = Math.max(Number(offsetRaw) || 0, 0);
  if (!userId) return fail("userId is required", 400);

  try {
    const to = offset + limit - 1;
    const { data, error } = await supabase
      .from("credits_events")
      .select("id,type,title,points,course_id,timestamp")
      .eq("user_id", userId)
      .neq("points", 0)
      .order("timestamp", { ascending: false })
      .range(offset, to);

    if (error) throw error;

    const history = (data ?? []).map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      points: row.points,
      courseId: row.course_id,
      timestamp: row.timestamp,
    }));

    return ok({ success: true, data: history });
  } catch (err: any) {
    console.error("getCreditHistory error", err);
    return fail("Failed to fetch credit history", 500, { error: err.message });
  }
});
