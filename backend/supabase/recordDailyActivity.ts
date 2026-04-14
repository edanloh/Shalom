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

const DAILY_LOGIN_POINTS = 5;

const ok = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const fail = (message: string, status = 500, extra: Record<string, unknown> = {}) =>
  ok({ success: false, message, ...extra }, status);

const getLocalDateString = (date: Date, timeZone: string): string => {
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
  return `${map.year}-${map.month}-${map.day}`;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return fail("Method not allowed", 405);

  try {
    const body = await req.json();
    const userId = body.userId;
    if (!userId) return fail("userId is required", 400);

    // Resolve today's date in the user's stored timezone so the reference key
    // is consistent regardless of where the device clock says it is.
    const { data: prefRow, error: prefErr } = await supabase
      .from("user_preferences")
      .select("timezone")
      .eq("user_id", userId)
      .maybeSingle();
    if (prefErr && prefErr.code !== "PGRST116") throw prefErr;

    const timezone = prefRow?.timezone || "UTC";
    const today = getLocalDateString(new Date(), timezone);
    const referenceKey = `daily_login:${today}`;

    // Check idempotency before calling postCreditEvent to avoid unnecessary work.
    const { data: existing, error: existErr } = await supabase
      .from("credits_events")
      .select("id")
      .eq("user_id", userId)
      .eq("reference_key", referenceKey)
      .maybeSingle();
    if (existErr) throw existErr;

    if (existing) {
      return ok({ success: true, data: { duplicate: true, date: today } });
    }

    // Fire the credit event internally using the service role key.
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const loginResp = await fetch(`${supabaseUrl}/functions/v1/postCreditEvent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
      body: JSON.stringify({
        userId,
        type: "daily_login",
        title: "Daily login",
        points: DAILY_LOGIN_POINTS,
        referenceKey,
      }),
    });

    const loginResult = await loginResp.json();
    if (!loginResult.success) {
      return fail(loginResult.message || "Failed to record daily login", loginResp.status);
    }

    // Update streak and award streak increment credits in one shot
    const streakResp = await fetch(`${supabaseUrl}/functions/v1/updateStreak`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
      body: JSON.stringify({ userId }),
    });
    const streakResult = await streakResp.json();
    const streakCredits = streakResult?.data?.creditsAwarded ?? 0;
    const streakDays = streakResult?.data?.streakDays ?? 0;

    const totalCredits = DAILY_LOGIN_POINTS + streakCredits;

    return ok({
      success: true,
      data: {
        ...loginResult.data,
        date: today,
        streakDays,
        creditsAwarded: totalCredits,
      },
    });
  } catch (err: any) {
    console.error("recordDailyActivity error", err);
    return fail("Failed to record daily activity", 500, { error: err.message });
  }
});
