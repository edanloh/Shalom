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

  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    if (!userId) return fail("userId is required", 400);

    const nowIso = new Date().toISOString();
    const { count: activeCount, error: activeErr } = await supabase
      .from("learning_goals")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_active", true)
      .is("completed_at", null)
      .or(`deadline.is.null,deadline.gte.${nowIso}`);
    if (activeErr) throw activeErr;

    const { data: batchRow, error: batchErr } = await supabase
      .from("goal_template_batches")
      .select("id, template_ids")
      .eq("user_id", userId)
      .eq("is_consumed", false)
      .order("created_at", { ascending: false })
      .maybeSingle();
    if (batchErr && batchErr.code !== "PGRST116") throw batchErr;

    let templateIds: string[] = [];
    const noActiveGoals = (activeCount ?? 0) === 0;
    if (noActiveGoals && batchRow?.id) {
      const { error: consumeErr } = await supabase
        .from("goal_template_batches")
        .update({ is_consumed: true })
        .eq("id", batchRow.id);
      if (consumeErr) throw consumeErr;
    }

    if (!noActiveGoals && batchRow?.template_ids?.length) {
      templateIds = batchRow.template_ids;
    } else {
      const { data, error } = await supabase
        .from("goal_templates")
        .select(
          "id,label,description,difficulty,target_hours,target_courses,target_points,target_lessons,target_quizzes,duration_days,reward_points"
        )
        .eq("is_active", true);
      if (error) throw error;

      const templates = Array.isArray(data) ? data.slice() : [];
      for (let i = templates.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [templates[i], templates[j]] = [templates[j], templates[i]];
      }

      const selection = templates.slice(0, 5);
      templateIds = selection.map((t) => t.id);
      const { error: insertErr } = await supabase.from("goal_template_batches").insert({
        user_id: userId,
        template_ids: templateIds,
      });
      if (insertErr) throw insertErr;
    }

    const { data: templates, error: templatesErr } = await supabase
      .from("goal_templates")
      .select(
        "id,label,description,difficulty,target_hours,target_courses,target_points,target_lessons,target_quizzes,duration_days,reward_points"
      )
      .in("id", templateIds);
    if (templatesErr) throw templatesErr;

    const byId = new Map((templates ?? []).map((row) => [row.id, row]));
    const ordered = templateIds.map((id) => byId.get(id)).filter(Boolean);
    return ok({ success: true, data: ordered });
  } catch (err: any) {
    console.error("getGoalTemplates error", err);
    return fail("Failed to fetch goal templates", 500, { error: err.message });
  }
});
