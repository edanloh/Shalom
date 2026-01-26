// supabase/functions/getUserEnrollment/index.ts
/**
 * Supabase Edge Function: getUserEnrollment
 * Purpose: Fetch user enrollments with video/quiz progress and statistics
 * Endpoint: GET /getUserEnrollment/{userId}
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
    
    // Extract userId from path: /getUserEnrollment/{userId}
    const pathParts = url.pathname.split('/').filter(Boolean);
    const userId = pathParts[pathParts.length - 1];

    // Query parameters
    const status = url.searchParams.get("status");
    const progress_min = url.searchParams.get("progress_min");
    const progress_max = url.searchParams.get("progress_max");
    const limit = parseInt(url.searchParams.get("limit") ?? "20");
    const offset = parseInt(url.searchParams.get("offset") ?? "0");
    const sortBy = url.searchParams.get("sortBy") ?? "enrollment_date";
    const sortOrder = url.searchParams.get("sortOrder") ?? "desc";

    if (!userId || userId === 'getUserEnrollment') {
      return new Response(
        JSON.stringify({
          success: false,
          message: "User ID is required"
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Looking up enrollments for userId:', userId);

    // Validate sort parameters
    const allowedSortFields = ["enrollment_date", "progress_percentage", "completion_date"];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : "enrollment_date";
    const ascending = sortOrder.toLowerCase() !== "desc";

    // Build base query for enrollments
    let query = supabaseClient
      .from('course_enrollments')
      .select(`
        id,
        enrollment_date,
        completion_date,
        progress_percentage,
        is_completed,
        total_watch_time_minutes,
        courses!inner (
          id,
          title,
          description,
          instructor_name,
          duration_hours,
          thumbnail_url,
          rating,
          student_count,
          tags,
          categories (
            name,
            color
          )
        )
      `, { count: 'exact' })
      .eq('user_id', userId)
      .not('enrollment_date', 'is', null)
      .range(offset, offset + limit - 1)
      .order(safeSortBy, { ascending });

    // Apply status filter
    if (status === 'completed') {
      query = query.eq('is_completed', true);
    } else if (status === 'active') {
      query = query.eq('is_completed', false);
    }

    // Apply progress filters
    if (progress_min) {
      query = query.gte('progress_percentage', parseFloat(progress_min));
    }
    if (progress_max) {
      query = query.lte('progress_percentage', parseFloat(progress_max));
    }

    const { data: enrollments, error: enrollmentsError, count } = await query;

    if (enrollmentsError) {
      console.error('Enrollment query error:', enrollmentsError);
      throw enrollmentsError;
    }

    console.log('Found enrollments:', enrollments?.length || 0);

    // Get user statistics
    const { data: statsData, error: statsError } = await supabaseClient
      .from('course_enrollments')
      .select('is_completed, progress_percentage, total_watch_time_minutes')
      .eq('user_id', userId);

    if (statsError) {
      console.error('Stats query error:', statsError);
      throw statsError;
    }

    // Calculate statistics
    const totalEnrollments = statsData?.length || 0;
    const completedCourses = statsData?.filter(e => e.is_completed).length || 0;
    const averageProgress = totalEnrollments > 0
      ? statsData.reduce((sum, e) => sum + (e.progress_percentage || 0), 0) / totalEnrollments
      : 0;
    const totalWatchTime = statsData?.reduce((sum, e) => sum + (e.total_watch_time_minutes || 0), 0) || 0;

    // For each enrollment, get video and quiz progress
    const enrichedEnrollments = await Promise.all(
      (enrollments || []).map(async (enrollment: any) => {
        const courseId = enrollment.courses.id;

        // Get video progress
        const { data: videoData } = await supabaseClient
          .from('course_videos')
          .select('id')
          .eq('course_id', courseId);

        const videoIds = (videoData || []).map(v => v.id);
        
        let videoProgressData = [];
        if (videoIds.length > 0) {
          const { data: vp } = await supabaseClient
            .from('video_progress')
            .select('video_id, is_completed, watch_time_seconds')
            .eq('user_id', userId)
            .in('video_id', videoIds);
          videoProgressData = vp || [];
        }

        const totalVideos = videoData?.length || 0;
        const completedVideos = videoProgressData.filter(vp => vp.is_completed).length;
        const videoWatchTimeSeconds = videoProgressData.reduce(
          (sum, vp) => sum + (vp.watch_time_seconds || 0), 0
        );

        // Get quiz progress
        const { data: quizData } = await supabaseClient
          .from('course_quizzes')
          .select('id')
          .eq('course_id', courseId);

        const quizIds = (quizData || []).map(q => q.id);
        
        let quizAttemptsData = [];
        if (quizIds.length > 0) {
          const { data: qa } = await supabaseClient
            .from('quiz_attempts')
            .select('quiz_id, is_passed')
            .eq('user_id', userId)
            .in('quiz_id', quizIds);
          quizAttemptsData = qa || [];
        }

        const totalQuizzes = quizData?.length || 0;
        const passedQuizzes = new Set(
          quizAttemptsData.filter(qa => qa.is_passed).map(qa => qa.quiz_id)
        ).size;

        // Get section/module count
        const { data: sectionData } = await supabaseClient
          .from('course_sections')
          .select('id')
          .eq('course_id', courseId);
        
        const totalSections = sectionData?.length || 0;

        // Get completed modules count
        const { data: completedModulesData } = await supabaseClient
          .from('user_module_progress')
          .select('section_id')
          .eq('user_id', userId)
          .eq('course_id', courseId)
          .eq('is_completed', true);
        
        const completedModules = completedModulesData?.length || 0;

        // Calculate metrics
        const videoProgressPercent = totalVideos > 0
          ? (completedVideos / totalVideos) * 100
          : 0;
        const quizProgressPercent = totalQuizzes > 0
          ? (passedQuizzes / totalQuizzes) * 100
          : 0;
        const estimatedTimeRemaining = Math.max(0,
          (enrollment.courses.duration_hours * 60) - enrollment.total_watch_time_minutes);

        return {
          enrollment_id: enrollment.id,
          enrollment_date: enrollment.enrollment_date,
          completion_date: enrollment.completion_date,
          progress_percentage: enrollment.progress_percentage,
          is_completed: enrollment.is_completed,
          total_watch_time_minutes: enrollment.total_watch_time_minutes,
          course_id: enrollment.courses.id,
          title: enrollment.courses.title,
          description: enrollment.courses.description,
          instructor_name: enrollment.courses.instructor_name,
          duration_hours: enrollment.courses.duration_hours,
          thumbnail_url: enrollment.courses.thumbnail_url,
          rating: enrollment.courses.rating,
          student_count: enrollment.courses.student_count,
          tags: enrollment.courses.tags,
          category_name: enrollment.courses.categories?.name,
          category_color: enrollment.courses.categories?.color,
          total_videos: totalVideos,
          completed_videos: completedVideos,
          video_watch_time_seconds: videoWatchTimeSeconds,
          total_quizzes: totalQuizzes,
          passed_quizzes: passedQuizzes,
          total_sections: totalSections,
          completed_sections: completedModules,
          video_progress_percent: Math.round(videoProgressPercent * 100) / 100,
          quiz_progress_percent: Math.round(quizProgressPercent * 100) / 100,
          estimated_time_remaining_minutes: estimatedTimeRemaining,
          enrollment_date_formatted: enrollment.enrollment_date
            ? new Date(enrollment.enrollment_date).toISOString()
            : null,
          completion_date_formatted: enrollment.completion_date
            ? new Date(enrollment.completion_date).toISOString()
            : null
        };
      })
    );

    const totalCount = count ?? 0;

    const responseData = {
      enrollments: enrichedEnrollments,
      statistics: {
        total_enrollments: totalEnrollments,
        completed_courses: completedCourses,
        average_progress: Math.round(averageProgress * 100) / 100,
        total_watch_time_minutes: totalWatchTime,
        total_watch_time_hours: Math.round((totalWatchTime / 60) * 100) / 100,
        completion_rate: totalEnrollments > 0
          ? Math.round((completedCourses / totalEnrollments) * 10000) / 100
          : 0
      },
      pagination: {
        currentPageSize: enrichedEnrollments.length,
        totalCount,
        limit,
        offset,
        hasMore: offset + enrichedEnrollments.length < totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: Math.floor(offset / limit) + 1
      },
      filters: {
        status: status || null,
        progress_min: progress_min ? parseFloat(progress_min) : null,
        progress_max: progress_max ? parseFloat(progress_max) : null,
        sortBy: safeSortBy,
        sortOrder: sortOrder
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    };

    return new Response(
      JSON.stringify({
        success: true,
        message: "User enrollments retrieved successfully",
        data: responseData
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error("Error retrieving user enrollments:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "An error occurred while retrieving user enrollments",
        error: error.message || "Unknown error",
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
});
