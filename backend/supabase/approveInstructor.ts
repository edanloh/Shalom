// supabase/functions/approveInstructor/index.ts
/**
 * Supabase Edge Function: approveInstructor
 * Purpose: Only allows the root admin account to set another account to instructor role
 * Endpoint: POST /approveInstructor
 * Database: PostgreSQL (Supabase compatible)
 */
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};

const respond = (body: string, status = 200) =>
  new Response(body, { status, headers: corsHeaders });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return respond("");
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return respond("Missing auth header", 401);
  }

  const supabaseUser = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    {
      global: { headers: { Authorization: authHeader } },
    }
  );

  const { data: { user }, error } = await supabaseUser.auth.getUser();
  if (error || !user) {
    return respond("Unauthorized", 401);
  }

  const { data: admin } = await supabaseUser
    .from("users")
    .select("role")
    .eq("email", user.email)
    .single();

  if (!admin || admin.role !== "admin") {
    return respond("Forbidden", 403);
  }

  const { id } = await req.json();
  if (!id) {
    return respond("Missing user id", 400);
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  await supabaseAdmin
    .from("users")
    .update({ role: "instructor" })
    .eq("id", id);

  return respond("Approved");
});
