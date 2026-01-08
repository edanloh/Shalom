// supabase/functions/courseReviewHandler/index.ts
/**
 * Supabase Edge Function: courseReviewHandler
 * Purpose: Handle course reviews (GET for fetching, POST for creating, PUT for updating)
 * Endpoint: GET/POST/PUT /courseReviewHandler/{courseId}
 * Database: PostgreSQL (Supabase compatible)
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
};

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
      return new Response(
        JSON.stringify({ success: false, message: "Course ID is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Verify course exists
    const { data: course, error: courseError } = await supabaseClient
      .from('courses')
      .select('id')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      return new Response(
        JSON.stringify({ success: false, message: "Course not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (req.method === 'GET') {
      // Get reviews for the course
      const userId = url.searchParams.get('userId');

      let query = supabaseClient
        .from('course_ratings')
        .select(`
          id,
          rating,
          review,
          is_anonymous,
          created_at,
          users!inner(name, avatar_url)
        `)
        .eq('course_id', courseId);

      if (userId) {
        // Get specific user's review
        query = query.eq('user_id', userId);
      }

      query = query.order('created_at', { ascending: false });

      const { data: reviews, error } = await query;

      if (error) {
        console.error('Error fetching reviews:', error);
        return new Response(
          JSON.stringify({ success: false, message: "Failed to fetch reviews" }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const formattedReviews = reviews.map(review => ({
        id: review.id,
        rating: review.rating,
        review: review.review,
        createdAt: review.created_at,
        reviewerName: review.is_anonymous ? 'Anonymous' : review.users.name,
        reviewerAvatar: review.is_anonymous ? null : review.users.avatar_url,
      }));

      const responseData = userId ? (formattedReviews[0] || null) : formattedReviews;

      return new Response(
        JSON.stringify({ success: true, data: responseData }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (req.method === 'POST' || req.method === 'PUT') {
      // Create or update review
      const body = await req.json();
      const userId = body.userId;
      const rating = body.rating;
      const review = body.review;
      const isAnonymous = body.isAnonymous || false;

      if (!userId) {
        return new Response(
          JSON.stringify({ success: false, message: "userId is required" }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return new Response(
          JSON.stringify({ success: false, message: "rating must be an integer 1–5" }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      if (!review || review.trim().length === 0) {
        return new Response(
          JSON.stringify({ success: false, message: "review text is required" }),
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

      let result;
      if (req.method === 'POST') {
        // Check if already reviewed
        const { data: existing, error: checkError } = await supabaseClient
          .from('course_ratings')
          .select('id')
          .eq('user_id', userId)
          .eq('course_id', courseId)
          .single();

        if (existing) {
          return new Response(
            JSON.stringify({ success: false, message: "You have already reviewed this course" }),
            {
              status: 409,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        // Insert new review
        const { data, error } = await supabaseClient
          .from('course_ratings')
          .insert({
            user_id: userId,
            course_id: courseId,
            rating,
            review: review.trim(),
            is_anonymous: isAnonymous,
          })
          .select(`
            id,
            rating,
            review,
            is_anonymous,
            created_at,
            users!inner(name, avatar_url)
          `)
          .single();

        result = { data, error };
      } else {
        // Update existing review
        const { data, error } = await supabaseClient
          .from('course_ratings')
          .update({
            rating,
            review: review.trim(),
            is_anonymous: isAnonymous,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .eq('course_id', courseId)
          .select(`
            id,
            rating,
            review,
            is_anonymous,
            created_at,
            users!inner(name, avatar_url)
          `)
          .single();

        result = { data, error };
      }

      if (result.error) {
        console.error('Error saving review:', result.error);
        return new Response(
          JSON.stringify({ success: false, message: "Failed to save review" }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const reviewData = result.data;
      const responseData = {
        id: reviewData.id,
        rating: reviewData.rating,
        review: reviewData.review,
        createdAt: reviewData.created_at,
        reviewerName: reviewData.is_anonymous ? 'Anonymous' : reviewData.users.name,
        reviewerAvatar: reviewData.is_anonymous ? null : reviewData.users.avatar_url,
      };

      return new Response(
        JSON.stringify({
          success: true,
          message: req.method === 'POST' ? "Review posted successfully" : "Review updated successfully",
          data: responseData
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: false, message: "Method Not Allowed" }),
      {
        status: 405,
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