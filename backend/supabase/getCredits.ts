// supabase/functions/getCredits/index.ts
/**
 * Supabase Edge Function: getCredits
 * Purpose: Get user's credit balance
 * Endpoint: GET /getCredits?userId={userId}
 * Database: PostgreSQL (Supabase compatible)
 */

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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return fail("Method not allowed", 405);

  try {
    const body = await req.json();
    const event = {
      user_id: body.userId || "anon",
      type: body.type || "generic",
      title: body.title || "Credit event",
      points: Number(body.points) || 0,
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
        const { data: balRow, error: balErr } = await supabase
          .from("credits_balance")
          .select("balance")
          .eq("user_id", event.user_id)
          .single();

        if (balErr && balErr.code !== "PGRST116") throw balErr;

        return ok({
          success: true,
          data: { balance: balRow?.balance ?? 0, event, duplicate: true },
        });
      }
    }

    // Insert event
    const { error: insertErr } = await supabase.from("credits_events").insert(event);
    if (insertErr) throw insertErr;

    // Update balance
    const { data: balRow } = await supabase
      .from("credits_balance")
      .select("balance")
      .eq("user_id", event.user_id)
      .single();

    const newBalance = (balRow?.balance ?? 0) + event.points;

    const { error: upsertErr } = await supabase.from("credits_balance").upsert({
      user_id: event.user_id,
      balance: newBalance,
      last_updated: new Date().toISOString(),
    });
    if (upsertErr) throw upsertErr;

    return ok({ success: true, data: { balance: newBalance, event } });
  } catch (err: any) {
    console.error("postCreditEvent error", err);
    return fail("Failed to record credit event", 500, { error: err.message });
  }
});
