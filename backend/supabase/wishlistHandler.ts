// supabase/functions/wishlistHandler/index.ts
/**
 * Supabase Edge Function: wishlistHandler
 * Purpose: Manage user wishlist (GET, POST, DELETE)
 * Endpoints: 
 *   GET /wishlistHandler/{userId}
 *   POST /wishlistHandler/{userId}?courseId=xxx
 *   DELETE /wishlistHandler/{userId}?courseId=xxx or /wishlistHandler/{userId}/{courseId}
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
};

function ok(payload: any) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function created(payload: any) {
  return new Response(JSON.stringify(payload), {
    status: 201,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function badRequest(msg: string) {
  return new Response(
    JSON.stringify({ success: false, message: msg }),
    {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

function notFound(msg: string) {
  return new Response(
    JSON.stringify({ success: false, message: msg }),
    {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

function serverError(error: any) {
  return new Response(
    JSON.stringify({
      success: false,
      message: "Internal Server Error",
      error: error?.message,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    }),
    {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
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
    
    // Extract userId from path: /wishlistHandler/{userId} or /wishlistHandler/{userId}/{courseId}
    const pathParts = url.pathname.split('/').filter(Boolean);
    const userId = pathParts[pathParts.length - 2] === 'wishlistHandler' 
      ? pathParts[pathParts.length - 1] 
      : pathParts[pathParts.length - 2];
    
    // courseId might be in path (for DELETE) or query parameter (for POST/DELETE)
    const courseIdParam = pathParts[pathParts.length - 1] !== userId && pathParts[pathParts.length - 1] !== 'wishlistHandler'
      ? pathParts[pathParts.length - 1]
      : null;
    const courseIdQueryParam = url.searchParams.get('courseId');

    if (!userId || userId === 'wishlistHandler') {
      return badRequest("User ID is required");
    }

    console.log('Wishlist request:', { method: req.method, userId, courseIdParam, courseIdQueryParam });

    // ===================================================
    // ROUTE: GET /wishlistHandler/{userId}
    // ===================================================
    if (req.method === "GET" && !courseIdParam) {
      const { data: wishlistItems, error: wishlistError } = await supabaseClient
        .from('course_wishlist')
        .select(`
          created_at,
          courses!inner ( 
            id,
            title,
            description,
            instructor_name,
            duration_hours,
            thumbnail_url,
            rating,
            total_ratings,
            student_count,
            tags,
            is_published,
            categories (
              name,
              color
            )
          )
        `)
        .eq('user_id', userId)
        .eq('courses.is_published', true) 
        .order('created_at', { ascending: false });

      if (wishlistError) throw wishlistError;

      // Format response to match Lambda structure
      const courses = (wishlistItems || []).map((item: any) => ({
        courseid: item.courses.id,
        title: item.courses.title,
        description: item.courses.description,
        instructor_name: item.courses.instructor_name,
        duration_hours: item.courses.duration_hours,
        thumbnail_url: item.courses.thumbnail_url,
        rating: item.courses.rating,
        total_ratings: item.courses.total_ratings,
        student_count: item.courses.student_count,
        tags: item.courses.tags,
        category_name: item.courses.categories?.name,
        category_color: item.courses.categories?.color,
        added_at: item.created_at
      }));

      const payload = {
        success: true,
        message: "Wishlist retrieved successfully",
        data: {
          courses,
          count: courses.length,
          meta: {
            timestamp: new Date().toISOString(),
            requestId: crypto.randomUUID()
          }
        }
      };

      return ok(payload);
    }

    // ===================================================
    // ROUTE: POST /wishlistHandler/{userId}?courseId=xxx
    // ===================================================
    if (req.method === "POST" && courseIdQueryParam) {
      // Validate course exists
      const { data: course, error: courseError } = await supabaseClient
        .from('courses')
        .select('id')
        .eq('id', courseIdQueryParam)
        .eq('is_published', true)
        .single();

      if (courseError || !course) {
        return notFound("Course not found or not published");
      }

      // Check if already in wishlist
      const { data: existing } = await supabaseClient
        .from('course_wishlist')
        .select('id')
        .eq('user_id', userId)
        .eq('course_id', courseIdQueryParam)
        .single();

      if (existing) {
        return ok({
          success: true,
          message: "Course already in wishlist.",
        });
      }

      // Insert into wishlist
      const { data: wishlistItem, error: insertError } = await supabaseClient
        .from('course_wishlist')
        .insert({
          user_id: userId,
          course_id: courseIdQueryParam
        })
        .select()
        .single();

      if (insertError) throw insertError;

      return created({
        success: true,
        message: "Course added to wishlist successfully.",
        data: wishlistItem,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID()
        }
      });
    }

    // ===================================================
    // ROUTE: DELETE /wishlistHandler/{userId}/{courseId} or ?courseId=xxx
    // ===================================================
    if (req.method === "DELETE" && (courseIdQueryParam || courseIdParam)) {
      const courseId = courseIdParam || courseIdQueryParam;
      console.log("Attempting to delete wishlist entry:", { userId, courseId });

      // Check if exists
      const { data: checkResult } = await supabaseClient
        .from('course_wishlist')
        .select('id, user_id, course_id')
        .eq('user_id', userId)
        .eq('course_id', courseId);

      console.log("Pre-delete check result:", checkResult);

      // Delete from wishlist
      const { data: deletedRows, error: deleteError } = await supabaseClient
        .from('course_wishlist')
        .delete()
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .select('id');

      if (deleteError) throw deleteError;

      console.log("Delete result:", deletedRows);

      if (deletedRows && deletedRows.length > 0) {
        return ok({
          success: true,
          message: "Course removed from wishlist successfully.",
          affectedRowIds: deletedRows.map((r: any) => r.id)
        });
      } else {
        return ok({
          success: true,
          message: "Course not found in wishlist or already removed.",
          affectedRowIds: [],
        });
      }
    }

    // ===================================================
    // If route not matched
    // ===================================================
    return notFound("Route not found");

  } catch (error) {
    console.error("Wishlist handler error:", error);
    return serverError(error);
  }
});
