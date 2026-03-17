// supabase/functions/gradeShortAnswer/index.ts
/**
 * Supabase Edge Function: gradeShortAnswer
 * Purpose: Grade a short-answer question and update the quiz attempt
 * Endpoint: POST /gradeShortAnswer
 * Database: PostgreSQL (Supabase compatible)
 * 
 * Request Body:
 * {
 *   "attemptId": "uuid",
 *   "questionId": "uuid",
 *   "pointsAwarded": number,
 *   "feedback": "string" (optional)
 * }
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
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

    const { attemptId, questionId, pointsAwarded, feedback, releaseGrades = true } = body;

    // Validate required fields
    if (!attemptId || !questionId || pointsAwarded === undefined || pointsAwarded === null) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "attemptId, questionId, and pointsAwarded are required" 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Grading short answer:', { attemptId, questionId, pointsAwarded, feedback });

    // ========================================
    // 1. Get the quiz attempt
    // ========================================
    const { data: attempt, error: attemptError } = await supabaseClient
      .from('quiz_attempts')
      .select('id, user_id, quiz_id, score, total_questions, correct_answers, answers, graded_answers')
      .eq('id', attemptId)
      .single();

    if (attemptError || !attempt) {
      return new Response(
        JSON.stringify({ success: false, message: "Quiz attempt not found" }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========================================
    // 2. Get the question details
    // ========================================
    const { data: question, error: questionError } = await supabaseClient
      .from('quiz_questions')
      .select('id, quiz_id, question_type, points')
      .eq('id', questionId)
      .single();

    if (questionError || !question) {
      return new Response(
        JSON.stringify({ success: false, message: "Question not found" }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate question type
    if (question.question_type !== 'short-answer' && question.question_type !== 'text') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "This endpoint only handles short-answer questions (or legacy 'text' type)" 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate points
    if (pointsAwarded < 0 || pointsAwarded > question.points) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `Points awarded must be between 0 and ${question.points}` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========================================
    // 3. Update graded_answers in the attempt
    // ========================================
    const gradedAnswers = attempt.graded_answers || {};
    gradedAnswers[questionId] = {
      pointsAwarded,
      maxPoints: question.points,
      feedback: feedback || null,
      gradedAt: new Date().toISOString()
    };

    // ========================================
    // 4. Recalculate total score
    // ========================================
    // Get all questions for this quiz
    const { data: allQuestions, error: allQuestionsError } = await supabaseClient
      .from('quiz_questions')
      .select('id, question_type, correct_answer, points')
      .eq('quiz_id', attempt.quiz_id);

    if (allQuestionsError) throw allQuestionsError;

    let totalPointsEarned = 0;
    let totalPointsPossible = 0;
    let correctCount = 0;

    allQuestions?.forEach(q => {
      totalPointsPossible += q.points;
      const userAnswer = attempt.answers?.[q.id];

      if (q.question_type === 'short-answer' || q.question_type === 'text') {
        // Use graded points if available (support both 'short-answer' and legacy 'text')
        const grading = gradedAnswers[q.id];
        if (grading) {
          totalPointsEarned += grading.pointsAwarded;
          if (grading.pointsAwarded >= q.points) {
            correctCount++;
          }
        }
        // If not graded yet, don't count it
      } else {
        // Auto-graded questions - check if correct
        const isCorrect = checkAnswer(q, userAnswer);
        if (isCorrect) {
          totalPointsEarned += q.points;
          correctCount++;
        }
      }
    });

    const score = totalPointsPossible > 0 
      ? Math.round((totalPointsEarned / totalPointsPossible) * 100) 
      : 0;

    // ========================================
    // 5. Get quiz passing score to update is_passed
    // ========================================
    const { data: quiz } = await supabaseClient
      .from('course_quizzes')
      .select('passing_score')
      .eq('id', attempt.quiz_id)
      .single();

    const isPassed = score >= (quiz?.passing_score || 0);

    // ========================================
    // 6. Update the quiz attempt
    // ========================================
    const updateData: any = {
      graded_answers: gradedAnswers,
      score: score,
      correct_answers: correctCount,
      is_passed: isPassed
    };

    // Update grades_released if specified
    if (releaseGrades !== undefined) {
      updateData.grades_released = releaseGrades;
    }

    const { error: updateError } = await supabaseClient
      .from('quiz_attempts')
      .update(updateData)
      .eq('id', attemptId);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        success: true,
        message: "Short answer graded successfully",
        data: {
          attemptId,
          questionId,
          pointsAwarded,
          maxPoints: question.points,
          newScore: score,
          isPassed
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error("Error grading short answer:", error);

    return new Response(
      JSON.stringify({
        success: false,
        message: "An error occurred while grading",
        error: error.message || "Unknown error"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Helper function to check auto-graded questions
function checkAnswer(question: any, userAnswer: any): boolean {
  if (!userAnswer) return false;

  const correctAnswer = question.correct_answer;

  // Handle matching questions specifically (arrays of {left, right} pairs)
  if (question.question_type === 'matching') {
    const userArray = Array.isArray(userAnswer) 
      ? userAnswer 
      : (typeof userAnswer === 'string' && userAnswer.startsWith('[')
          ? JSON.parse(userAnswer)
          : []);
    const correctArray = Array.isArray(correctAnswer) 
      ? correctAnswer 
      : (typeof correctAnswer === 'string' && correctAnswer.startsWith('[')
          ? JSON.parse(correctAnswer)
          : []);
    
    // Check if counts match first
    if (userArray.length !== correctArray.length) {
      return false;
    }
    
    // Check if all user pairs match correct pairs (by value, not position)
    return userArray.every((userPair: any) => {
      return correctArray.some((correctPair: any) => 
        userPair.left === correctPair.left && userPair.right === correctPair.right
      );
    });
  }

  // Handle array answers (multiple-correct)
  const userAnswerArray = Array.isArray(userAnswer) 
    ? userAnswer 
    : (typeof userAnswer === 'string' && userAnswer.startsWith('[')
        ? JSON.parse(userAnswer)
        : null);
  const correctAnswerArray = Array.isArray(correctAnswer) 
    ? correctAnswer 
    : (typeof correctAnswer === 'string' && correctAnswer.startsWith('[')
        ? JSON.parse(correctAnswer)
        : null);

  if (userAnswerArray && correctAnswerArray) {
    return JSON.stringify([...userAnswerArray].sort()) === JSON.stringify([...correctAnswerArray].sort());
  }

  // Direct comparison for single answers
  return correctAnswer === userAnswer;
}
