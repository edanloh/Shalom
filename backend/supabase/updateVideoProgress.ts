// supabase/functions/updateVideoProgress/index.ts
/**
 * Supabase Edge Function: updateVideoProgress
 * Purpose: Update user's video watch progress and course completion
 * Endpoint: POST /updateVideoProgress
 * Database: PostgreSQL (Supabase compatible)
 * 
 * Request Body:
 * {
 *   "userId": "uuid",
 *   "videoId": "uuid",
 *   "watchTimeSeconds": 450,
 *   "isCompleted": false,
 *   "lastPositionSeconds": 450
 * }
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
};

async function notifyCourseCompletion(userId: string, courseId: string) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!supabaseUrl || !serviceKey) return;
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/completeCourse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
      body: JSON.stringify({ userId, courseId }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error('completeCourse failed:', res.status, text);
    }
  } catch (error) {
    console.error('Failed to notify course completion:', error);
  }
}

/**
 * Check and update module (section) completion status
 * A module is completed when ALL videos are watched and ALL quizzes are passed
 */
async function checkAndUpdateModuleCompletion(supabaseClient: any, userId: string, courseId: string, sectionId: string) {
  try {
    // Get total count of videos and quizzes in this section
    const { data: totals, error: totalsError } = await supabaseClient
      .rpc('get_section_totals', { p_section_id: sectionId });

    if (totalsError) throw totalsError;

    const total_videos = totals?.[0]?.total_videos || 0;
    const total_quizzes = totals?.[0]?.total_quizzes || 0;

    console.log(`📚 Section ${sectionId}: ${total_videos} videos, ${total_quizzes} quizzes`);

    // Get count of completed videos and passed quizzes
    const { data: completed, error: completedError } = await supabaseClient
      .rpc('get_section_completion', { 
        p_user_id: userId, 
        p_section_id: sectionId 
      });

    if (completedError) throw completedError;

    const completed_videos = completed?.[0]?.completed_videos || 0;
    const passed_quizzes = completed?.[0]?.passed_quizzes || 0;

    console.log(`📊 Section ${sectionId} progress:`);
    console.log(`   Videos: ${completed_videos}/${total_videos}`);
    console.log(`   Quizzes: ${passed_quizzes}/${total_quizzes}`);

    // Check if module is completed
    const videosComplete = completed_videos === total_videos;
    const quizzesComplete = total_quizzes === 0 || passed_quizzes === total_quizzes;
    const hasContent = total_videos > 0 || total_quizzes > 0;
    const isModuleCompleted = hasContent && videosComplete && quizzesComplete;

    console.log(`📝 Module ${sectionId} is ${isModuleCompleted ? '✅ COMPLETED' : '❌ NOT COMPLETED'}`);

    // Update or insert module progress
    const { data: moduleProgress, error: upsertError } = await supabaseClient
      .from('user_module_progress')
      .upsert({
        user_id: userId,
        course_id: courseId,
        section_id: sectionId,
        is_completed: isModuleCompleted,
        completed_at: isModuleCompleted ? new Date().toISOString() : null
      }, {
        onConflict: 'user_id,course_id,section_id'
      })
      .select()
      .single();

    if (upsertError) throw upsertError;

    return {
      isCompleted: isModuleCompleted,
      totalVideos: total_videos,
      completedVideos: completed_videos,
      totalQuizzes: total_quizzes,
      passedQuizzes: passed_quizzes,
      moduleProgress
    };

  } catch (error) {
    console.error('Error checking module completion:', error);
    return null;
  }
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

    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ success: false, message: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { userId, videoId, watchTimeSeconds, isCompleted, lastPositionSeconds } = body;

    // Validate required fields
    if (!userId || !videoId) {
      return new Response(
        JSON.stringify({ success: false, message: "userId and videoId are required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (watchTimeSeconds === undefined || lastPositionSeconds === undefined) {
      return new Response(
        JSON.stringify({ success: false, message: "watchTimeSeconds and lastPositionSeconds are required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Video progress update:', { userId, videoId, watchTimeSeconds, isCompleted, lastPositionSeconds });

    // ========================================
    // 1. Get video and course info
    // ========================================
    const { data: videoInfo, error: videoError } = await supabaseClient
      .from('course_videos')
      .select('course_id, duration_seconds, section_id')
      .eq('id', videoId)
      .single();

    if (videoError || !videoInfo) {
      return new Response(
        JSON.stringify({ success: false, message: "Video not found" }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { course_id, duration_seconds, section_id } = videoInfo;

    console.log('🎬 Video info:', { videoId, courseId: course_id, sectionId: section_id, duration: duration_seconds });

    // ========================================
    // 2. Upsert video progress
    // ========================================
    const completedAt = isCompleted ? new Date().toISOString() : null;

    const { data: progress, error: progressError } = await supabaseClient
      .from('video_progress')
      .upsert({
        user_id: userId,
        video_id: videoId,
        watch_time_seconds: watchTimeSeconds,
        is_completed: isCompleted || false,
        last_position_seconds: lastPositionSeconds,
        completed_at: completedAt,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,video_id',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (progressError) throw progressError;

    console.log('✅ Video progress saved:', {
      videoId: progress.video_id,
      watchTime: progress.watch_time_seconds,
      lastPosition: progress.last_position_seconds,
      isCompleted: progress.is_completed
    });

    // ========================================
    // 3. Update course enrollment progress
    // ========================================
    // Get total videos + quizzes
    const { data: allVideos } = await supabaseClient
      .from('course_videos')
      .select('id')
      .eq('course_id', course_id);

    const { data: allQuizzes } = await supabaseClient
      .from('course_quizzes')
      .select('id')
      .eq('course_id', course_id);

    // Get completed videos
    const { data: completedVideos } = await supabaseClient
      .from('video_progress')
      .select('video_id')
      .eq('user_id', userId)
      .eq('is_completed', true)
      .in('video_id', (allVideos || []).map((v: any) => v.id));

    // Get passed quizzes
    const { data: passedQuizzes } = await supabaseClient
      .from('quiz_attempts')
      .select('quiz_id')
      .eq('user_id', userId)
      .eq('is_passed', true)
      .in('quiz_id', (allQuizzes || []).map((q: any) => q.id));

    const totalItems = (allVideos?.length || 0) + (allQuizzes?.length || 0);
    const completedItems =
      (completedVideos?.length || 0) +
      (new Set(passedQuizzes?.map((q: any) => q.quiz_id)).size || 0);

    // Calculate progress percentage
    const progressPercentage = totalItems > 0
      ? (completedItems / totalItems) * 100
      : 0;

    const isEnrollmentCompleted = totalItems > 0 && progressPercentage >= 100;

    // Update enrollment
    const { data: enrollment, error: enrollmentError } = await supabaseClient
      .from('course_enrollments')
      .update({
        progress_percentage: progressPercentage.toFixed(2),
        is_completed: isEnrollmentCompleted,
        completion_date: isEnrollmentCompleted ? new Date().toISOString() : null,
        current_video_id: videoId,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('course_id', course_id)
      .select()
      .single();

    if (enrollmentError) {
      console.error('Enrollment update error:', enrollmentError);
    } else if (isEnrollmentCompleted) {
      await notifyCourseCompletion(userId, course_id);
    }

    // ========================================
    // 3.5. Check and update module completion
    // ========================================
    let moduleCompletionStatus = null;
    if (section_id) {
      console.log(`\n🔍 Checking module completion for section ${section_id}`);
      moduleCompletionStatus = await checkAndUpdateModuleCompletion(
        supabaseClient, 
        userId, 
        course_id, 
        section_id
      );
      console.log('Module completion status:', moduleCompletionStatus);
    }

    // ========================================
    // 4. Return response
    // ========================================
    return new Response(
      JSON.stringify({
        success: true,
        message: "Video progress updated successfully",
        data: {
          videoProgress: progress,
          courseProgress: {
            progress_percentage: progressPercentage.toFixed(2),
            is_completed: isEnrollmentCompleted,
            completed_items: completedItems,
            total_items: totalItems
          },
          moduleProgress: moduleCompletionStatus ? {
            section_id: section_id,
            is_completed: moduleCompletionStatus.isCompleted,
            completed_videos: moduleCompletionStatus.completedVideos,
            total_videos: moduleCompletionStatus.totalVideos,
            passed_quizzes: moduleCompletionStatus.passedQuizzes,
            total_quizzes: moduleCompletionStatus.totalQuizzes
          } : null
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error("Error updating video progress:", error);

    return new Response(
      JSON.stringify({
        success: false,
        message: "An error occurred while updating video progress",
        error: error.message || "Unknown error"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
