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

type AchievementDef = {
  id: string;
  criteria: Record<string, unknown> | null;
  name?: string;
  type?: string;
  description?: string | null;
  icon?: string | null;
  points?: number | null;
  color?: string | null;
  scope_type?: string | null;
  scope_id?: string | null;
};

type CreditEventRecord = {
  type: string;
  title: string;
  points: number;
  course_id?: string | null;
  timestamp?: string;
  reference_key?: string | null;
};

const parseCriteriaNumber = (criteria: Record<string, unknown> | null, keys: string[]) => {
  if (!criteria) return null;
  for (const key of keys) {
    const raw = criteria[key];
    const num = Number(raw);
    if (Number.isFinite(num) && num > 0) return num;
  }
  return null;
};

const parseStreakDays = (event: CreditEventRecord) => {
  if (event.reference_key?.startsWith("streak_increment:")) {
    const raw = event.reference_key.split(":")[1];
    const days = Number(raw);
    return Number.isFinite(days) ? days : null;
  }
  const match = event.title?.match(/(\d+)\s*day/i);
  if (match) {
    const days = Number(match[1]);
    return Number.isFinite(days) ? days : null;
  }
  return null;
};

const parseQuizScore = (event: CreditEventRecord) => {
  if (event.reference_key?.startsWith("quiz_score:")) {
    const parts = event.reference_key.split(":");
    const raw = parts[parts.length - 1];
    const score = Number(raw);
    return Number.isFinite(score) ? score : null;
  }
  const match = event.title?.match(/(\d+)\s*%/);
  if (match) {
    const score = Number(match[1]);
    return Number.isFinite(score) ? score : null;
  }
  return null;
};

async function getCourseCompletionDays(userId: string, courseId?: string | null) {
  if (!courseId) return null;
  const { data, error } = await supabase
    .from("course_enrollments")
    .select("enrollment_date, completion_date")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .maybeSingle();
  if (error && error.code !== "PGRST116") throw error;
  if (!data?.enrollment_date) return null;
  const start = new Date(data.enrollment_date);
  const end = new Date(data.completion_date ?? new Date().toISOString());
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const diffMs = end.getTime() - start.getTime();
  return Math.max(1, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
}

async function sendNotification(payload: {
  userId: string;
  title: string;
  message: string;
  type: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceKey) return;
  await fetch(`${supabaseUrl}/functions/v1/postNotification`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
    },
    body: JSON.stringify(payload),
  });
}

async function notifyGoalCompleted(userId: string, goal: any, rewardPoints: number) {
  const { data: existing, error } = await supabase
    .from("notifications")
    .select("id")
    .eq("user_id", userId)
    .eq("type", "goal_completed")
    .eq("related_entity_id", goal.id)
    .limit(1)
    .maybeSingle();
  if (error && error.code !== "PGRST116") throw error;
  if (existing?.id) return;

  await sendNotification({
    userId,
    type: "goal_completed",
    title: "Goal completed",
    message: `${goal.label || "Goal"} completed. +${rewardPoints} credits`,
    relatedEntityType: "goal",
    relatedEntityId: goal.id,
  });
}

const isGoalComplete = (goal: any) => {
  const checks: Array<{ target: number; current: number }> = [];
  const targetHours = Number(goal.target_hours ?? 0);
  const targetPoints = Number(goal.target_points ?? 0);
  const targetCourses = Number(goal.target_courses ?? 0);
  const targetLessons = Number(goal.target_lessons ?? 0);
  const targetQuizzes = Number(goal.target_quizzes ?? 0);

  if (targetHours > 0) checks.push({ target: targetHours, current: Number(goal.current_hours ?? 0) });
  if (targetPoints > 0) checks.push({ target: targetPoints, current: Number(goal.current_points ?? 0) });
  if (targetCourses > 0) checks.push({ target: targetCourses, current: Number(goal.current_courses ?? 0) });
  if (targetLessons > 0) checks.push({ target: targetLessons, current: Number(goal.current_lessons ?? 0) });
  if (targetQuizzes > 0) checks.push({ target: targetQuizzes, current: Number(goal.current_quizzes ?? 0) });

  if (!checks.length) return false;
  return checks.every((c) => c.current >= c.target);
};

