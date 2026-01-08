// supabase/functions/toggleUserEnabled/index.ts
/**
 * Supabase Edge Function: toggleUserEnabled
 * Purpose: Enable or disable a user account
 * Endpoint: POST /toggleUserEnabled
 * 
 * Request Body:
 * {
 *   "email": "user@example.com",
 *   "enabled": true/false
 * }
 * 
 * Note: In Supabase, user authentication is managed through Supabase Auth,
 * not Cognito. This function updates the user's status in both Supabase Auth
 * and the users table.
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key (has admin privileges)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Parse body
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { email, enabled } = body;

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (typeof enabled !== "boolean") {
      return new Response(
        JSON.stringify({
          error: "enabled field must be a boolean (true or false)"
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Toggle user enabled for: ${email}, enabled: ${enabled}`);

    // 🔍 Step 1: Find user by email in Supabase Auth
    const { data: authUsers, error: listError } = await supabaseClient.auth.admin.listUsers();

    if (listError) {
      throw listError;
    }

    const authUser = authUsers.users.find((u: any) => u.email === email);

    if (!authUser) {
      return new Response(
        JSON.stringify({ error: `User with email ${email} not found` }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Found user: ${authUser.id} for email: ${email}`);

    // 🔧 Step 2: Update user status in Supabase Auth
    // In Supabase, we can't directly "disable" a user like in Cognito,
    // but we can update their banned_until field or use custom user metadata
    const { data: updatedAuthUser, error: updateAuthError } = await supabaseClient.auth.admin.updateUserById(
      authUser.id,
      {
        // Set banned_until to a far future date if disabling, null if enabling
        ban_duration: enabled ? 'none' : '876000h', // 100 years if disabled
        user_metadata: {
          is_active: enabled
        }
      }
    );

    if (updateAuthError) {
      throw updateAuthError;
    }

    const action = enabled ? "enabled" : "disabled";
    console.log(`Successfully ${action} user in Supabase Auth: ${authUser.id}`);

    // 🗄️ Step 3: Update database (users table)
    const { data: dbUser, error: dbError } = await supabaseClient
      .from('users')
      .update({
        is_active: enabled,
        updated_at: new Date().toISOString()
      })
      .eq('email', email)
      .select('id, email, is_active')
      .single();

    if (dbError && dbError.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Database update error:', dbError);
      throw dbError;
    }

    const databaseUpdated = !dbError && dbUser !== null;

    if (!databaseUpdated) {
      console.warn(`User ${email} updated in Supabase Auth but not found in database`);
    } else {
      console.log(`Successfully updated database for user: ${email}`, dbUser);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `User ${email} has been ${action}`,
        email,
        userId: authUser.id,
        enabled,
        databaseUpdated,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error("Error toggling user enabled status:", error);

    let statusCode = 500;
    let errorMessage = "Internal server error";

    if (error.message?.includes('not found')) {
      statusCode = 404;
      errorMessage = "User not found";
    } else if (error.message?.includes('permission') || error.message?.includes('authorized')) {
      statusCode = 403;
      errorMessage = "Not authorized to perform this action";
    } else if (error.message) {
      errorMessage = error.message;
    }

    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: error.message,
      }),
      {
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});