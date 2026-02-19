// supabase/functions/getQuizDetail/index.ts
/**
 * Supabase Edge Function: getQuizDetail
 * Purpose: Fetch quiz questions and user's previous attempts
 * Endpoint: GET /getQuizDetail/{quizId}?userId={userId}
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
    
    // Extract quizId from path: /getQuizDetail/{quizId}
    const pathParts = url.pathname.split('/').filter(Boolean);
    const quizId = pathParts[pathParts.length - 1];
    
    // Extract userId from query parameter
    const userId = url.searchParams.get('userId');

    if (!quizId || quizId === 'getQuizDetail') {
      return new Response(
        JSON.stringify({
          success: false,
          message: "quizId is required"
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Fetching quiz details:', { quizId, userId });

    // ========================================
    // 1. Fetch quiz details with course and section info
    // ========================================
    const { data: quiz, error: quizError } = await supabaseClient
      .from('course_quizzes')
      .select(`
        id,
        title,
        description,
        passing_score,
        time_limit_minutes,
        max_attempts,
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
      .eq('id', quizId)
      .single();

    if (quizError || !quiz) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Quiz not found"
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // ========================================
    // 2. Fetch quiz questions with options
    // ========================================
    const { data: questions, error: questionsError } = await supabaseClient
      .from('quiz_questions')
      .select(`
        id,
        question,
        question_type,
        options,
        correct_answer,
        explanation,
        points,
        order_index,
        image_url
      `)
      .eq('quiz_id', quizId)
      .order('order_index', { ascending: true });

    if (questionsError) throw questionsError;

    // Format questions to match Lambda response (rename 'question' to 'question_text')
    const formattedQuestions = (questions || []).map((q: any) => ({
      id: q.id,
      question_text: q.question,
      question_type: q.question_type,
      options: q.options,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
      points: q.points,
      order_index: q.order_index,
      image_url: q.image_url
    }));

    // ========================================
    // 3. Fetch user attempts if userId provided
    // ========================================
    let userAttempts = [];
    
    if (userId) {
      try {
        const { data: attempts, error: attemptsError } = await supabaseClient
          .from('quiz_attempts')
          .select(`
            attempt_number,
            score,
            total_questions,
            correct_answers,
            time_taken_minutes,
            is_passed,
            answers,
            completed_at
          `)
          .eq('user_id', userId)
          .eq('quiz_id', quizId)
          .order('attempt_number', { ascending: false });

        if (!attemptsError && attempts) {
          userAttempts = attempts;
        }
      } catch (attemptsError) {
        console.error('Error fetching user attempts:', attemptsError);
        // Continue without attempts data
      }
    }

    // ========================================
    // 4. Construct response
    // ========================================
    const responseData = {
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      passing_score: quiz.passing_score,
      time_limit_minutes: quiz.time_limit_minutes,
      max_attempts: quiz.max_attempts,
      course: {
        id: quiz.courses.id,
        title: quiz.courses.title
      },
      section: {
        id: quiz.course_sections.id,
        title: quiz.course_sections.title
      },
      questions: formattedQuestions,
      userAttempts
    };

    return new Response(
      JSON.stringify({
        success: true,
        message: "Quiz details retrieved successfully",
        data: responseData
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error("Error retrieving quiz details:", error);

    return new Response(
      JSON.stringify({
        success: false,
        message: "An error occurred while retrieving quiz details",
        error: error.message || "Unknown error"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
