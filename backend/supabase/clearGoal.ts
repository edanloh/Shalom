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

const fail = (message: string, status = 500, extra: Record<string, unknown> = {}) =>
  ok({ success: false, message, ...extra }, status);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return fail("Method not allowed", 405);

  try {
    const body = await req.json();
    const userId = body.userId;
    const goalId = body.goalId;
    if (!userId || !goalId) return fail("userId and goalId are required", 400);

    const { data, error } = await supabase
      .from("learning_goals")
      .update({
        is_active: false,
        completed_at: null,
        deadline: null,
        current_hours: 0,
        current_courses: 0,
        current_points: 0,
        current_lessons: 0,
        current_quizzes: 0,
      })
      .eq("user_id", userId)
      .eq("id", goalId)
      .select("*")
      .maybeSingle();
    if (error) throw error;

    return ok({ success: true, data });
  } catch (err: any) {
    console.error("clearGoal error", err);
    return fail("Failed to clear goal", 500, { error: err.message });
  }
});
