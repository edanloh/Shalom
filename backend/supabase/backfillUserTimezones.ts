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
    const { data: users, error: usersErr } = await supabase
      .from("users")
      .select("id")
      .eq("is_active", true);
    if (usersErr) throw usersErr;

    const userIds = (users ?? []).map((row) => row.id);
    if (!userIds.length) return ok({ success: true, data: { inserted: 0 } });

    const { data: prefs, error: prefErr } = await supabase
      .from("user_preferences")
      .select("user_id")
      .in("user_id", userIds);
    if (prefErr && prefErr.code !== "PGRST116") throw prefErr;

    const existing = new Set((prefs ?? []).map((row) => row.user_id));
    const missing = userIds.filter((id) => !existing.has(id));
    if (!missing.length) return ok({ success: true, data: { inserted: 0 } });

    const rows = missing.map((userId) => ({
      user_id: userId,
      timezone: "UTC",
    }));

    const { error: insertErr } = await supabase.from("user_preferences").insert(rows);
    if (insertErr) throw insertErr;

    return ok({ success: true, data: { inserted: rows.length } });
  } catch (err: any) {
    console.error("backfillUserTimezones error", err);
    return fail("Failed to backfill user preferences", 500, { error: err.message });
  }
});
