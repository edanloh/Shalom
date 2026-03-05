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

const MIN_DAILY_WATCH_MINUTES = 10;

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

const getLocalDateString = (date: Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") map[part.type] = part.value;
  }
  return `${map.year}-${map.month}-${map.day}`;
};

async function notifyStreakUpdate(userId: string, activityAt: string) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!supabaseUrl || !serviceKey) return;
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/updateStreak`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
      body: JSON.stringify({ userId, activityAt }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error('updateStreak failed:', res.status, text);
    }
  } catch (error) {
    console.error('Failed to update streak:', error);
  }
}

async function recordLessonCompleted(userId: string, courseId: string, videoId: string) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!supabaseUrl || !serviceKey) return;
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/postCreditEvent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
      body: JSON.stringify({
        userId,
        type: 'lesson_completed',
        title: 'Lesson completed',
        points: 0,
        courseId,
        referenceKey: `lesson_completed:video:${videoId}`,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error('postCreditEvent lesson_completed failed:', res.status, text);
    }
  } catch (error) {
    console.error('Failed to record lesson completion:', error);
  }
}

const isGoalComplete = (goal: any) => {
  const checks: Array<{ target: number; current: number }> = [];
  const targetHours = Number(goal.target_hours ?? 0);
  const targetLessons = Number(goal.target_lessons ?? 0);
  const targetCourses = Number(goal.target_courses ?? 0);
  const targetPoints = Number(goal.target_points ?? 0);
  const targetQuizzes = Number(goal.target_quizzes ?? 0);

  if (targetHours > 0) checks.push({ target: targetHours, current: Number(goal.current_hours ?? 0) });
  if (targetLessons > 0)
    checks.push({ target: targetLessons, current: Number(goal.current_lessons ?? 0) });
  if (targetCourses > 0)
    checks.push({ target: targetCourses, current: Number(goal.current_courses ?? 0) });
  if (targetPoints > 0) checks.push({ target: targetPoints, current: Number(goal.current_points ?? 0) });
  if (targetQuizzes > 0)
    checks.push({ target: targetQuizzes, current: Number(goal.current_quizzes ?? 0) });

  if (!checks.length) return false;
  return checks.every((c) => c.current >= c.target);
};

async function awardGoalCredits(userId: string, goal: any) {
  const rewardPoints = Number(goal.reward_points ?? 0);
  if (!rewardPoints || rewardPoints <= 0) return;
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!supabaseUrl || !serviceKey) return;
  const res = await fetch(`${supabaseUrl}/functions/v1/postCreditEvent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
    },
    body: JSON.stringify({
      userId,
      type: 'goal_hit',
      title: `${goal.label || 'Goal'} completed`,
      points: rewardPoints,
      referenceKey: `goal_completed:${goal.id}`,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error('postCreditEvent failed:', res.status, text);
  }
}

