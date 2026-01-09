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

async function computeBalance(userId: string) {
  const { data, error } = await supabase
    .from("credits_events")
    .select("points")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).reduce((sum, row) => sum + (Number(row.points) || 0), 0);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return fail("Method not allowed", 405);

  try {
    const body = await req.json();
    const userId = body.userId;
    if (!userId) return fail("userId is required", 400);

    const pointsNum = Number(body.points);
    if (!Number.isFinite(pointsNum) || !Number.isInteger(pointsNum)) {
      return fail("points must be an integer", 400);
    }

    const event = {
      user_id: userId,
      type: body.type || "generic",
      title: body.title || "Credit event",
      points: pointsNum,
      course_id: body.courseId || null,
      timestamp: body.timestamp || new Date().toISOString(),
      reference_key: body.referenceKey || null,
    };

    // Idempotency: if reference_key exists for this user, return current balance
    if (event.reference_key) {
      const { data: existing, error: existErr } = await supabase
        .from("credits_events")
        .select("id")
        .eq("user_id", event.user_id)
        .eq("reference_key", event.reference_key)
        .maybeSingle();

      if (existErr) throw existErr;

      if (existing) {
        const balance = await computeBalance(event.user_id);
        return ok({
          success: true,
          data: { balance, event, duplicate: true },
        });
      }
    }

    // Insert event
    const { error: insertErr } = await supabase.from("credits_events").insert(event);
    if (insertErr) throw insertErr;

    const balance = await computeBalance(event.user_id);
    return ok({ success: true, data: { balance, event } });
  } catch (err: any) {
    console.error("postCreditEvent error", err);
    return fail("Failed to record credit event", 500, { error: err.message });
  }
});
