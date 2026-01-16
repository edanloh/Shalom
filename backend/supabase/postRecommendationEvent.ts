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
  if (req.method !== "POST") return fail("Method not allowed", 405);

  try {
    const body = await req.json();
    const event = {
      user_id: body.userId || body.user_id || "anon",
      course_id: body.courseId || body.course_id || null,
      event_type: body.eventType || body.event_type || "unknown",
      placement: body.context?.placement || body.placement || "unknown",
      context: body.context || {},
      timestamp: body.timestamp || new Date().toISOString(),
    };

    const { error } = await supabase.from("recommendation_events").insert(event);
    if (error) throw error;

    return ok({ success: true, message: "Event recorded" });
  } catch (err: any) {
    console.error("postRecommendationEvent error", err);
    return fail("Failed to record event", 500, { error: err.message });
  }
});
