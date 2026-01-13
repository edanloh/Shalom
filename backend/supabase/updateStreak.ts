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

const GRACE_DAYS = 1;
const HOT_STREAK_THRESHOLDS = new Set([3, 7, 14, 30]);

const ok = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const fail = (message: string, status = 500, extra: Record<string, unknown> = {}) =>
  ok({ success: false, message, ...extra }, status);

async function sendNotification(payload: {
  userId: string;
  title: string;
  message: string;
  type: string;
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

async function maybeNotifyHotStreak(userId: string, streakDays: number) {
  if (!HOT_STREAK_THRESHOLDS.has(streakDays)) return;
  const todayUtc = new Date().toISOString().split("T")[0];
  const { data, error } = await supabase
    .from("notifications")
    .select("id")
    .eq("user_id", userId)
    .eq("type", "streak_hot")
    .ilike("message", `%${streakDays}%`)
    .gte("created_at", todayUtc)
    .limit(1)
    .maybeSingle();
  if (error && error.code !== "PGRST116") throw error;
  if (data?.id) return;
  await sendNotification({
    userId,
    type: "streak_hot",
    title: "Hot streak",
    message: `You're on a ${streakDays}-day streak! Keep it going.`,
  });
}

const getLocalDateParts = (date: Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") map[part.type] = part.value;
  }
  const dateStr = `${map.year}-${map.month}-${map.day}`;
  return { dateStr };
};

const daysBetween = (start: string, end: string) => {
  const startDate = new Date(`${start}T00:00:00.000Z`);
  const endDate = new Date(`${end}T00:00:00.000Z`);
  const diffMs = endDate.getTime() - startDate.getTime();
  return Math.floor(diffMs / (24 * 60 * 60 * 1000));
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return fail("Method not allowed", 405);

  try {
    const body = await req.json();
    const userId = body.userId;
    if (!userId) return fail("userId is required", 400);

    const activityAt = body.activityAt;
    const activityDate = activityAt ? new Date(activityAt) : new Date();
    if (Number.isNaN(activityDate.getTime())) {
      return fail("activityAt must be a valid ISO date", 400);
    }

    const { data: prefRow, error: prefErr } = await supabase
      .from("user_preferences")
      .select("timezone")
      .eq("user_id", userId)
      .maybeSingle();
    if (prefErr && prefErr.code !== "PGRST116") throw prefErr;

    const timezone = prefRow?.timezone || "UTC";
    const today = getLocalDateParts(activityDate, timezone).dateStr;

    const { data: lastRow, error: lastErr } = await supabase
      .from("user_analytics")
      .select("date, streak_days")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lastErr) throw lastErr;

    let newStreak = 1;
    if (lastRow?.date) {
      const diffDays = daysBetween(lastRow.date, today);
      if (diffDays <= 0) {
        newStreak = Math.max(Number(lastRow.streak_days ?? 0), 1);
      } else if (diffDays <= GRACE_DAYS + 1) {
        newStreak = Number(lastRow.streak_days ?? 0) + 1;
      } else {
        newStreak = 1;
      }
    }

    const { error: upsertErr } = await supabase.from("user_analytics").upsert(
      {
        user_id: userId,
        date: today,
        streak_days: newStreak,
      },
      { onConflict: "user_id,date" }
    );
    if (upsertErr) throw upsertErr;

    const { error: goalsErr } = await supabase
      .from("learning_goals")
      .update({ streak_days: newStreak })
      .eq("user_id", userId);
    if (goalsErr) throw goalsErr;

    await maybeNotifyHotStreak(userId, newStreak);

    return ok({ success: true, data: { streakDays: newStreak, date: today } });
  } catch (err: any) {
    console.error("updateStreak error", err);
    return fail("Failed to update streak", 500, { error: err.message });
  }
});
