// supabase/functions/getPendingGrading/index.ts
/**
 * Supabase Edge Function: getPendingGrading
 * Purpose: Fetch quiz attempts with short-answer questions pending manual grading
 * Endpoint: GET /getPendingGrading/{instructorId}?courseId={courseId}&moduleId={moduleId}
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
    
    // Extract instructorId from path
    const pathParts = url.pathname.split('/').filter(Boolean);
    const instructorId = pathParts[pathParts.length - 1];
    
    // Extract optional filters
    const courseId = url.searchParams.get('courseId');
    const moduleId = url.searchParams.get('moduleId');

    if (!instructorId || instructorId === 'getPendingGrading') {
      return new Response(
        JSON.stringify({ success: false, message: "Instructor ID is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching pending grading:', { instructorId, courseId, moduleId });

    // ========================================
    // 1. Get instructor's courses
    // ========================================
    let coursesQuery = supabaseClient
      .from('courses')
      .select('id, title')
      .eq('instructor_id', instructorId);

    if (courseId) {
      coursesQuery = coursesQuery.eq('id', courseId);
    }

    const { data: courses, error: coursesError } = await coursesQuery;
    if (coursesError) throw coursesError;

    const courseIds = courses?.map(c => c.id) || [];
    
    if (courseIds.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No courses found for this instructor",
          data: []
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========================================
    // 2. Get quizzes for those courses
    // ========================================
    let quizzesQuery = supabaseClient
      .from('course_quizzes')
      .select('id, title, course_id, section_id')
      .in('course_id', courseIds);

    if (moduleId) {
      quizzesQuery = quizzesQuery.eq('section_id', moduleId);
    }

    const { data: quizzes, error: quizzesError } = await quizzesQuery;
    if (quizzesError) throw quizzesError;

    const quizIds = quizzes?.map(q => q.id) || [];
    
    if (quizIds.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No quizzes found",
          data: []
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========================================
    // 3. Get quiz questions (filter for short-answer)
    // ========================================
    const { data: questions, error: questionsError } = await supabaseClient
      .from('quiz_questions')
      .select('id, quiz_id, question, question_type, correct_answer, points, image_url')
      .in('quiz_id', quizIds)
      .eq('question_type', 'short-answer');

    if (questionsError) throw questionsError;

    // Map quizId -> questions
    const quizQuestionsMap = new Map<string, any[]>();
    questions?.forEach(q => {
      if (!quizQuestionsMap.has(q.quiz_id)) {
        quizQuestionsMap.set(q.quiz_id, []);
      }
      quizQuestionsMap.get(q.quiz_id)!.push(q);
    });

    // Filter quizzes that have short-answer questions
    const quizzesWithShortAnswer = quizzes?.filter(q => 
      quizQuestionsMap.has(q.id)
    ) || [];

    const filteredQuizIds = quizzesWithShortAnswer.map(q => q.id);

    if (filteredQuizIds.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No quizzes with short-answer questions found",
          data: []
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========================================
    // 4. Get all quiz attempts for these quizzes
    // ========================================
    const { data: attempts, error: attemptsError } = await supabaseClient
      .from('quiz_attempts')
      .select(`
        id,
        user_id,
        quiz_id,
        score,
        total_questions,
        correct_answers,
        time_taken_minutes,
        is_passed,
        answers,
        attempt_number,
        completed_at,
        graded_answers
      `)
      .in('quiz_id', filteredQuizIds)
      .order('completed_at', { ascending: false });

    if (attemptsError) throw attemptsError;

    // ========================================
    // 5. Get user info for each attempt
    // ========================================
    const userIds = [...new Set(attempts?.map(a => a.user_id) || [])];
    const { data: users, error: usersError } = await supabaseClient
      .from('users')
      .select('id, name, email')
      .in('id', userIds);

    if (usersError) throw usersError;

    const usersMap = new Map(users?.map(u => [u.id, u]) || []);
    const coursesMap = new Map(courses?.map(c => [c.id, c]) || []);
    const quizzesMap = new Map(quizzes?.map(q => [q.id, q]) || []);

    // ========================================
    // 6. Get module/section names
    // ========================================
    const sectionIds = [...new Set(quizzes?.map(q => q.section_id).filter(Boolean) || [])];
    const { data: sections } = await supabaseClient
      .from('course_sections')
      .select('id, title')
      .in('id', sectionIds);

    const sectionsMap = new Map(sections?.map(s => [s.id, s]) || []);

    // ========================================
    // 7. Process attempts to identify pending grading
    // ========================================
    const pendingGrading: any[] = [];

    attempts?.forEach(attempt => {
      const quiz = quizzesMap.get(attempt.quiz_id);
      const course = coursesMap.get(quiz?.course_id);
      const section = sectionsMap.get(quiz?.section_id);
      const user = usersMap.get(attempt.user_id);
      const shortAnswerQuestions = quizQuestionsMap.get(attempt.quiz_id) || [];

      if (!quiz || !course || !user || shortAnswerQuestions.length === 0) return;

      // Check each short-answer question in this attempt
      shortAnswerQuestions.forEach(question => {
        const userAnswer = attempt.answers?.[question.id];
        const gradedAnswers = attempt.graded_answers || {};
        const isGraded = gradedAnswers[question.id] !== undefined;

        // Only include if student answered it and it's not graded yet
        if (userAnswer && !isGraded) {
          pendingGrading.push({
            attemptId: attempt.id,
            attemptNumber: attempt.attempt_number,
            studentId: user.id,
            studentName: user.name,
            studentEmail: user.email,
            quizId: quiz.id,
            quizTitle: quiz.title,
            courseId: course.id,
            courseTitle: course.title,
            moduleId: section?.id || null,
            moduleTitle: section?.title || null,
            questionId: question.id,
            questionText: question.question,
            questionImageUrl: question.image_url,
            maxPoints: question.points,
            sampleAnswer: question.correct_answer, // Sample answer / grading guideline
            studentAnswer: userAnswer,
            submittedAt: attempt.completed_at,
            totalScore: attempt.score,
            isPassed: attempt.is_passed
          });
        }
      });
    });

    // Sort by submission time (most recent first)
    pendingGrading.sort((a, b) => 
      new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: "Pending grading items retrieved successfully",
        data: pendingGrading
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error("Error retrieving pending grading:", error);

    return new Response(
      JSON.stringify({
        success: false,
        message: "An error occurred while retrieving pending grading",
        error: error.message || "Unknown error"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
