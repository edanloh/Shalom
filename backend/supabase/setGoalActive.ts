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
    const isActive = Boolean(body.isActive);

    if (!userId || !goalId) return fail("userId and goalId are required", 400);

    if (isActive) {
      const { data: existing, error: existingErr } = await supabase
        .from("learning_goals")
        .select("id, is_active, completed_at")
        .eq("user_id", userId)
        .eq("id", goalId)
        .maybeSingle();
      if (existingErr) throw existingErr;
      if (!existing) return fail("Goal not found", 404);
      if (existing.completed_at) return fail("Goal is already completed", 409);

      if (!existing.is_active) {
        const nowIso = new Date().toISOString();
        const { count, error: countErr } = await supabase
          .from("learning_goals")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("is_active", true)
          .is("completed_at", null)
          .or(`deadline.is.null,deadline.gte.${nowIso}`);
        if (countErr) throw countErr;
        if ((count ?? 0) >= 3) {
          return fail("Maximum of 3 active goals allowed", 409);
        }
      }
    }

    const updatePatch: Record<string, unknown> = { is_active: isActive };
    if (isActive) {
      updatePatch.current_hours = 0;
      updatePatch.current_courses = 0;
      updatePatch.current_points = 0;
      updatePatch.current_lessons = 0;
      updatePatch.current_quizzes = 0;
    }

    const { data, error } = await supabase
      .from("learning_goals")
      .update(updatePatch)
      .eq("user_id", userId)
      .eq("id", goalId)
      .select("*")
      .maybeSingle();
    if (error) throw error;

    return ok({ success: true, data });
  } catch (err: any) {
    console.error("setGoalActive error", err);
    return fail("Failed to update goal", 500, { error: err.message });
  }
});
