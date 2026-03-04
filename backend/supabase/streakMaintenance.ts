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
const REMINDER_WINDOW_START = 18;
const REMINDER_WINDOW_END = 21;
const MAX_LOOKBACK_DAYS = 7;
const REMINDER_COOLDOWN_HOURS = 20;
const BROKEN_COOLDOWN_HOURS = 36;

const ok = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const fail = (message: string, status = 500, extra: Record<string, unknown> = {}) =>
  ok({ success: false, message, ...extra }, status);

const getLocalParts = (date: Date, timeZone: string) => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") map[part.type] = part.value;
  }
  const dateStr = `${map.year}-${map.month}-${map.day}`;
  const hour = Number(map.hour ?? "0");
  return { dateStr, hour };
};

const safeLocalParts = (date: Date, timeZone: string) => {
  try {
    return getLocalParts(date, timeZone);
  } catch {
    return getLocalParts(date, "UTC");
  }
};

const addDays = (dateStr: string, days: number) => {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
};

const daysBetween = (start: string, end: string) => {
  const startDate = new Date(`${start}T00:00:00.000Z`);
  const endDate = new Date(`${end}T00:00:00.000Z`);
  const diffMs = endDate.getTime() - startDate.getTime();
  return Math.floor(diffMs / (24 * 60 * 60 * 1000));
};

async function hasRecentNotification(userId: string, type: string, hours: number) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("notifications")
    .select("id")
    .eq("user_id", userId)
    .eq("type", type)
    .gte("created_at", since)
    .limit(1)
    .maybeSingle();
  if (error && error.code !== "PGRST116") throw error;
  return Boolean(data?.id);
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
  const directInsert = async () => {
    await supabase.from("notifications").insert({
      user_id: payload.userId,
      title: payload.title,
      message: payload.message,
      type: payload.type,
      related_entity_type: payload.relatedEntityType ?? null,
      related_entity_id: payload.relatedEntityId ?? null,
      created_at: new Date().toISOString(),
    });
  };

  if (!supabaseUrl || !serviceKey) {
    await directInsert();
    return;
  }

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/postNotification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
      body: JSON.stringify({
        userIds: [payload.userId],
        title: payload.title,
        message: payload.message,
        type: payload.type,
        relatedEntityType: payload.relatedEntityType,
        relatedEntityId: payload.relatedEntityId,
      }),
    });
    if (!response.ok) {
      await directInsert();
    }
  } catch {
    await directInsert();
  }
}

async function notifyExpiredGoals(nowIso: string) {
  const { data: goals, error } = await supabase
    .from("learning_goals")
    .select("id, user_id, label, deadline")
    .eq("is_active", true)
    .is("completed_at", null)
    .lt("deadline", nowIso);
  if (error) throw error;
  if (!goals?.length) return 0;

  let sent = 0;
  for (const goal of goals as Array<{ id: string; user_id: string; label?: string | null }>) {
    const goalId = String(goal.id);
    const goalUserId = String(goal.user_id);
    const { data: existing, error: existingErr } = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", goalUserId)
      .eq("type", "goal_expired")
      .eq("related_entity_id", goalId)
      .limit(1)
      .maybeSingle();
    if (existingErr && existingErr.code !== "PGRST116") throw existingErr;
    if (existing?.id) continue;

    await sendNotification({
      userId: goalUserId,
      type: "goal_expired",
      title: "Goal expired",
      message: `${goal.label || "Goal"} expired. Clear it to pick a new one.`,
      relatedEntityType: "goal",
      relatedEntityId: goalId,
    });
    sent += 1;
  }
  return sent;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return fail("Method not allowed", 405);

  try {
    const body = await req.json().catch(() => ({}));
    const now = body?.now ? new Date(body.now) : new Date();
    if (Number.isNaN(now.getTime())) return fail("now must be a valid ISO date", 400);

    const utcDateStr = now.toISOString().split("T")[0];
    const cutoffDate = addDays(utcDateStr, -MAX_LOOKBACK_DAYS);

    const { data: users, error: usersErr } = await supabase
      .from("users")
      .select("id")
      .eq("is_active", true);
    if (usersErr) throw usersErr;

    const userIds = (users ?? []).map((u: { id: string }) => String(u.id));
    if (!userIds.length) return ok({ success: true, data: { processed: 0 } });

    const { data: prefs, error: prefErr } = await supabase
      .from("user_preferences")
      .select("user_id, timezone")
      .in("user_id", userIds);
    if (prefErr && prefErr.code !== "PGRST116") throw prefErr;

    const prefMap = new Map(
      (prefs ?? []).map((row: { user_id: string; timezone?: string | null }) => [
        String(row.user_id),
        row.timezone || "UTC",
      ])
    );

    const { data: analytics, error: analyticsErr } = await supabase
      .from("user_analytics")
      .select("user_id, date, streak_days")
      .gte("date", cutoffDate)
      .order("date", { ascending: false });
    if (analyticsErr) throw analyticsErr;

    const lastByUser = new Map<
      string,
      { date: string; streak: number }
    >();
    for (const row of analytics ?? []) {
      if (lastByUser.has(row.user_id)) continue;
      lastByUser.set(row.user_id, {
        date: row.date,
        streak: Number(row.streak_days ?? 0),
      });
    }

    let remindersSent = 0;
    let brokenSent = 0;
    let goalsExpiredSent = 0;

    for (const userId of userIds) {
      const last = lastByUser.get(userId);
      if (!last?.date || last.streak <= 0) continue;

      const tz = String(prefMap.get(userId) ?? "UTC");
      const { dateStr: todayLocal, hour: localHour } = safeLocalParts(now, tz);
      const diffDays = daysBetween(last.date, todayLocal);
      if (diffDays <= 0) continue;

      if (diffDays <= GRACE_DAYS) {
        const inWindow =
          localHour >= REMINDER_WINDOW_START && localHour <= REMINDER_WINDOW_END;
        if (!inWindow) continue;
        const alreadySent = await hasRecentNotification(
          userId,
          "streak_reminder",
          REMINDER_COOLDOWN_HOURS
        );
        if (alreadySent) continue;
        await sendNotification({
          userId,
          type: "streak_reminder",
          title: "Keep your streak alive",
          message: `Your ${last.streak}-day streak ends today. Jump back in!`,
        });
        remindersSent += 1;
      } else if (diffDays >= GRACE_DAYS + 1) {
        const alreadySent = await hasRecentNotification(
          userId,
          "streak_broken",
          BROKEN_COOLDOWN_HOURS
        );
        if (alreadySent) continue;
        await sendNotification({
          userId,
          type: "streak_broken",
          title: "Streak ended",
          message: `Your ${last.streak}-day streak ended. Start a new one today!`,
        });
        await supabase
          .from("learning_goals")
          .update({ streak_days: 0 })
          .eq("user_id", userId);
        brokenSent += 1;
      }
    }

    goalsExpiredSent = await notifyExpiredGoals(now.toISOString());

    return ok({
      success: true,
      data: {
        processed: userIds.length,
        remindersSent,
        brokenSent,
        goalsExpiredSent,
      },
    });
  } catch (err: any) {
    console.error("streakMaintenance error", err);
    return fail("Failed to process streak reminders", 500, { error: err.message });
  }
});
