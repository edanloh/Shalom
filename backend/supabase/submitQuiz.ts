// supabase/functions/submitQuiz/index.ts
/**
 * Supabase Edge Function: submitQuiz
 * Purpose: Submit quiz answers, calculate score, and update progress
 * Endpoint: POST /submitQuiz/{quizId}
 * Database: PostgreSQL (Supabase compatible)
 * 
 * Request Body:
 * {
 *   "userId": "uuid",
 *   "answers": [
 *     { "questionId": "uuid", "answer": "Answer text" }
 *   ],
 *   "timeTakenMinutes": 10
 * }
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
};

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

type QuizQuestion = {
  id: string;
  question: string;
  correct_answer: string;
  points: number | null;
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

async function updateDailyMinutes(
  supabaseClient: any,
  userId: string,
  minutes: number,
  activityAt: Date
) {
  if (!Number.isFinite(minutes) || minutes <= 0) return;

  const { data: prefRow, error: prefErr } = await supabaseClient
    .from('user_preferences')
    .select('timezone')
    .eq('user_id', userId)
    .maybeSingle();
  if (prefErr && prefErr.code !== 'PGRST116') throw prefErr;

  const timezone = prefRow?.timezone || 'UTC';
  const dateStr = getLocalDateString(activityAt, timezone);

  const { data: analyticsRow, error: analyticsErr } = await supabaseClient
    .from('user_analytics')
    .select('total_time_minutes')
    .eq('user_id', userId)
    .eq('date', dateStr)
    .maybeSingle();
  if (analyticsErr && analyticsErr.code !== 'PGRST116') throw analyticsErr;

  const prevMinutes = Number(analyticsRow?.total_time_minutes ?? 0);
  const newMinutes = prevMinutes + Math.floor(minutes);

  const { error: upsertErr } = await supabaseClient
    .from('user_analytics')
    .upsert(
      {
        user_id: userId,
        date: dateStr,
        total_time_minutes: newMinutes,
      },
      { onConflict: 'user_id,date' }
    );
  if (upsertErr) throw upsertErr;
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

    const url = new URL(req.url);
    
    // Extract quizId from path: /submitQuiz/{quizId}
    const pathParts = url.pathname.split('/').filter(Boolean);
    const quizId = pathParts[pathParts.length - 1];

    // Parse body
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ success: false, message: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { userId, answers, timeTakenMinutes } = body;

    // Validate required fields
    if (!quizId || quizId === 'submitQuiz' || !userId || !answers || !Array.isArray(answers)) {
      return new Response(
        JSON.stringify({ success: false, message: "quizId, userId, and answers array are required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Quiz submission:', { quizId, userId, answersCount: answers.length });

    // ========================================
    // 1. Get quiz info and validate
    // ========================================
    const { data: quiz, error: quizError } = await supabaseClient
      .from('course_quizzes')
      .select('id, course_id, section_id, passing_score, max_attempts')
      .eq('id', quizId)
      .single();

    if (quizError || !quiz) {
      return new Response(
        JSON.stringify({ success: false, message: "Quiz not found" }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get previous attempts count
    const { count: previousAttempts } = await supabaseClient
      .from('quiz_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('quiz_id', quizId);

    // ========================================
    // 2. Get all questions with correct answers
    // ========================================
    const { data: questions, error: questionsError } = await supabaseClient
      .from('quiz_questions')
      .select('id, question, correct_answer, points')
      .eq('quiz_id', quizId);

    if (questionsError) throw questionsError;

    const questionsMap = new Map(
      (questions as QuizQuestion[] | null || []).map((row) => [row.id, row])
    );

    // ========================================
    // 3. Grade answers
    // ========================================
    let correctCount = 0;
    let totalPoints = 0;
    const gradedAnswers = [];

    for (const answer of answers) {
      const { questionId, answer: userAnswer } = answer;
      const question = questionsMap.get(questionId);
      
      if (!question) continue;
      
      const isCorrect = question.correct_answer === userAnswer;
      
      if (isCorrect) {
        correctCount++;
        totalPoints += question.points || 1;
      }

      gradedAnswers.push({
        questionId,
        isCorrect,
        correctAnswer: question.correct_answer
      });
    }

    const totalQuestions = questions?.length || 0;
    const score = totalQuestions > 0 
      ? Math.round((correctCount / totalQuestions) * 100) 
      : 0;
    const isPassed = score >= quiz.passing_score;
    const attemptNumber = (previousAttempts || 0) + 1;

    // ========================================
    // 4. Save quiz attempt
    // ========================================
    const answersJson = answers.reduce((acc: any, ans: any) => {
      acc[ans.questionId] = ans.answer;
      return acc;
    }, {});

    const { error: insertError } = await supabaseClient
      .from('quiz_attempts')
      .insert({
        user_id: userId,
        quiz_id: quizId,
        attempt_number: attemptNumber,
        score,
        total_questions: totalQuestions,
        correct_answers: correctCount,
        is_passed: isPassed,
        time_taken_minutes: timeTakenMinutes || null,
        answers: answersJson,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      });

    if (insertError) throw insertError;

    await updateDailyMinutes(supabaseClient, userId, Number(timeTakenMinutes || 0), new Date());
    await notifyStreakUpdate(userId, new Date().toISOString());

    // ========================================
    // 5. Update course progress if quiz passed
    // ========================================
    if (isPassed) {
      // Get course completion stats
      const { data: videoStats } = await supabaseClient
        .from('course_videos')
        .select('id')
        .eq('course_id', quiz.course_id);

      const { data: quizStats } = await supabaseClient
        .from('course_quizzes')
        .select('id')
        .eq('course_id', quiz.course_id);

      const { data: completedVideos } = await supabaseClient
        .from('video_progress')
        .select('video_id')
        .eq('user_id', userId)
        .eq('is_completed', true)
        .in('video_id', (videoStats || []).map((v: any) => v.id));

      const { data: passedQuizzes } = await supabaseClient
        .from('quiz_attempts')
        .select('quiz_id')
        .eq('user_id', userId)
        .eq('is_passed', true)
        .in('quiz_id', (quizStats || []).map((q: any) => q.id));

      const totalItems = (videoStats?.length || 0) + (quizStats?.length || 0);
      const completedItems = (completedVideos?.length || 0) + (new Set(passedQuizzes?.map((q: any) => q.quiz_id)).size || 0);
      
      const progressPercentage = totalItems > 0 
        ? (completedItems / totalItems) * 100 
        : 0;

      const isEnrollmentCompleted = progressPercentage >= 100;

      // Update enrollment
      const { error: enrollmentError } = await supabaseClient
        .from('course_enrollments')
        .update({
          progress_percentage: progressPercentage.toFixed(2),
          is_completed: isEnrollmentCompleted,
          completion_date: isEnrollmentCompleted ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('course_id', quiz.course_id);

      if (!enrollmentError && isEnrollmentCompleted) {
        await notifyCourseCompletion(userId, quiz.course_id);
      }
    }

    // ========================================
    // 5.5. Check and update module completion
    // ========================================
    let moduleCompletionStatus = null;
    if (quiz.section_id) {
      console.log(`\n🔍 Checking module completion for section ${quiz.section_id}`);
      moduleCompletionStatus = await checkAndUpdateModuleCompletion(
        supabaseClient, 
        userId, 
        quiz.course_id, 
        quiz.section_id
      );
    }

    // ========================================
    // 6. Return response
    // ========================================
    const attemptsRemaining = Math.max(0, quiz.max_attempts - attemptNumber);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Quiz submitted successfully",
        data: {
          score,
          totalQuestions,
          correctAnswers: correctCount,
          isPassed,
          attemptNumber,
          attemptsRemaining,
          answers: gradedAnswers,
          moduleProgress: moduleCompletionStatus ? {
            section_id: quiz.section_id,
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
    console.error("Error submitting quiz:", error);

    return new Response(
      JSON.stringify({
        success: false,
        message: "An error occurred while submitting quiz",
        error: error.message || "Unknown error"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
