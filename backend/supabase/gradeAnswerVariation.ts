// supabase/functions/gradeAnswerVariation/index.ts
/**
 * Supabase Edge Function: gradeAnswerVariation
 * Purpose: Grade multiple students with the same answer variation
 * Endpoint: POST /gradeAnswerVariation
 * 
 * Request Body:
 * {
 *   "attemptIds": ["uuid1", "uuid2", ...],
 *   "questionId": "uuid",
 *   "pointsAwarded": number,
 *   "feedback": "string" (optional),
 *   "releaseGrades": boolean (default: true)
 * }
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
};

// Helper function to send notifications
const sendNotification = async (supabaseClient: any, payload: Record<string, unknown>) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  
  const data = payload as any;
  const insertPayload = {
    user_id: data.userId || data.user_id,
    title: data.title,
    message: data.message,
    type: data.type || 'system',
    action_url: data.actionUrl || data.action_url || null,
    related_entity_type: data.relatedEntityType || data.related_entity_type || null,
    related_entity_id: data.relatedEntityId || data.related_entity_id || null,
    priority: data.priority || 'normal',
    expires_at: data.expiresAt || data.expires_at || null,
    created_at: data.createdAt || data.created_at || new Date().toISOString(),
  };

  const insertDirect = async () => {
    const { error } = await supabaseClient.from('notifications').insert(insertPayload);
    if (error) {
      console.error('Direct notification insert failed:', error);
    }
  };

  if (!supabaseUrl || !serviceKey) {
    await insertDirect();
    return;
  }

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/postNotification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error('postNotification failed:', res.status, text);
      await insertDirect();
    }
  } catch (error) {
    console.error('Failed to send notification:', error);
    await insertDirect();
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ success: false, message: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { attemptIds, questionId, pointsAwarded, feedback, releaseGrades = true } = body;

    // Validate required fields
    if (!attemptIds || !Array.isArray(attemptIds) || attemptIds.length === 0 || 
        !questionId || pointsAwarded === undefined || pointsAwarded === null) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "attemptIds (array), questionId, and pointsAwarded are required" 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Grading variation: ${attemptIds.length} students, question ${questionId}, points ${pointsAwarded}`);

    // Get the question details
    const { data: question, error: questionError } = await supabaseClient
      .from('quiz_questions')
      .select('id, quiz_id, question_type, points, correct_answer, graded_variations')
      .eq('id', questionId)
      .single();

    if (questionError || !question) {
      return new Response(
        JSON.stringify({ success: false, message: "Question not found" }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate points range
    if (pointsAwarded < 0 || pointsAwarded > question.points) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `Points must be between 0 and ${question.points}` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the first attempt to extract the answer text for variation storage
    const { data: firstAttempt } = await supabaseClient
      .from('quiz_attempts')
      .select('answers, user_id')
      .eq('id', attemptIds[0])
      .single();

    if (firstAttempt && firstAttempt.answers?.[questionId]) {
      const answerText = String(firstAttempt.answers[questionId]).trim();
      const normalizedAnswer = answerText.toLowerCase();
      
      // Update graded_variations in quiz_questions
      const gradedVariations = question.graded_variations || {};
      gradedVariations[normalizedAnswer] = {
        answerText: answerText,
        pointsAwarded: pointsAwarded,
        feedback: feedback || null,
        gradedAt: new Date().toISOString(),
        gradedBy: firstAttempt.user_id, // Store who graded it
        studentCount: attemptIds.length
      };

      await supabaseClient
        .from('quiz_questions')
        .update({ graded_variations: gradedVariations })
        .eq('id', questionId);
        
      console.log(`Stored variation grade for "${normalizedAnswer}" (${attemptIds.length} students)`);
    }

    // Get all quiz questions for score recalculation
    const { data: allQuestions, error: allQuestionsError } = await supabaseClient
      .from('quiz_questions')
      .select('id, question_type, points, correct_answer')
      .eq('quiz_id', question.quiz_id);

    if (allQuestionsError) throw allQuestionsError;

    const results = [];
    const errors = [];
    const notificationPromises = [];

    // Get quiz and course details for notifications
    const { data: quizDetails } = await supabaseClient
      .from('course_quizzes')
      .select('id, title, course_id, passing_score, courses(title)')
      .eq('id', question.quiz_id)
      .single();

    // Process each attempt
    for (const attemptId of attemptIds) {
      try {
        // Get attempt
        const { data: attempt, error: attemptError } = await supabaseClient
          .from('quiz_attempts')
          .select('id, user_id, quiz_id, answers, graded_answers, grades_released')
          .eq('id', attemptId)
          .single();

        if (attemptError || !attempt) {
          errors.push({ attemptId, error: "Attempt not found" });
          continue;
        }

        // Update graded_answers - populate with the current grade plus any existing graded variations
        const gradedAnswers = attempt.graded_answers || {};
        gradedAnswers[questionId] = {
          pointsAwarded,
          maxPoints: question.points,
          feedback: feedback || null,
          gradedAt: new Date().toISOString()
        };

        // Check for other short-answer questions with graded variations and populate them
        for (const q of allQuestions) {
          if ((q.question_type === 'short-answer' || q.question_type === 'text') && q.id !== questionId) {
            const userAnswer = attempt.answers?.[q.id];
            if (userAnswer && !gradedAnswers[q.id]) {
              // Check if this answer has been graded in graded_variations
              const { data: questionWithVariations } = await supabaseClient
                .from('quiz_questions')
                .select('graded_variations')
                .eq('id', q.id)
                .single();
              
              if (questionWithVariations?.graded_variations) {
                const normalizedUserAnswer = String(userAnswer).trim().toLowerCase();
                const variation = questionWithVariations.graded_variations[normalizedUserAnswer];
                
                if (variation && variation.pointsAwarded !== undefined) {
                  // This answer has been graded - add it to gradedAnswers
                  gradedAnswers[q.id] = {
                    pointsAwarded: variation.pointsAwarded,
                    maxPoints: q.points,
                    feedback: variation.feedback || null,
                    gradedAt: variation.gradedAt
                  };
                  console.log(`✅ Populated graded variation for question ${q.id}: ${variation.pointsAwarded}/${q.points} pts`);
                }
              }
            }
          }
        }

        // Recalculate score
        let totalPointsEarned = 0;
        let totalPointsPossible = 0;
        let correctCount = 0;

        for (const q of allQuestions) {
          totalPointsPossible += q.points;
          const userAnswer = attempt.answers?.[q.id];

          if (q.question_type === 'short-answer' || q.question_type === 'text') {
            // Use manual grading (support both 'short-answer' and legacy 'text')
            const grading = gradedAnswers[q.id];
            if (grading) {
              totalPointsEarned += grading.pointsAwarded;
              if (grading.pointsAwarded === q.points) correctCount++;
            }
          } else {
            // Auto-grade other question types
            if (userAnswer !== undefined && userAnswer !== null) {
              const isCorrect = checkAnswer(userAnswer, q.correct_answer, q.question_type);
              if (isCorrect) {
                totalPointsEarned += q.points;
                correctCount++;
              }
            }
          }
        }

        const score = totalPointsPossible > 0 
          ? Math.round((totalPointsEarned / totalPointsPossible) * 100) 
          : 0;

        // Get quiz passing score
        const { data: quizData } = await supabaseClient
          .from('course_quizzes')
          .select('passing_score')
          .eq('id', attempt.quiz_id)
          .single();

        const passingScore = quizData?.passing_score || 70;
        const isPassed = score >= passingScore;

        // Update attempt - always release grades when grading
        const updateData: any = {
          graded_answers: gradedAnswers,
          score,
          correct_answers: correctCount,
          is_passed: isPassed,
          grades_released: true  // Always release when instructor grades
        };

        const { error: updateError } = await supabaseClient
          .from('quiz_attempts')
          .update(updateData)
          .eq('id', attemptId);

        if (updateError) throw updateError;

        results.push({
          attemptId,
          userId: attempt.user_id,
          success: true,
          newScore: score,
          isPassed
        });

        // Check if ALL short-answer questions for this user have been graded
        // before sending notification
        const allShortAnswersGraded = allQuestions
          .filter(q => q.question_type === 'short-answer' || q.question_type === 'text')
          .every(q => gradedAnswers[q.id] !== undefined);

        // Send notification to student only if all their short-answers are graded
        if (quizDetails && allShortAnswersGraded) {
          const courseTitle = quizDetails.courses?.title || 'Unknown Course';
          const courseId = quizDetails.course_id;
          notificationPromises.push(
            sendNotification(supabaseClient, {
              userId: attempt.user_id,
              title: "Quiz Graded",
              message: `Your quiz "${quizDetails.title}" in ${courseTitle} has been graded. Score: ${score}%${isPassed ? ' (Passed)' : ''}`,
              type: "grade",
              actionUrl: courseId ? `/course/${courseId}` : undefined,
              relatedEntityType: courseId ? "course" : undefined,
              relatedEntityId: courseId ?? undefined,
              priority: "normal"
            })
          );
        } else if (quizDetails && !allShortAnswersGraded) {
          console.log(`⏳ Skipping notification for user ${attempt.user_id} - not all short-answer questions graded yet`);
        }

      } catch (error) {
        console.error(`Error grading attempt ${attemptId}:`, error);
        errors.push({ 
          attemptId, 
          error: error.message || "Unknown error" 
        });
      }
    }

    // Send all notifications
    await Promise.allSettled(notificationPromises);
    console.log(`📧 Sent ${notificationPromises.length} grading notifications`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Graded ${results.length} attempts successfully`,
        data: {
          successful: results,
          failed: errors,
          totalProcessed: attemptIds.length
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error("Error in gradeAnswerVariation:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "An error occurred while grading",
        error: error.message || "Unknown error"
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// Helper function to check answer correctness (same logic as submitQuiz)
function checkAnswer(userAnswer: any, correctAnswer: any, questionType: string): boolean {
  if (questionType === 'multiple-correct') {
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
    
    const userSorted = JSON.stringify([...userArray].sort());
    const correctSorted = JSON.stringify([...correctArray].sort());
    return userSorted === correctSorted;
  } else if (questionType === 'matching') {
    // Parse arrays if they're JSON strings
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
  } else {
    return String(userAnswer).trim() === String(correctAnswer).trim();
  }
}
