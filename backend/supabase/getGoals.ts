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

const getLocalParts = (date: Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") map[part.type] = part.value;
  }
  const dateStr = `${map.year}-${map.month}-${map.day}`;
  const minutes = Number(map.hour ?? "0") * 60 + Number(map.minute ?? "0");
  return { dateStr, minutes };
};

const isExpired = (deadline: string | null, timeZone: string) => {
  if (!deadline) return false;
  const now = new Date();
  const deadlineDate = new Date(deadline);
  if (Number.isNaN(deadlineDate.getTime())) return false;
  const nowParts = getLocalParts(now, timeZone);
  const deadlineParts = getLocalParts(deadlineDate, timeZone);
  if (deadlineParts.dateStr < nowParts.dateStr) return true;
  if (deadlineParts.dateStr > nowParts.dateStr) return false;
  return deadlineParts.minutes < nowParts.minutes;
};

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
      { data: prefRow, error: prefErr },
      { data: analyticsRow, error: analyticsErr },
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
      supabase
        .from("user_preferences")
        .select("timezone")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("user_analytics")
        .select("total_time_minutes")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

    if (goalsError) throw goalsError;
    if (completedError) throw completedError;
    if (prefErr && prefErr.code !== "PGRST116") throw prefErr;
    if (analyticsErr && analyticsErr.code !== "PGRST116") throw analyticsErr;

    const timezone = prefRow?.timezone || "UTC";

    const payload = (goals ?? []).map((g) => ({
      id: g.id,
      label: g.label,
      targetHours: g.target_hours,
      currentHours: g.current_hours,
      targetPoints: g.target_points,
      currentPoints: g.current_points,
      targetCourses: g.target_courses,
      currentCourses: g.current_courses,
      targetLessons: g.target_lessons,
      currentLessons: g.current_lessons,
      targetQuizzes: g.target_quizzes,
      currentQuizzes: g.current_quizzes,
      streakDays: g.streak_days,
      deadline: g.deadline,
      isActive: g.is_active,
      rewardPoints: g.reward_points,
      completedAt: g.completed_at,
      templateId: g.template_id,
      isExpired: isExpired(g.deadline, timezone),
    }));

    return new Response(
      JSON.stringify({
        success: true,
        data: payload,
        completedCourses: completedCount ?? 0,
        totalTimeMinutes: Number(analyticsRow?.total_time_minutes ?? 0),
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