async function awardGoalCredits(userId: string, goal: any) {
  const rewardPoints = Number(goal.reward_points ?? 0);
  if (!rewardPoints || rewardPoints <= 0) return;
  const refKey = `goal_completed:${goal.id}`;
  const { data: existing, error: existingErr } = await supabase
    .from("credits_events")
    .select("id")
    .eq("user_id", userId)
    .eq("reference_key", refKey)
    .maybeSingle();
  if (existingErr) throw existingErr;
  if (existing) return;
  const event: CreditEventRecord = {
    type: "goal_hit",
    title: `${goal.label || "Goal"} completed`,
    points: rewardPoints,
    reference_key: refKey,
  };
  const { error } = await supabase.from("credits_events").insert({
    user_id: userId,
    type: event.type,
    title: event.title,
    points: event.points,
    course_id: null,
    timestamp: new Date().toISOString(),
    reference_key: event.reference_key,
  });
  if (error && error.code !== "23505") throw error;

  const balance = await computeBalance(userId);
  const awardedAchievements = await awardAchievementsForCreditEvent(userId, event, balance);
  await notifyAchievements(userId, awardedAchievements);
  await notifyGoalCompleted(userId, goal, rewardPoints);
}

async function notifyAchievements(userId: string, awarded: AchievementDef[]) {
  if (!awarded.length) return;
  const payload = awarded.map((achievement) => ({
    user_id: userId,
    title: "Achievement unlocked",
    message: achievement.name || "Achievement unlocked",
    type: "achievement",
    related_entity_type: "achievement",
    related_entity_id: achievement.id,
    created_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from("notifications").insert(payload);
  if (error) {
    console.error("postCreditEvent: failed to create achievement notifications", error);
  }
}

async function creditAchievementRewards(userId: string, awarded: AchievementDef[]) {
  if (!awarded.length) return;

  const nowIso = new Date().toISOString();
  for (const achievement of awarded) {
    const rewardPoints = Math.round(Number(achievement.points ?? 0));
    if (!Number.isFinite(rewardPoints) || rewardPoints <= 0) continue;

    const rewardEvent = {
      user_id: userId,
      type: "achievement_reward",
      title: `${achievement.name || "Achievement"} reward`,
      points: rewardPoints,
      course_id: null,
      timestamp: nowIso,
      reference_key: `achievement_reward:${achievement.id}`,
    };

    const { error } = await supabase.from("credits_events").insert(rewardEvent);
    // Idempotent insert: ignore duplicate reward event for this user+achievement.
    if (error && error.code !== "23505") throw error;
  }
}

async function countCreditEvents(userId: string, type: string) {
  const { count, error } = await supabase
    .from("credits_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("type", type);
  if (error) throw error;
  return count ?? 0;
}

async function getCourseInstructorId(courseId?: string | null) {
  if (!courseId) return null;
  const { data, error } = await supabase
    .from("courses")
    .select("instructor_id")
    .eq("id", courseId)
    .maybeSingle();
  if (error && error.code !== "PGRST116") throw error;
  return (data?.instructor_id as string | null) ?? null;
}

async function awardAchievementsForCreditEvent(
  userId: string,
  event: CreditEventRecord,
  balance: number
) {
  const { data: defs, error } = await supabase
    .from("achievements")
    .select("id, criteria, name, type, description, icon, points, color, scope_type, scope_id")
    .eq("is_active", true);
  if (error) throw error;
  if (!defs?.length) return [];

  const criteriaTypes = new Set(
    defs
      .map((d) => (d as AchievementDef).criteria?.type as string | undefined)
      .filter(Boolean)
  );

  const totals: Record<string, number | null> = {
    total_credits: balance,
    credits_earned: balance,
    credit_total: balance,
  };

  if (criteriaTypes.has("courses_completed") || criteriaTypes.has("course_completed")) {
    totals.courses_completed = await countCreditEvents(userId, "course_completed");
  }
  if (criteriaTypes.has("goal_hits") || criteriaTypes.has("goal_hit")) {
    totals.goal_hits = await countCreditEvents(userId, "goal_hit");
  }
  if (criteriaTypes.has("lessons_completed") || criteriaTypes.has("lesson_completed")) {
    totals.lessons_completed = await countCreditEvents(userId, "lesson_completed");
  }

  let streakDays: number | null = null;
  if (criteriaTypes.has("streak_days") || criteriaTypes.has("consecutive_days")) {
    streakDays = parseStreakDays(event);
  }

  let quizScore: number | null = null;
  if (criteriaTypes.has("quiz_score")) {
    quizScore = parseQuizScore(event);
  }

  let courseCompletionDays: number | null = null;
  if (criteriaTypes.has("course_completion_time") && event.type === "course_completed") {
    courseCompletionDays = await getCourseCompletionDays(userId, event.course_id ?? null);
  }

  const scopedDefsExist = (defs as AchievementDef[]).some(
    (d) => (d.scope_type ?? "global") !== "global"
  );
  const sourceCourseId = (event.course_id as string | null) ?? null;
  const sourceInstructorId =
    scopedDefsExist && sourceCourseId ? await getCourseInstructorId(sourceCourseId) : null;

  const toAward: Array<{ achievement_id: string; value?: number | null }> = [];

  for (const def of defs as AchievementDef[]) {
    const scopeType = (def.scope_type ?? "global").toLowerCase();
    const scopeId = def.scope_id ?? null;
    if (scopeType === "course" && (!sourceCourseId || !scopeId || scopeId !== sourceCourseId)) {
      continue;
    }
    if (
      scopeType === "instructor" &&
      (!sourceInstructorId || !scopeId || scopeId !== sourceInstructorId)
    ) {
      continue;
    }
    if (!["global", "course", "instructor"].includes(scopeType)) {
      continue;
    }

    const criteria = def.criteria ?? {};
    const criteriaType = criteria.type as string | undefined;
    if (!criteriaType) continue;

    const threshold =
      criteriaType === "quiz_score"
        ? parseCriteriaNumber(criteria, ["score", "min", "value"])
        : criteriaType === "course_completion_time"
        ? parseCriteriaNumber(criteria, ["days", "max", "value"])
        : parseCriteriaNumber(criteria, ["count", "min", "points", "total", "value"]);
    if (!threshold) continue;

    if (
      (criteriaType === "total_credits" ||
        criteriaType === "credits_earned" ||
        criteriaType === "credit_total") &&
      (totals.total_credits ?? 0) >= threshold
    ) {
      toAward.push({ achievement_id: def.id, value: totals.total_credits ?? null });
      continue;
    }

    if (
      (criteriaType === "courses_completed" || criteriaType === "course_completed") &&
      (totals.courses_completed ?? 0) >= threshold
    ) {
      toAward.push({ achievement_id: def.id, value: totals.courses_completed ?? null });
      continue;
    }

    if (
      (criteriaType === "goal_hits" || criteriaType === "goal_hit") &&
      (totals.goal_hits ?? 0) >= threshold
    ) {
      toAward.push({ achievement_id: def.id, value: totals.goal_hits ?? null });
      continue;
    }

    if (
      (criteriaType === "lessons_completed" || criteriaType === "lesson_completed") &&
      (totals.lessons_completed ?? 0) >= threshold
    ) {
      toAward.push({ achievement_id: def.id, value: totals.lessons_completed ?? null });
      continue;
    }

    if (
      (criteriaType === "streak_days" || criteriaType === "consecutive_days") &&
      streakDays != null &&
      streakDays >= threshold
    ) {
      toAward.push({ achievement_id: def.id, value: streakDays });
      continue;
    }

    if (criteriaType === "quiz_score" && quizScore != null && quizScore >= threshold) {
      toAward.push({ achievement_id: def.id, value: quizScore });
      continue;
    }

    if (
      criteriaType === "course_completion_time" &&
      courseCompletionDays != null &&
      courseCompletionDays <= threshold
    ) {
      toAward.push({ achievement_id: def.id, value: courseCompletionDays });
      continue;
    }
  }

  if (!toAward.length) return [];

  const candidateIds = toAward.map((row) => row.achievement_id);
  const { data: existingRows, error: existingErr } = await supabase
    .from("user_achievements")
    .select("achievement_id")
    .eq("user_id", userId)
    .in("achievement_id", candidateIds);
  if (existingErr) throw existingErr;

  const existingIds = new Set((existingRows ?? []).map((row) => row.achievement_id));
  const newAwards = toAward.filter((row) => !existingIds.has(row.achievement_id));
  if (!newAwards.length) return [];

  const { error: upsertErr } = await supabase.from("user_achievements").upsert(
    newAwards.map((row) => ({
      user_id: userId,
      achievement_id: row.achievement_id,
      value: row.value ?? null,
      source_event_type: event.type,
      source_course_id: sourceCourseId,
      source_instructor_id: sourceInstructorId,
      source_reference_key: event.reference_key ?? null,
      source_awarded_at: new Date().toISOString(),
    })),
    { onConflict: "user_id,achievement_id", ignoreDuplicates: true }
  );
  if (upsertErr) throw upsertErr;

  const ids = newAwards.map((row) => row.achievement_id);
  const { data: awarded, error: awardErr } = await supabase
    .from("achievements")
    .select("id, name, description, icon, type, points, color, scope_type, scope_id")
    .in("id", ids);
  if (awardErr) throw awardErr;
  const unlocked = awarded ?? [];
  await creditAchievementRewards(userId, unlocked);
  return unlocked;
}

async function syncPointGoals(userId: string, balance: number) {
  const now = new Date();
  const { data: goals, error } = await supabase
    .from("learning_goals")
    .select(
      "id,label,target_points,current_points,target_hours,current_hours,target_courses,current_courses,target_lessons,current_lessons,target_quizzes,current_quizzes,is_active,completed_at,reward_points"
    )
    .eq("user_id", userId)
    .eq("is_active", true)
    .is("completed_at", null)
    .gt("target_points", 0)
    .or(`deadline.is.null,deadline.gte.${now.toISOString()}`);
  if (error) throw error;
  if (!goals?.length) return;

  for (const goal of goals) {
    const targetPoints = Number(goal.target_points ?? 0);
    const cappedPoints = targetPoints > 0 ? Math.min(balance, targetPoints) : balance;
    const currentPoints = Number(goal.current_points ?? 0);
    if (currentPoints !== cappedPoints) {
      const { error: updateErr } = await supabase
        .from("learning_goals")
        .update({ current_points: cappedPoints })
        .eq("id", goal.id);
      if (updateErr) throw updateErr;
      goal.current_points = cappedPoints;
    }

    if (isGoalComplete(goal)) {
      const { error: completeErr } = await supabase
        .from("learning_goals")
        .update({ completed_at: new Date().toISOString(), is_active: false })
        .eq("id", goal.id)
        .is("completed_at", null);
      if (completeErr) throw completeErr;
      await awardGoalCredits(userId, goal);
    }
  }
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
        const balanceBefore = await computeBalance(event.user_id);
        await syncPointGoals(event.user_id, balanceBefore);
        const awardedAchievements = await awardAchievementsForCreditEvent(
          event.user_id,
          event,
          balanceBefore
        );
        const balance = await computeBalance(event.user_id);
        await notifyAchievements(event.user_id, awardedAchievements);
        return ok({
          success: true,
          data: { balance, event, duplicate: true, awardedAchievements },
        });
      }
    }

    // Insert event
    const { error: insertErr } = await supabase.from("credits_events").insert(event);
    if (insertErr) throw insertErr;

    const balanceBefore = await computeBalance(event.user_id);
    await syncPointGoals(event.user_id, balanceBefore);
    const awardedAchievements = await awardAchievementsForCreditEvent(
      event.user_id,
      event,
      balanceBefore
    );
    const balance = await computeBalance(event.user_id);
    await notifyAchievements(event.user_id, awardedAchievements);
    return ok({ success: true, data: { balance, event, awardedAchievements } });
  } catch (err: any) {
    console.error("postCreditEvent error", err);
    return fail("Failed to record credit event", 500, { error: err.message });
  }
});
