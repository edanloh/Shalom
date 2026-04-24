// supabase/functions/getUserEnrollment/index.ts
/**
 * Supabase Edge Function: getUserEnrollment (OPTIMIZED)
 * Purpose: Fetch user enrollments with accurate progress using efficient queries
 * Endpoint: GET /getUserEnrollment/{userId}
 * 
 * OPTIMIZATION STRATEGY:
 * 1. Use cached progress_percentage from course_enrollments (updated by triggers)
 * 2. For detailed stats, use aggregated queries instead of fetching all records
 * 3. Fetch item counts once per course, not per video/quiz
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
};

serve(async (req) => {
  console.log('=== getUserEnrollment REQUEST ===');
  console.log('URL:', req.url);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
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
    const includeDetails = url.searchParams.get("includeDetails") === "true";

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

    console.log('Fetching enrollments for userId:', userId);
    console.log('Include details:', includeDetails);

    // Validate sort parameters
    const allowedSortFields = ["enrollment_date", "progress_percentage", "completion_date", "last_activity_at"];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : "enrollment_date";
    const ascending = sortOrder.toLowerCase() !== "desc";

    // ========================================
    // 1. Fetch enrollments with course info
    // ========================================
    let query = supabaseClient
      .from('course_enrollments')
      .select(`
        id,
        enrollment_date,
        completion_date,
        progress_percentage,
        is_completed,
        total_watch_time_minutes,
        last_activity_at,
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
      .eq('courses.is_published', true)
      .not('enrollment_date', 'is', null)
      .range(offset, offset + limit - 1)
      .order(safeSortBy, { ascending });

    // Apply filters
    if (status === 'completed') {
      query = query.eq('is_completed', true);
    } else if (status === 'active') {
      query = query.eq('is_completed', false);
    }
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

    // ========================================
    // 2. Get user statistics (all enrollments for stats)
    // ========================================
    const { data: statsData, error: statsError } = await supabaseClient
      .from('course_enrollments')
      .select('is_completed, progress_percentage, total_watch_time_minutes')
      .eq('user_id', userId);

    if (statsError) {
      console.error('Stats query error:', statsError);
      throw statsError;
    }

    const totalEnrollments = statsData?.length || 0;
    const completedCourses = statsData?.filter(e => e.is_completed).length || 0;
    const averageProgress = totalEnrollments > 0
      ? statsData.reduce((sum, e) => sum + (e.progress_percentage || 0), 0) / totalEnrollments
      : 0;
    const totalWatchTime = statsData?.reduce((sum, e) => sum + (e.total_watch_time_minutes || 0), 0) || 0;

    // ========================================
    // 3. Enrich enrollments with progress details (if requested)
    // ========================================
    let enrichedEnrollments;

    if (includeDetails && enrollments && enrollments.length > 0) {
      // Collect all course IDs for batch queries
      const courseIds = enrollments.map(e => e.courses.id);

      // Batch fetch course content counts
      const [
        { data: videoCountsData },
        { data: quizCountsData },
        { data: pdfCountsData },
        { data: sectionCountsData }
      ] = await Promise.all([
        // Get video counts per course
        supabaseClient.rpc('get_video_counts_by_course', { course_ids: courseIds }),
        
        // Get quiz counts per course
        supabaseClient.rpc('get_quiz_counts_by_course', { course_ids: courseIds }),
        
        // Get PDF counts per course
        supabaseClient.rpc('get_pdf_counts_by_course', { course_ids: courseIds }),
        
        // Get section counts per course
        supabaseClient.rpc('get_section_counts_by_course', { course_ids: courseIds })
      ]);

      // Create lookup maps for O(1) access
      const videoCountsMap = new Map((videoCountsData || []).map((vc: any) => [vc.course_id, vc.count]));
      const quizCountsMap = new Map((quizCountsData || []).map((qc: any) => [qc.course_id, qc.count]));
      const pdfCountsMap = new Map((pdfCountsData || []).map((pc: any) => [pc.course_id, pc.count]));
      const sectionCountsMap = new Map((sectionCountsData || []).map((sc: any) => [sc.course_id, sc.count]));

      // Batch fetch user progress for all courses
      const [
        { data: videoProgressData },
        { data: quizProgressData },
        { data: pdfProgressData },
        { data: moduleProgressData }
      ] = await Promise.all([
        // Get completed videos count per course
        supabaseClient.rpc('get_user_completed_videos_by_course', { 
          p_user_id: userId, 
          course_ids: courseIds 
        }),
        
        // Get passed quizzes count per course
        supabaseClient.rpc('get_user_passed_quizzes_by_course', { 
          p_user_id: userId, 
          course_ids: courseIds 
        }),
        
        // Get completed PDFs count per course
        supabaseClient.rpc('get_user_completed_pdfs_by_course', { 
          p_user_id: userId, 
          course_ids: courseIds 
        }),
        
        // Get completed modules count per course
        supabaseClient.rpc('get_user_completed_modules_by_course', { 
          p_user_id: userId, 
          course_ids: courseIds 
        })
      ]);

      // Create progress lookup maps
      const completedVideosMap = new Map((videoProgressData || []).map((vp: any) => [vp.course_id, vp.count]));
      const passedQuizzesMap = new Map((quizProgressData || []).map((qp: any) => [qp.course_id, qp.count]));
      const completedPdfsMap = new Map((pdfProgressData || []).map((pp: any) => [pp.course_id, pp.count]));
      const completedModulesMap = new Map((moduleProgressData || []).map((mp: any) => [mp.course_id, mp.count]));

      // Enrich each enrollment with progress details using lookups
      enrichedEnrollments = enrollments.map((enrollment: any) => {
        const courseId = enrollment.courses.id;

        const totalVideos = videoCountsMap.get(courseId) || 0;
        const completedVideos = completedVideosMap.get(courseId) || 0;
        const totalQuizzes = quizCountsMap.get(courseId) || 0;
        const passedQuizzes = passedQuizzesMap.get(courseId) || 0;
        const totalPdfs = pdfCountsMap.get(courseId) || 0;
        const completedPdfs = completedPdfsMap.get(courseId) || 0;
        const totalSections = sectionCountsMap.get(courseId) || 0;
        const completedModules = completedModulesMap.get(courseId) || 0;

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
          last_activity_at: enrollment.last_activity_at,
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
          total_quizzes: totalQuizzes,
          passed_quizzes: passedQuizzes,
          total_pdfs: totalPdfs,
          completed_pdfs: completedPdfs,
          total_sections: totalSections,
          completed_sections: completedModules,
          video_progress_percent: Math.round(videoProgressPercent * 100) / 100,
          quiz_progress_percent: Math.round(quizProgressPercent * 100) / 100,
          estimated_time_remaining_minutes: estimatedTimeRemaining
        };
      });
    } else {
      // Simple response without detailed progress
      enrichedEnrollments = (enrollments || []).map((enrollment: any) => ({
        enrollment_id: enrollment.id,
        enrollment_date: enrollment.enrollment_date,
        completion_date: enrollment.completion_date,
        progress_percentage: enrollment.progress_percentage,
        is_completed: enrollment.is_completed,
        total_watch_time_minutes: enrollment.total_watch_time_minutes,
        last_activity_at: enrollment.last_activity_at,
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
        category_color: enrollment.courses.categories?.color
      }));
    }

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
        sortOrder: sortOrder,
        includeDetails
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    };

    console.log('=== SUCCESS ===');
    console.log('Returning', enrichedEnrollments.length, 'enrollments');

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
    console.error("=== ERROR ===");
    console.error("Error:", error);
    
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