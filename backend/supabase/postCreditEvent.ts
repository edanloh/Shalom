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

async function countCreditEvents(userId: string, type: string) {
  const { count, error } = await supabase
    .from("credits_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("type", type);
  if (error) throw error;
  return count ?? 0;
}

async function awardAchievementsForCreditEvent(
  userId: string,
  event: CreditEventRecord,
  balance: number
) {
  const { data: defs, error } = await supabase
    .from("achievements")
    .select("id, criteria, name, type, description, icon, points, color")
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

  let streakDays: number | null = null;
  if (criteriaTypes.has("streak_days") || criteriaTypes.has("consecutive_days")) {
    streakDays = parseStreakDays(event);
  }

  const toAward: Array<{ achievement_id: string; value?: number | null }> = [];

  for (const def of defs as AchievementDef[]) {
    const criteria = def.criteria ?? {};
    const criteriaType = criteria.type as string | undefined;
    if (!criteriaType) continue;

    const threshold = parseCriteriaNumber(criteria, ["count", "min", "points", "total", "value"]);
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
      (criteriaType === "streak_days" || criteriaType === "consecutive_days") &&
      streakDays != null &&
      streakDays >= threshold
    ) {
      toAward.push({ achievement_id: def.id, value: streakDays });
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
    })),
    { onConflict: "user_id,achievement_id", ignoreDuplicates: true }
  );
  if (upsertErr) throw upsertErr;

  const ids = newAwards.map((row) => row.achievement_id);
  const { data: awarded, error: awardErr } = await supabase
    .from("achievements")
    .select("id, name, description, icon, type, points, color")
    .in("id", ids);
  if (awardErr) throw awardErr;
  return awarded ?? [];
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
        const awardedAchievements = await awardAchievementsForCreditEvent(event.user_id, event, balance);
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

    const balance = await computeBalance(event.user_id);
    const awardedAchievements = await awardAchievementsForCreditEvent(event.user_id, event, balance);
    await notifyAchievements(event.user_id, awardedAchievements);
    return ok({ success: true, data: { balance, event, awardedAchievements } });
  } catch (err: any) {
    console.error("postCreditEvent error", err);
    return fail("Failed to record credit event", 500, { error: err.message });
  }
});
