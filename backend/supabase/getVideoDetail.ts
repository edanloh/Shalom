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
    // 1. Try to fetch from course_videos first
    // ========================================
    let { data: video, error: videoError } = await supabaseClient
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
          title,
          instructor_name
        ),
        course_sections (
          id,
          title
        )
      `)
      .eq('id', videoId)
      .single();

    // ========================================
    // 2. If not found in videos, try course_resources (PDFs)
    // ========================================
    let lessonType = 'video';
    let pdfResource = null;
    
    if (videoError || !video) {
      const { data: resource, error: resourceError } = await supabaseClient
        .from('course_resources')
        .select(`
          id,
          title,
          description,
          resource_url,
          file_size_bytes,
          thumbnail_url,
          is_preview,
          is_downloadable,
          order_index,
          course_id,
          section_id,
          courses (
            id,
            title,
            instructor_name
          ),
          course_sections (
            id,
            title
          )
        `)
        .eq('id', videoId)
        .in('resource_type', ['pdf', 'document', 'ppt'])
        .single();

      if (resourceError || !resource) {
        return new Response(
          JSON.stringify({
            success: false,
            message: "Lesson not found"
          }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Convert resource to video-like structure for compatibility
      pdfResource = resource;
      lessonType = 'pdf';
      video = {
        id: resource.id,
        title: resource.title,
        description: resource.description,
        resource_url: resource.resource_url,
        file_size_bytes: resource.file_size_bytes,
        is_downloadable: resource.is_downloadable,
        thumbnail_url: resource.thumbnail_url,
        is_preview: resource.is_preview,
        order_index: resource.order_index,
        course_id: resource.course_id,
        section_id: resource.section_id,
        courses: resource.courses,
        course_sections: resource.course_sections,
      };
    }

    // ========================================
    // 3. Fetch navigation (all items in same section - videos, PDFs, and quizzes)
    // ========================================
    const { data: allVideos, error: videoNavError } = await supabaseClient
      .from('course_videos')
      .select('id, title, order_index')
      .eq('section_id', video.section_id)
      .eq('course_id', video.course_id)
      .order('order_index', { ascending: true });

    const { data: allResources, error: resourceNavError } = await supabaseClient
      .from('course_resources')
      .select('id, title, order_index')
      .eq('section_id', video.section_id)
      .eq('course_id', video.course_id)
      .in('resource_type', ['pdf', 'document', 'ppt'])
      .order('order_index', { ascending: true });

    const { data: allQuizzes, error: quizNavError } = await supabaseClient
      .from('course_quizzes')
      .select('id, title, order_index')
      .eq('section_id', video.section_id)
      .eq('course_id', video.course_id)
      .order('order_index', { ascending: true });

    if (videoNavError) throw videoNavError;
    if (resourceNavError) throw resourceNavError;
    if (quizNavError) throw quizNavError;

    // Combine and sort all items by order_index
    const allItems = [
      ...(allVideos || []).map((v: any) => ({ ...v, type: 'video' })),
      ...(allResources || []).map((r: any) => ({ ...r, type: 'pdf' })),
      ...(allQuizzes || []).map((q: any) => ({ ...q, type: 'quiz' }))
    ].sort((a, b) => a.order_index - b.order_index);

    console.log('All items in section:', allItems.map((i: any) => ({ id: i.id, title: i.title, type: i.type, order: i.order_index })));

    const currentIndex = allItems.findIndex((item: any) => item.id === videoId);
    
    const previousVideo = currentIndex > 0 
      ? { 
          id: allItems[currentIndex - 1].id, 
          title: allItems[currentIndex - 1].title,
          type: allItems[currentIndex - 1].type
        }
      : null;
    
    const nextVideo = currentIndex < allItems.length - 1
      ? { 
          id: allItems[currentIndex + 1].id, 
          title: allItems[currentIndex + 1].title,
          type: allItems[currentIndex + 1].type
        }
      : null;

    // ========================================
    // 4. Fetch user progress if userId provided
    // ========================================
    let userProgress = null;
    
    if (userId) {
      try {
        const { data: progress, error: progressError } = await supabaseClient
          .from('user_video_progress')
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
    // 5. Build response data
    // ========================================
    const responseData = {
      id: video.id,
      title: video.title,
      description: video.description,
      type: lessonType,
      video_url: lessonType === 'video' ? video.video_url : undefined,
      resource_url: lessonType === 'pdf' ? video.resource_url : undefined,
      file_size_bytes: lessonType === 'pdf' ? video.file_size_bytes : undefined,
      is_downloadable: lessonType === 'pdf' ? video.is_downloadable : undefined,
      duration_seconds: lessonType === 'video' ? video.duration_seconds : undefined,
      thumbnail_url: video.thumbnail_url,
      is_preview: video.is_preview,
      order_index: video.order_index,
      course: {
        id: video.courses.id,
        title: video.courses.title,
        instructor_name: video.courses.instructor_name
      },
      section: {
        id: video.course_sections.id,
        title: video.course_sections.title
      },
      sectionVideos: allItems || [],
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