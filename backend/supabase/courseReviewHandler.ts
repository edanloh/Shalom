// supabase/functions/courseReviewHandler/index.ts
/**
 * Supabase Edge Function: courseReviewHandler
 * Purpose: Add or update course reviews/ratings
 * Endpoints:
 *   POST /courseReviewHandler/{courseId} - Add a new review
 *   PUT /courseReviewHandler/{courseId}  - Update existing review
 * 
 * Request Body:
 * {
 *   "userId": "uuid",
 *   "rating": 1-5,
 *   "review": "Review text",
 *   "isAnonymous": true/false
 * }
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST,PUT,OPTIONS',
};

function badRequest(msg: string) {
  return new Response(
    JSON.stringify({ success: false, message: msg }),
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

function notFound(msg: string) {
  return new Response(
    JSON.stringify({ success: false, message: msg }),
    { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

function conflict(msg: string) {
  return new Response(
    JSON.stringify({ success: false, message: msg }),
    { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    
    // Extract courseId from path: /courseReviewHandler/{courseId}
    const pathParts = url.pathname.split('/').filter(Boolean);
    const courseId = pathParts[pathParts.length - 1];

    if (!courseId || courseId === 'courseReviewHandler') {
      return badRequest("courseId is required in path");
    }

    // Parse body
    let body;
    try {
      body = await req.json();
    } catch {
      return badRequest("Invalid JSON body");
    }

    const userId = (body.userId ?? "").toString().trim();
    const rating = Number(body.rating);
    const review = (body.review ?? "").toString().trim();
    const isAnonymous = !!body.isAnonymous;

    if (!userId) return badRequest("userId is required");
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return badRequest("rating must be an integer 1–5");
    }
    if (review.length === 0) return badRequest("review text is required");

    console.log('Course review request:', { method: req.method, courseId, userId, rating, isAnonymous });

    // Ensure user exists
    const { data: user, error: userError } = await supabaseClient
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return notFound("User not found");
    }

    // Ensure course exists
    const { data: course, error: courseError } = await supabaseClient
      .from('courses')
      .select('id')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      return notFound("Course not found");
    }

    // ===================================================
    // ROUTE: POST - Add new review
    // ===================================================
    if (req.method === "POST") {
      // Enforce one-review-per-user-per-course
      const { data: existing, error: checkError } = await supabaseClient
        .from('course_ratings')
        .select('id')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .single();

      if (existing && !checkError) {
        return conflict("You have already reviewed this course.");
      }

      // Insert new review
      const { data: newReview, error: insertError } = await supabaseClient
        .from('course_ratings')
        .insert({
          user_id: userId,
          course_id: courseId,
          rating: rating,
          review: review,
          is_anonymous: isAnonymous,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      // Get full review details with user info
      const { data: reviewDetails, error: detailsError } = await supabaseClient
        .from('course_ratings')
        .select(`
          id,
          rating,
          review,
          created_at,
          is_anonymous,
          users (
            name,
            avatar_url
          )
        `)
        .eq('id', newReview.id)
        .single();

      if (detailsError) throw detailsError;

      const payload = {
        id: reviewDetails.id,
        rating: Number(reviewDetails.rating),
        review: reviewDetails.review,
        createdAt: reviewDetails.created_at,
        reviewerName: reviewDetails.is_anonymous ? "Anonymous" : (reviewDetails.users?.name || "Anonymous"),
        reviewerAvatar: reviewDetails.is_anonymous ? null : (reviewDetails.users?.avatar_url ?? null),
      };

      return new Response(
        JSON.stringify({
          success: true,
          message: "Review added",
          data: payload,
          meta: { timestamp: new Date().toISOString() }
        }),
        {
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // ===================================================
    // ROUTE: PUT - Update existing review
    // ===================================================
    if (req.method === "PUT") {
      // Update existing review
      const { data: updated, error: updateError } = await supabaseClient
        .from('course_ratings')
        .update({
          rating: rating,
          review: review,
          is_anonymous: isAnonymous,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .select('id')
        .single();

      if (updateError && updateError.code === 'PGRST116') {
        return notFound("No existing review to update");
      }

      if (updateError) throw updateError;

      // Get full review details with user info
      const { data: reviewDetails, error: detailsError } = await supabaseClient
        .from('course_ratings')
        .select(`
          id,
          rating,
          review,
          created_at,
          is_anonymous,
          users (
            name,
            avatar_url
          )
        `)
        .eq('id', updated.id)
        .single();

      if (detailsError) throw detailsError;

      const payload = {
        id: reviewDetails.id,
        rating: Number(reviewDetails.rating),
        review: reviewDetails.review,
        createdAt: reviewDetails.created_at,
        reviewerName: reviewDetails.is_anonymous ? "Anonymous" : (reviewDetails.users?.name || "Anonymous"),
        reviewerAvatar: reviewDetails.is_anonymous ? null : (reviewDetails.users?.avatar_url ?? null),
      };

      return new Response(
        JSON.stringify({
          success: true,
          message: "Review updated",
          data: payload,
          meta: { timestamp: new Date().toISOString() }
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Any other verb → 405
    return new Response(
      JSON.stringify({ success: false, message: "Method Not Allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error("Review handler error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        message: "Failed to process review",
        error: error?.message || String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});