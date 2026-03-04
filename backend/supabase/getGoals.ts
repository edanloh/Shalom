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
        .select("total_time_minutes, streak_days")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

    if (goalsError) throw goalsError;
    if (completedError) throw completedError;
    if (prefErr && prefErr.code !== "PGRST116") throw prefErr;
    if (analyticsErr && analyticsErr.code !== "PGRST116") throw analyticsErr;

    const timezone = prefRow?.timezone || "UTC";

    const updates: Array<{ id: string; patch: Record<string, number> }> = [];
    const payload = (goals ?? []).map((g) => {
      const isCompleted = Boolean(g.completed_at);
      const targetHours = Number(g.target_hours ?? 0);
      const targetPoints = Number(g.target_points ?? 0);
      const targetCourses = Number(g.target_courses ?? 0);
      const targetLessons = Number(g.target_lessons ?? 0);
      const targetQuizzes = Number(g.target_quizzes ?? 0);
      const currentHours = Number(g.current_hours ?? 0);
      const currentPoints = Number(g.current_points ?? 0);
      const currentCourses = Number(g.current_courses ?? 0);
      const currentLessons = Number(g.current_lessons ?? 0);
      const currentQuizzes = Number(g.current_quizzes ?? 0);

      const cappedHours =
        isCompleted && targetHours > 0 ? Math.min(currentHours, targetHours) : currentHours;
      const cappedPoints =
        isCompleted && targetPoints > 0 ? Math.min(currentPoints, targetPoints) : currentPoints;
      const cappedCourses =
        isCompleted && targetCourses > 0 ? Math.min(currentCourses, targetCourses) : currentCourses;
      const cappedLessons =
        isCompleted && targetLessons > 0 ? Math.min(currentLessons, targetLessons) : currentLessons;
      const cappedQuizzes =
        isCompleted && targetQuizzes > 0 ? Math.min(currentQuizzes, targetQuizzes) : currentQuizzes;

      if (isCompleted) {
        const patch: Record<string, number> = {};
        if (cappedHours !== currentHours) patch.current_hours = cappedHours;
        if (cappedPoints !== currentPoints) patch.current_points = cappedPoints;
        if (cappedCourses !== currentCourses) patch.current_courses = cappedCourses;
        if (cappedLessons !== currentLessons) patch.current_lessons = cappedLessons;
        if (cappedQuizzes !== currentQuizzes) patch.current_quizzes = cappedQuizzes;
        if (Object.keys(patch).length) {
          updates.push({ id: g.id, patch });
        }
      }

      return {
        id: g.id,
        label: g.label,
      targetHours: g.target_hours,
      currentHours: cappedHours,
      targetPoints: g.target_points,
      currentPoints: cappedPoints,
      targetCourses: g.target_courses,
      currentCourses: cappedCourses,
      targetLessons: g.target_lessons,
      currentLessons: cappedLessons,
      targetQuizzes: g.target_quizzes,
      currentQuizzes: cappedQuizzes,
      streakDays: g.streak_days,
      deadline: g.deadline,
      isActive: g.is_active,
      rewardPoints: g.reward_points,
      completedAt: g.completed_at,
      templateId: g.template_id,
      isExpired: isExpired(g.deadline, timezone),
    };
    });

    if (updates.length) {
      const results = await Promise.allSettled(
        updates.map((u) =>
          supabase.from("learning_goals").update(u.patch).eq("id", u.id)
        )
      );
      for (const res of results) {
        if (res.status === "rejected") {
          console.warn("getGoals: failed to cap completed goal progress", res.reason);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: payload,
        completedCourses: completedCount ?? 0,
        totalTimeMinutes: Number(analyticsRow?.total_time_minutes ?? 0),
        streakDays: Number(analyticsRow?.streak_days ?? 0),
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
