// supabase/functions/pushNotificationHandler/index.ts
/**
 * Supabase Edge Function: pushNotificationHandler
 * Purpose: Handle push notification token registration
 * Endpoints:
 *   POST /pushNotificationHandler/register   - Register a push token for a user
 *   POST /pushNotificationHandler/unregister - Remove a push token for a user
 * 
 * Database Table: push_notification_tokens
 * Schema:
 * - user_id (UUID, Primary Key)
 * - tokens (TEXT[]) - Array of push tokens for this user
 * - updated_at (TIMESTAMPTZ)
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

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: "Method Not Allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    // Create Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    const path = url.pathname;

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

    const { userId, pushToken } = body;

    if (!userId || !pushToken) {
      return new Response(
        JSON.stringify({ error: "userId and pushToken are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Push notification request:', { path, userId, pushToken: pushToken.substring(0, 20) + '...' });

    // ===================================================
    // ROUTE: POST /pushNotificationHandler/register
    // ===================================================
    if (path.includes("/register")) {
      // Check if user already has tokens
      const { data: existing, error: fetchError } = await supabaseClient
        .from('push_notification_tokens')
        .select('tokens')
        .eq('user_id', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = not found
        throw fetchError;
      }

      let updatedTokens = [pushToken];

      if (existing && existing.tokens) {
        // Add token to existing set (avoid duplicates)
        const tokenSet = new Set([...existing.tokens, pushToken]);
        updatedTokens = Array.from(tokenSet);
      }

      // Upsert the tokens
      const { error: upsertError } = await supabaseClient
        .from('push_notification_tokens')
        .upsert({
          user_id: userId,
          tokens: updatedTokens,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (upsertError) throw upsertError;

      return new Response(
        JSON.stringify({ message: "Push token registered successfully" }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // ===================================================
    // ROUTE: POST /pushNotificationHandler/unregister
    // ===================================================
    if (path.includes("/unregister")) {
      // Get current tokens
      const { data: existing, error: fetchError } = await supabaseClient
        .from('push_notification_tokens')
        .select('tokens')
        .eq('user_id', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (!existing || !existing.tokens) {
        return new Response(
          JSON.stringify({ message: "No tokens found for user" }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Remove the token from the array
      const updatedTokens = existing.tokens.filter((t: string) => t !== pushToken);

      if (updatedTokens.length === 0) {
        // Delete the entire record if no tokens left
        const { error: deleteError } = await supabaseClient
          .from('push_notification_tokens')
          .delete()
          .eq('user_id', userId);

        if (deleteError) throw deleteError;
      } else {
        // Update with remaining tokens
        const { error: updateError } = await supabaseClient
          .from('push_notification_tokens')
          .update({
            tokens: updatedTokens,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);

        if (updateError) throw updateError;
      }

      return new Response(
        JSON.stringify({ message: "Push token removed successfully" }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "Endpoint not found" }),
      {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error("Error handling push token:", error);

    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});