// supabase/functions/postCreditEvent/index.ts
/**
 * Supabase Edge Function: postCreditEvent
 * Purpose: Record credit events and update user points
 * Endpoint: POST /postCreditEvent
 * Database: PostgreSQL (Supabase compatible)
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
      JSON.stringify({ success: false, message: "Method Not Allowed" }),
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

    const body = await req.json();
    const userId = body.userId || body.user_id;
    const type = body.type;
    const title = body.title;
    const points = body.points;
    const courseId = body.courseId || body.course_id;
    const referenceKey = body.referenceKey || body.reference_key;

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, message: "userId is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!type) {
      return new Response(
        JSON.stringify({ success: false, message: "type is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!title) {
      return new Response(
        JSON.stringify({ success: false, message: "title is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!Number.isInteger(points)) {
      return new Response(
        JSON.stringify({ success: false, message: "points must be an integer" }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Verify user exists
    const { data: user, error: userError } = await supabaseClient
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, message: "User not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Insert credit event
    const { data: event, error: eventError } = await supabaseClient
      .from('credit_events')
      .insert({
        user_id: userId,
        type,
        title,
        points,
        course_id: courseId,
        reference_key: referenceKey,
      })
      .select()
      .single();

    if (eventError) {
      console.error('Error inserting credit event:', eventError);
      return new Response(
        JSON.stringify({ success: false, message: "Failed to record credit event" }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Update user's points
    const { data: updatedUser, error: updateError } = await supabaseClient
      .from('users')
      .update({ points: supabaseClient.raw('points + ?', [points]), updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select('points')
      .single();

    if (updateError) {
      console.error('Error updating user points:', updateError);
      return new Response(
        JSON.stringify({ success: false, message: "Failed to update user points" }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Credit event recorded",
        data: {
          event: {
            id: event.id,
            userId: event.user_id,
            type: event.type,
            title: event.title,
            points: event.points,
            courseId: event.course_id,
            referenceKey: event.reference_key,
            timestamp: event.created_at,
          },
          balance: updatedUser.points,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ success: false, message: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});