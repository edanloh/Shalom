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

const ok = (data: unknown, status = 200) =>
  new Response(JSON.stringify({ success: true, data }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const fail = (message: string, status = 500, extra: Record<string, unknown> = {}) =>
  new Response(JSON.stringify({ success: false, message, ...extra }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return fail("Method not allowed", 405);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body", 400);
  }

  const { user_id, preference } = body;

  if (!user_id || !preference) {
    return fail("user_id and preference are required", 400);
  }

  let prefObj: Record<string, boolean>;
  try {
    // Parse JSON string into an object
    prefObj = JSON.parse(preference);

    // Validate that all values are booleans
    for (const key in prefObj) {
      if (typeof prefObj[key] !== "boolean") {
        return fail(`Preference value for "${key}" must be a boolean`);
      }
    }
  } catch (err) {
    return fail("Failed to parse preference JSON", 400, { error: err.message });
  }

  try {
    // Upsert user_preferences: create new row if it doesn't exist
    const { data, error } = await supabase
      .from("user_preferences")
      .upsert(
        { user_id, ...prefObj }, // spread parsed preferences
        { onConflict: "user_id" } // update if exists, insert if not
      )
      .select(); // return the updated or inserted row

    if (error) throw error;

    return ok(data); // response format: { success: true, data: [...] }
  } catch (err: any) {
    console.error("setUserPreference error", err);
    return fail("Failed to set user preference", 500, { error: err.message });
  }
});
