// supabase/functions/disableUser/index.ts
/**
 * Supabase Edge Function: disableUser
 * Purpose: Only allows the root admin account to disable another account
 * Endpoint: POST /disableUser
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

  // Actual function below

  const { email, enabled } = await req.json();
  if (!email) {
    return respond("Missing email or enable flag", 400);
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Get id from email
  const { data, error2 } =
    await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 10000,
    });

  if (error) {
    return respond(error.message, 400);
  }

  const authUser = data.users.find((u) => u.email === email);

  if (!authUser) {
    return respond("User not found", 404);
  }

  const authUserId = authUser.id;

  console.log(authUserId)

  if (enabled === false) {
    const { error: banError } =
      await supabaseAdmin.auth.admin.updateUserById(authUserId, {
        ban_duration: "876600h",
      });
      const { data, error } = await supabaseAdmin
      .from("users")
      .update({
        is_active: false
      })
      .eq("email", authUser.email)
      .select()
      .single();
    if (banError) {
      return respond(banError.message, 405);
    }
  } else if (enabled === true) {
    const { error: banError } =
      await supabaseAdmin.auth.admin.updateUserById(authUserId, {
        ban_duration: '0h',
      });
    const { data, error } = await supabaseAdmin
      .from("users")
      .update({
        is_active: true
      })
      .eq("email", authUser.email)
      .select()
      .single();
    if (banError) {
      return respond(banError.message, 406);
    }
  }

  return respond("User disabled");
});
