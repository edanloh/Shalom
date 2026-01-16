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

const addDays = (date: Date, days: number) => {
  const d = new Date(date.toISOString());
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return fail("Method not allowed", 405);

  try {
    const body = await req.json();
    const userId = body.userId;
    const templateIds = Array.isArray(body.templateIds) ? body.templateIds : [];

    if (!userId || !templateIds.length) {
      return fail("userId and templateIds are required", 400);
    }

    const now = new Date();

    const nowIso = new Date().toISOString();
    const { count: activeCount, error: countErr } = await supabase
      .from("learning_goals")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_active", true)
      .is("completed_at", null)
      .or(`deadline.is.null,deadline.gte.${nowIso}`);
    if (countErr) throw countErr;

    const slotsLeft = Math.max(0, 3 - (activeCount ?? 0));
    if (slotsLeft <= 0) {
      return fail("Maximum of 3 active goals allowed", 409);
    }

    const { data: existing, error: existingErr } = await supabase
      .from("learning_goals")
      .select("template_id")
      .eq("user_id", userId)
      .eq("is_active", true)
      .is("completed_at", null)
      .in("template_id", templateIds)
      .or(`deadline.is.null,deadline.gte.${nowIso}`);
    if (existingErr) throw existingErr;

    const existingIds = new Set((existing ?? []).map((row) => row.template_id));
    const remainingIds = templateIds.filter((id: string) => !existingIds.has(id));

    const { data: templates, error: templatesErr } = await supabase
      .from("goal_templates")
      .select(
        "id,label,description,difficulty,target_hours,target_courses,target_points,target_lessons,target_quizzes,duration_days,reward_points"
      )
      .in("id", remainingIds)
      .eq("is_active", true);
    if (templatesErr) throw templatesErr;

    const selected = (templates ?? []).slice(0, slotsLeft);
    if (!selected.length) return ok({ success: true, data: [] });

    const rows = selected.map((template) => ({
      user_id: userId,
      label: template.label,
      target_hours: template.target_hours ?? 0,
      target_courses: template.target_courses ?? 0,
      target_points: template.target_points ?? 0,
      target_lessons: template.target_lessons ?? 0,
      target_quizzes: template.target_quizzes ?? 0,
      current_hours: 0,
      current_courses: 0,
      current_points: 0,
      current_lessons: 0,
      current_quizzes: 0,
      is_active: true,
      reward_points: template.reward_points ?? 0,
      deadline: addDays(now, Number(template.duration_days ?? 7)),
      template_id: template.id,
    }));

    const { data: created, error: insertErr } = await supabase
      .from("learning_goals")
      .insert(rows)
      .select("*");
    if (insertErr) throw insertErr;

    return ok({ success: true, data: created ?? [] });
  } catch (err: any) {
    console.error("createGoalsFromTemplates error", err);
    return fail("Failed to create goals", 500, { error: err.message });
  }
});
