// supabase/functions/getAllUsers/index.ts
/**
 * Supabase Edge Function: getUsers
 * Purpose: Get all users
 * Endpoint: GET /getAllUsers
 * Database: PostgreSQL (Supabase compatible)
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const url = new URL(req.url);

  const { data, error } = await supabase
    .from("users")
    .select("*")

  if (error) {
    return new Response(JSON.stringify({ success: false, message: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }

  return new Response(JSON.stringify({ success: true, data: data }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
