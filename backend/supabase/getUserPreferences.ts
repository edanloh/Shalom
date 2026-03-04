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
  if (req.method !== "GET") return fail("Method not allowed", 405);

  const url = new URL(req.url);
  const user_id = url.searchParams.get("user_id");

  if (!user_id) return fail("Missing user_id query parameter", 400);

  try {
    const { data, error } = await supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", user_id)
      .single(); // return single row

    if (error) {
      if (error.code === "PGRST116") {
        // Row not found
        return fail("User preferences not found", 404);
      }
      throw error;
    }

    return ok(data);
  } catch (err: any) {
    console.error("getUserPreferences error", err);
    return fail("Failed to get user preferences", 500, { error: err.message });
  }
});
