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
  'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
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

async function updateCourseRatingOnCreate(
  supabaseClient: any,
  courseId: string,
  newRating: number
) {
  const { data: courseRow, error } = await supabaseClient
    .from('courses')
    .select('rating, total_ratings')
    .eq('id', courseId)
    .single();
  if (error) throw error;

  const prevCount = Number(courseRow?.total_ratings ?? 0);
  const prevRating = Number(courseRow?.rating ?? 0);
  const nextCount = prevCount + 1;
  const nextAvg = nextCount > 0 ? (prevRating * prevCount + newRating) / nextCount : newRating;

  const { error: updateError } = await supabaseClient
    .from('courses')
    .update({ rating: Number(nextAvg.toFixed(2)), total_ratings: nextCount })
    .eq('id', courseId);
  if (updateError) throw updateError;
}

async function updateCourseRatingOnUpdate(
  supabaseClient: any,
  courseId: string,
  previousRating: number,
  newRating: number
) {
  const { data: courseRow, error } = await supabaseClient
    .from('courses')
    .select('rating, total_ratings')
    .eq('id', courseId)
    .single();
  if (error) throw error;

  const count = Number(courseRow?.total_ratings ?? 0);
  if (count <= 0) return;
  const prevAvg = Number(courseRow?.rating ?? 0);
  const nextAvg = (prevAvg * count - previousRating + newRating) / count;

  const { error: updateError } = await supabaseClient
    .from('courses')
    .update({ rating: Number(nextAvg.toFixed(2)) })
    .eq('id', courseId);
  if (updateError) throw updateError;
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

    if (!["GET", "POST", "PUT"].includes(req.method)) {
      return new Response(
        JSON.stringify({ success: false, message: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method === "GET") {
      const userId = (url.searchParams.get("userId") ?? "").toString().trim();
      if (!userId) return badRequest("userId is required");

      const { data: reviewDetails, error: reviewError } = await supabaseClient
        .from('course_ratings')
        .select(`
          id,
          rating,
          review,
          created_at,
          is_anonymous,
          reviewer:users!course_ratings_user_id_fkey (
            name,
            avatar_url
          )
        `)
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .maybeSingle();

      if (reviewError) throw reviewError;
      if (!reviewDetails) {
        return new Response(
          JSON.stringify({ success: true, data: null }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const payload = {
        id: reviewDetails.id,
        rating: Number(reviewDetails.rating),
        review: reviewDetails.review,
        createdAt: reviewDetails.created_at,
        reviewerName: reviewDetails.is_anonymous ? "Anonymous" : (reviewDetails.reviewer?.name || "Anonymous"),
        reviewerAvatar: reviewDetails.is_anonymous ? null : (reviewDetails.reviewer?.avatar_url ?? null),
      };

      return new Response(
        JSON.stringify({ success: true, data: payload }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
    const contextSectionId = (body.contextSectionId ?? body.sectionId ?? "")
      .toString()
      .trim();

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
      let normalizedContextSectionId: string | null = null;
      if (contextSectionId) {
        const { data: section, error: sectionError } = await supabaseClient
          .from("course_sections")
          .select("id,course_id")
          .eq("id", contextSectionId)
          .eq("course_id", courseId)
          .single();
        if (!sectionError && section?.id) {
          normalizedContextSectionId = String(section.id);
        }
      }

      const { data: newReview, error: insertError } = await supabaseClient
        .from('course_ratings')
        .insert({
          user_id: userId,
          course_id: courseId,
          context_section_id: normalizedContextSectionId,
          rating: rating,
          review: review,
          is_anonymous: isAnonymous,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      await updateCourseRatingOnCreate(supabaseClient, courseId, rating);

      // Get full review details with user info
      const { data: reviewDetails, error: detailsError } = await supabaseClient
        .from('course_ratings')
        .select(`
          id,
          rating,
          review,
          created_at,
          is_anonymous,
          reviewer:users!course_ratings_user_id_fkey (
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
        reviewerName: reviewDetails.is_anonymous ? "Anonymous" : (reviewDetails.reviewer?.name || "Anonymous"),
        reviewerAvatar: reviewDetails.is_anonymous ? null : (reviewDetails.reviewer?.avatar_url ?? null),
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
      const { data: existingReview, error: existingReviewError } = await supabaseClient
        .from('course_ratings')
        .select('rating')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .single();
      if (existingReviewError && existingReviewError.code === 'PGRST116') {
        return notFound("No existing review to update");
      }
      if (existingReviewError) throw existingReviewError;
      const previousRating = Number(existingReview?.rating ?? rating);

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

      await updateCourseRatingOnUpdate(supabaseClient, courseId, previousRating, rating);

      // Get full review details with user info
      const { data: reviewDetails, error: detailsError } = await supabaseClient
        .from('course_ratings')
        .select(`
          id,
          rating,
          review,
          created_at,
          is_anonymous,
          reviewer:users!course_ratings_user_id_fkey (
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
        reviewerName: reviewDetails.is_anonymous ? "Anonymous" : (reviewDetails.reviewer?.name || "Anonymous"),
        reviewerAvatar: reviewDetails.is_anonymous ? null : (reviewDetails.reviewer?.avatar_url ?? null),
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
