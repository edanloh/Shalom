// supabase/functions/getVideoDetail/index.ts
/**
 * Supabase Edge Function: getVideoDetail
 * Purpose: Fetch video details with navigation (prev/next) and user progress
 * Endpoint: GET /getVideoDetail/{videoId}?userId={userId}
 * Database: PostgreSQL (Supabase compatible)
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
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
    
    // Extract videoId from path: /getVideoDetail/{videoId}
    const pathParts = url.pathname.split('/').filter(Boolean);
    const videoId = pathParts[pathParts.length - 1];
    
    // Extract userId from query parameter
    const userId = url.searchParams.get('userId');

    if (!videoId || videoId === 'getVideoDetail') {
      return new Response(
        JSON.stringify({
          success: false,
          message: "videoId is required"
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Fetching video details:', { videoId, userId });

    // ========================================
    // 1. Fetch video details with course and section info
    // ========================================
    const { data: video, error: videoError } = await supabaseClient
      .from('course_videos')
      .select(`
        id,
        title,
        description,
        video_url,
        duration_seconds,
        thumbnail_url,
        is_preview,
        order_index,
        course_id,
        section_id,
        courses (
          id,
          title
        ),
        course_sections (
          id,
          title
        )
      `)
      .eq('id', videoId)
      .single();

    if (videoError || !video) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Video not found"
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // ========================================
    // 2. Fetch navigation (previous and next videos in same section)
    // ========================================
    const { data: allVideos, error: navigationError } = await supabaseClient
      .from('course_videos')
      .select('id, title, order_index')
      .eq('section_id', video.section_id)
      .eq('course_id', video.course_id)
      .order('order_index', { ascending: true });

    if (navigationError) throw navigationError;

    const currentIndex = (allVideos || []).findIndex((v: any) => v.id === videoId);
    
    const previousVideo = currentIndex > 0 
      ? { 
          id: allVideos[currentIndex - 1].id, 
          title: allVideos[currentIndex - 1].title 
        }
      : null;
    
    const nextVideo = currentIndex < (allVideos?.length || 0) - 1
      ? { 
          id: allVideos[currentIndex + 1].id, 
          title: allVideos[currentIndex + 1].title 
        }
      : null;

    // ========================================
    // 3. Fetch user progress if userId provided
    // ========================================
    let userProgress = null;
    
    if (userId) {
      try {
        const { data: progress, error: progressError } = await supabaseClient
          .from('video_progress')
          .select(`
            watch_time_seconds,
            is_completed,
            last_position_seconds,
            completed_at,
            updated_at
          `)
          .eq('user_id', userId)
          .eq('video_id', videoId)
          .single();

        if (!progressError && progress) {
          userProgress = progress;
        }
      } catch (progressError) {
        console.error('Error fetching user progress:', progressError);
        // Continue without progress data
      }
    }

    // ========================================
    // 4. Construct response
    // ========================================
    const responseData = {
      id: video.id,
      title: video.title,
      description: video.description,
      video_url: video.video_url,
      duration_seconds: video.duration_seconds,
      thumbnail_url: video.thumbnail_url,
      is_preview: video.is_preview,
      course: {
        id: video.courses.id,
        title: video.courses.title
      },
      section: {
        id: video.course_sections.id,
        title: video.course_sections.title
      },
      navigation: {
        previousVideo,
        nextVideo
      },
      userProgress
    };

    return new Response(
      JSON.stringify({
        success: true,
        message: "Video details retrieved successfully",
        data: responseData
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error("Error retrieving video details:", error);

    return new Response(
      JSON.stringify({
        success: false,
        message: "An error occurred while retrieving video details",
        error: error.message || "Unknown error"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});