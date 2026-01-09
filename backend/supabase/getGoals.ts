import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "" // keep secret
);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    if (!userId) {
      return new Response(JSON.stringify({ success: false, message: "User ID is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [
      { data: goals, error: goalsError },
      { count: completedCount, error: completedError },
    ] = await Promise.all([
      supabase
        .from("learning_goals")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("course_enrollments")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_completed", true),
    ]);

    if (goalsError) throw goalsError;
    if (completedError) throw completedError;

    const payload = (goals ?? []).map((g) => ({
      id: g.id,
      label: g.label,
      targetHours: g.target_hours,
      currentHours: g.current_hours,
      targetPoints: g.target_points,
      currentPoints: g.current_points,
      targetCourses: g.target_courses,
      currentCourses: g.current_courses,
      streakDays: g.streak_days,
      deadline: g.deadline,
    }));

    return new Response(
      JSON.stringify({
        success: true,
        data: payload,
        completedCourses: completedCount ?? 0,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("getGoals error", err);
    return new Response(
      JSON.stringify({ success: false, message: "Failed to fetch goals", error: err.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});