async function updateActiveGoalsForVideoProgress(
  supabaseClient: any,
  userId: string,
  options: { lessonCompleted: boolean; deltaSeconds: number; now: Date }
) {
  const { lessonCompleted, deltaSeconds, now } = options;
  if (!lessonCompleted && deltaSeconds <= 0) return;
  const { data: goals, error } = await supabaseClient
    .from('learning_goals')
    .select(
      'id,label,target_hours,current_hours,target_lessons,current_lessons,target_courses,current_courses,target_points,current_points,target_quizzes,current_quizzes,is_active,completed_at,reward_points'
    )
    .eq('user_id', userId)
    .eq('is_active', true)
    .is('completed_at', null)
    .or(`deadline.is.null,deadline.gte.${now.toISOString()}`);
  if (error) throw error;
  if (!goals?.length) return;

  for (const goal of goals) {
    const updates: Record<string, number | string | boolean | null> = {};

    if (Number(goal.target_hours ?? 0) > 0 && deltaSeconds > 0) {
      const targetHours = Number(goal.target_hours ?? 0);
      const addedHours = Math.round((deltaSeconds / 3600) * 10000) / 10000;
      const nextHours = Number(goal.current_hours ?? 0) + addedHours;
      const cappedHours = targetHours > 0 ? Math.min(nextHours, targetHours) : nextHours;
      updates.current_hours = cappedHours;
      goal.current_hours = cappedHours;
    }

    if (lessonCompleted && Number(goal.target_lessons ?? 0) > 0) {
      const targetLessons = Number(goal.target_lessons ?? 0);
      const nextLessons = Number(goal.current_lessons ?? 0) + 1;
      const cappedLessons = targetLessons > 0 ? Math.min(nextLessons, targetLessons) : nextLessons;
      updates.current_lessons = cappedLessons;
      goal.current_lessons = cappedLessons;
    }

    const completed = isGoalComplete(goal);
    if (completed) {
      updates.completed_at = now.toISOString();
      updates.is_active = false;
    }

    if (Object.keys(updates).length) {
      let query = supabaseClient.from('learning_goals').update(updates).eq('id', goal.id);
      if (updates.completed_at) {
        query = query.is('completed_at', null);
      }
      const { error: updateErr } = await query;
      if (updateErr) throw updateErr;
    }

    if (completed) {
      await awardGoalCredits(userId, goal);
    }
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
    const { data: existingProgress, error: existingProgressError } = await supabaseClient
      .from('user_video_progress')
      .select('watch_time_seconds,is_completed')
      .eq('user_id', userId)
      .eq('video_id', videoId)
      .maybeSingle();

    if (existingProgressError) throw existingProgressError;

    const { data: progress, error: progressError } = await supabaseClient
      .from('user_video_progress')
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

    const now = new Date();
    const prevWatch = Number(existingProgress?.watch_time_seconds ?? 0);
    const nextWatch = Number(progress.watch_time_seconds ?? watchTimeSeconds);
    const deltaSeconds = Math.max(0, nextWatch - prevWatch);
    const lessonCompleted = Boolean(progress?.is_completed) && !Boolean(existingProgress?.is_completed);
    if (deltaSeconds > 0) {
      const { data: prefRow, error: prefErr } = await supabaseClient
        .from('user_preferences')
        .select('timezone')
        .eq('user_id', userId)
        .maybeSingle();
      if (prefErr && prefErr.code !== 'PGRST116') throw prefErr;

      const timezone = prefRow?.timezone || 'UTC';
      const dateStr = getLocalDateString(now, timezone);

      const { data: analyticsRow, error: analyticsErr } = await supabaseClient
        .from('user_analytics')
        .select('total_time_minutes')
        .eq('user_id', userId)
        .eq('date', dateStr)
        .maybeSingle();
      if (analyticsErr && analyticsErr.code !== 'PGRST116') throw analyticsErr;

      const prevMinutes = Number(analyticsRow?.total_time_minutes ?? 0);
      const newMinutes = Math.floor((prevMinutes * 60 + deltaSeconds) / 60);

      if (newMinutes !== prevMinutes) {
        const { error: analyticsUpsertErr } = await supabaseClient
          .from('user_analytics')
          .upsert(
            {
              user_id: userId,
              date: dateStr,
              total_time_minutes: newMinutes,
            },
            { onConflict: 'user_id,date' }
          );
        if (analyticsUpsertErr) throw analyticsUpsertErr;
      }

      if (prevMinutes < MIN_DAILY_WATCH_MINUTES && newMinutes >= MIN_DAILY_WATCH_MINUTES) {
        await notifyStreakUpdate(userId, now.toISOString());
      }
    }
    await updateActiveGoalsForVideoProgress(supabaseClient, userId, {
      lessonCompleted,
      deltaSeconds,
      now,
    });
    if (lessonCompleted) {
      await recordLessonCompleted(userId, course_id, videoId);
    }

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
      .from('user_video_progress')
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
        updated_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString()
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
