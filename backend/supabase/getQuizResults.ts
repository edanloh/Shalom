// supabase/functions/getQuizResults/index.ts
/**
 * Supabase Edge Function: getQuizResults
 * Purpose: Get comprehensive quiz results and analytics for instructors
 * Endpoint: GET /getQuizResults/{quizId}
 * Database: PostgreSQL (Supabase compatible)
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
};

interface QuizAttempt {
  id: string;
  user_id: string;
  quiz_id: string;
  attempt_number: number;
  score: number;
  total_questions: number;
  correct_answers: number;
  is_passed: boolean;
  completed_at: string;
  answers: any;
  graded_answers: any;
}

serve(async (req) => {
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
    const quizId = pathParts[pathParts.length - 1];

    if (!quizId || quizId === 'getQuizResults') {
      return new Response(
        JSON.stringify({ success: false, message: "Quiz ID is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching quiz results for:', quizId);

    // ========================================
    // 1. Get quiz details
    // ========================================
    const { data: quiz, error: quizError } = await supabaseClient
      .from('course_quizzes')
      .select(`
        id,
        title,
        passing_score,
        course_id,
        courses (
          id,
          title
        )
      `)
      .eq('id', quizId)
      .single();

    if (quizError || !quiz) {
      return new Response(
        JSON.stringify({ success: false, message: "Quiz not found" }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========================================
    // 2. Get all questions for this quiz
    // ========================================
    const { data: questions, error: questionsError } = await supabaseClient
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', quizId);

    if (questionsError) throw questionsError;

    // Sort questions by available order field
    const sortedQuestions = (questions || []).sort((a: any, b: any) => {
      if (a.order_index !== undefined && b.order_index !== undefined) return a.order_index - b.order_index;
      if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
      if (a.position !== undefined && b.position !== undefined) return a.position - b.position;
      return String(a.id).localeCompare(String(b.id));
    });

    const totalQuestions = sortedQuestions?.length || 0;
    const questionsMap = new Map(sortedQuestions?.map(q => [q.id, q]) || []);

    // ========================================
    // 3. Get all quiz attempts (without join to avoid FK issues)
    // ========================================
    console.log('Fetching attempts for quizId:', quizId);
    
    const { data: attempts, error: attemptsError } = await supabaseClient
      .from('quiz_attempts')
      .select('*')
      .eq('quiz_id', quizId)
      .order('completed_at', { ascending: false });

    console.log('Attempts query result:', {
      error: attemptsError,
      attemptsCount: attempts?.length || 0,
      attempts: attempts?.slice(0, 2) // Log first 2 for brevity
    });

    if (attemptsError) {
      console.error('Error fetching attempts:', attemptsError);
      throw attemptsError;
    }

    if (!attempts || attempts.length === 0) {
      console.log('No attempts found for quiz:', quizId);
      
      // No attempts yet - return empty stats
      return new Response(
        JSON.stringify({
          success: true,
          message: "No attempts found for this quiz",
          data: {
            quizId,
            quizTitle: quiz.title,
            courseTitle: quiz.courses?.title || 'Unknown Course',
            totalQuestions,
            overallStats: {
              avgScore: 0,
              passRate: 0,
              totalAttempts: 0,
              highScore: 0,
              lowScore: 0,
            },
            scoreDistribution: [
              { range: "0-20%", count: 0 },
              { range: "20-40%", count: 0 },
              { range: "40-60%", count: 0 },
              { range: "60-80%", count: 0 },
              { range: "80-100%", count: 0 },
            ],
            studentScores: [],
            questionBreakdown: [],
            attemptHistory: [],
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========================================
    // 3.5. Fetch user data separately for all unique user_ids
    // ========================================
    const uniqueUserIds = [...new Set(attempts.map(a => a.user_id))];
    console.log('Fetching user data for', uniqueUserIds.length, 'unique users');
    
    const { data: users, error: usersError } = await supabaseClient
      .from('users')
      .select('id, name, email')
      .in('id', uniqueUserIds);
    
    if (usersError) {
      console.error('Error fetching users:', usersError);
    }
    
    // Create user map for quick lookup with flexible field access
    const usersMap = new Map(
      users?.map(u => [
        u.id, 
        {
          id: u.id,
          name: u.full_name || u.name || u.username || u.display_name || 'Unknown Student',
          email: u.email || ''
        }
      ]) || []
    );
    console.log('Fetched', users?.length || 0, 'users');

    // ========================================
    // 4. Calculate overall statistics
    // ========================================
    const totalAttempts = attempts.length;
    const scores = attempts.map(a => a.score);
    const avgScore = scores.reduce((sum, score) => sum + score, 0) / totalAttempts;
    const passedCount = attempts.filter(a => a.is_passed).length;
    const passRate = Math.round((passedCount / totalAttempts) * 100);
    const highScore = Math.max(...scores);
    const lowScore = Math.min(...scores);

    // ========================================
    // 5. Calculate score distribution
    // ========================================
    const distribution = {
      "0-20%": 0,
      "20-40%": 0,
      "40-60%": 0,
      "60-80%": 0,
      "80-100%": 0,
    };

    attempts.forEach(attempt => {
      const score = attempt.score;
      if (score < 20) distribution["0-20%"]++;
      else if (score < 40) distribution["20-40%"]++;
      else if (score < 60) distribution["40-60%"]++;
      else if (score < 80) distribution["60-80%"]++;
      else distribution["80-100%"]++;
    });

    const scoreDistribution = Object.entries(distribution).map(([range, count]) => ({
      range,
      count
    }));

    // ========================================
    // 6. Aggregate student scores (best attempt per student)
    // ========================================
    const studentAttemptsMap = new Map<string, any[]>();
    
    attempts.forEach(attempt => {
      const userId = attempt.user_id;
      if (!studentAttemptsMap.has(userId)) {
        studentAttemptsMap.set(userId, []);
      }
      studentAttemptsMap.get(userId)!.push(attempt);
    });

    const studentScores = Array.from(studentAttemptsMap.entries()).map(([userId, userAttempts]) => {
      // Sort by score (best first) for finding best attempt
      const sortedByScore = [...userAttempts].sort((a, b) => b.score - a.score);
      const bestAttempt = sortedByScore[0];
      
      // Sort by date (latest first) for finding latest attempt
      const sortedByDate = [...userAttempts].sort((a, b) => 
        new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
      );
      const latestAttempt = sortedByDate[0];

      // Get user data from the usersMap
      const user = usersMap.get(userId) || { name: 'Unknown Student', email: '' };
      
      // Format date as relative time for latest attempt
      const completedDate = new Date(latestAttempt.completed_at);
      const now = new Date();
      const diffMs = now.getTime() - completedDate.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);
      
      let dateString = '';
      if (diffHours < 1) dateString = 'Less than 1 hour ago';
      else if (diffHours < 24) dateString = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      else if (diffDays === 1) dateString = '1 day ago';
      else if (diffDays < 7) dateString = `${diffDays} days ago`;
      else dateString = completedDate.toLocaleDateString();

      // Format all attempts for this student
      const allAttempts = sortedByDate.map((attempt, index) => {
        const attemptDate = new Date(attempt.completed_at);
        const timeDiff = now.getTime() - attemptDate.getTime();
        const hoursAgo = Math.floor(timeDiff / (1000 * 60 * 60));
        const daysAgo = Math.floor(hoursAgo / 24);
        
        let attemptDateString = '';
        if (hoursAgo < 1) attemptDateString = 'Less than 1 hour ago';
        else if (hoursAgo < 24) attemptDateString = `${hoursAgo} hour${hoursAgo > 1 ? 's' : ''} ago`;
        else if (daysAgo === 1) attemptDateString = '1 day ago';
        else if (daysAgo < 7) attemptDateString = `${daysAgo} days ago`;
        else attemptDateString = attemptDate.toLocaleString();

        return {
          attemptId: attempt.id,
          attemptNumber: attempt.attempt_number || (sortedByDate.length - index), // Use attempt_number from DB or calculate
          score: Math.round(attempt.score),
          status: attempt.is_passed ? 'Passed' : 'Failed',
          completedAt: attemptDateString,
          completedAtRaw: attempt.completed_at,
        };
      });

      return {
        studentId: userId,
        studentName: user.name,
        studentEmail: user.email,
        score: Math.round(bestAttempt.score),
        status: bestAttempt.is_passed ? 'Passed' : 'Failed',
        attempts: userAttempts.length,
        lastAttemptDate: dateString,
        lastAttemptId: latestAttempt.id, // Include attempt ID for fetching details
        allAttempts, // Include all attempts for collapsible view
      };
    });

    // Sort by score descending
    studentScores.sort((a, b) => b.score - a.score);

    // ========================================
    // 7. Calculate question-level breakdown
    // ========================================
    const questionStats = new Map<string, { correct: number; total: number; points: number[] }>();

    attempts.forEach(attempt => {
      // Parse JSON fields if they're strings
      let gradedAnswers: any = [];
      let answers: any = {};
      
      try {
        if (typeof attempt.graded_answers === 'string') {
          gradedAnswers = JSON.parse(attempt.graded_answers);
        } else if (Array.isArray(attempt.graded_answers)) {
          gradedAnswers = attempt.graded_answers;
        } else if (attempt.graded_answers && typeof attempt.graded_answers === 'object') {
          gradedAnswers = attempt.graded_answers;
        }
      } catch (e) {
        console.warn('Failed to parse graded_answers:', e);
      }
      
      try {
        if (typeof attempt.answers === 'string') {
          answers = JSON.parse(attempt.answers);
        } else if (attempt.answers && typeof attempt.answers === 'object') {
          answers = attempt.answers;
        }
      } catch (e) {
        console.warn('Failed to parse answers:', e);
      }

      console.log('Attempt data:', {
        attemptId: attempt.id,
        hasGradedAnswers: !!gradedAnswers,
        gradedAnswersLength: Array.isArray(gradedAnswers) ? gradedAnswers.length : 0,
        hasAnswers: !!answers,
        answersType: Array.isArray(answers) ? 'array' : typeof answers,
        gradedAnswers,
        answers
      });

      // Process graded answers (from graded_answers field)
      if (Array.isArray(gradedAnswers)) {
        gradedAnswers.forEach((graded: any) => {
          const questionId = graded.questionId;
          if (!questionStats.has(questionId)) {
            questionStats.set(questionId, { correct: 0, total: 0, points: [] });
          }
          const stats = questionStats.get(questionId)!;
          stats.total++;
          if (graded.isCorrect) stats.correct++;
          if (graded.pointsAwarded !== undefined && graded.pointsAwarded !== null) {
            stats.points.push(graded.pointsAwarded);
          }
        });
      }

      // Also process regular answers for auto-graded questions
      // answers could be array or object with questionIds as keys
      const answerEntries = Array.isArray(answers) 
        ? answers.map((a: any) => [a.questionId, a.answer])
        : Object.entries(answers);

      answerEntries.forEach(([questionId, studentAnswer]: [any, any]) => {
        const question = questionsMap.get(questionId);
        
        console.log(`Processing answer for question ${questionId}:`, {
          questionType: question?.question_type,
          hasQuestion: !!question,
          studentAnswer,
          alreadyGraded: Array.isArray(gradedAnswers) && gradedAnswers.some((g: any) => g.questionId === questionId)
        });
        
        // Skip if already counted in graded_answers or if it's a short-answer question
        if (!question || question.question_type === 'short_answer' || question.question_type === 'short-answer' || question.question_type === 'text') {
          console.log(`Skipping question ${questionId} - type: ${question?.question_type}`);
          return;
        }

        // Check if this was already processed in graded_answers
        const alreadyGraded = Array.isArray(gradedAnswers) && gradedAnswers.some((g: any) => g.questionId === questionId);
        if (alreadyGraded) {
          console.log(`Question ${questionId} already graded, skipping`);
          return;
        }

        if (!questionStats.has(questionId)) {
          questionStats.set(questionId, { correct: 0, total: 0, points: [] });
        }
        
        const stats = questionStats.get(questionId)!;
        stats.total++;
        
        // Check if answer is correct based on question type
        let isCorrect = false;
        if (question.question_type === 'mcq' || question.question_type === 'multiple-choice') {
          isCorrect = studentAnswer === question.correct_answer;
        } else if (question.question_type === 'true_false' || question.question_type === 'true-false') {
          isCorrect = studentAnswer === question.correct_answer;
        } else if (question.question_type === 'matching') {
          // For matching, compare student pairs with correct pairs (by value, not position)
          const correctPairs = question.correct_answer || [];
          const studentPairs = studentAnswer || [];
          
          console.log(`Matching question ${questionId}:`, {
            correctPairs,
            studentPairs,
            bothArrays: Array.isArray(correctPairs) && Array.isArray(studentPairs)
          });
          
          if (Array.isArray(correctPairs) && Array.isArray(studentPairs)) {
            // First check: counts must match
            if (studentPairs.length !== correctPairs.length) {
              isCorrect = false;
              console.log(`Matching result: INCORRECT - pair count mismatch (${studentPairs.length} vs ${correctPairs.length})`);
            } else {
              // Second check: all student pairs must match correct pairs (regardless of order)
              const allPairsCorrect = studentPairs.every((studentPair: any) => {
                return correctPairs.some((correctPair: any) => 
                  correctPair.left === studentPair.left && correctPair.right === studentPair.right
                );
              });
              isCorrect = allPairsCorrect;
              console.log(`Matching result: ${isCorrect ? 'CORRECT' : 'INCORRECT'} - all ${studentPairs.length} pairs validated`);
            }
          }
        }
        
        console.log(`Question ${questionId} final result: isCorrect=${isCorrect}`);
        
        if (isCorrect) {
          stats.correct++;
          stats.points.push(question.points || 0);
        }
      });
    });

    const questionBreakdown = Array.from(questionsMap.values()).map((question: any, index: number) => {
      const stats = questionStats.get(question.id) || { correct: 0, total: 0, points: [] };
      const correctPercentage = stats.total > 0 
        ? Math.round((stats.correct / stats.total) * 100)
        : 0;
      const avgPoints = stats.points.length > 0
        ? stats.points.reduce((sum, p) => sum + p, 0) / stats.points.length
        : null;

      // Get question text with flexible field names
      const questionText = question.question_text || question.question || question.text || 'Question text not available';

      return {
        questionId: question.id,
        questionNumber: index + 1,
        questionText,
        questionType: question.question_type || question.type,
        correctPercentage,
        avgPoints,
      };
    });

    // ========================================
    // 8. Group attempts by date for timeline
    // ========================================
    const dateAttemptsMap = new Map<string, { count: number; scores: number[] }>();

    attempts.forEach(attempt => {
      const date = new Date(attempt.completed_at);
      const today = new Date();
      const diffDays = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

      let dateKey = '';
      if (diffDays === 0) dateKey = 'Today';
      else if (diffDays === 1) dateKey = 'Yesterday';
      else if (diffDays < 7) dateKey = `${diffDays} days ago`;
      else dateKey = date.toLocaleDateString();

      if (!dateAttemptsMap.has(dateKey)) {
        dateAttemptsMap.set(dateKey, { count: 0, scores: [] });
      }

      const dayStats = dateAttemptsMap.get(dateKey)!;
      dayStats.count++;
      dayStats.scores.push(attempt.score);
    });

    const attemptHistory = Array.from(dateAttemptsMap.entries()).map(([date, stats]) => ({
      date,
      attemptCount: stats.count,
      avgScore: stats.scores.reduce((sum, s) => sum + s, 0) / stats.count,
    }));

    // ========================================
    // 9. Return results
    // ========================================
    const results = {
      quizId,
      quizTitle: quiz.title,
      courseTitle: quiz.courses?.title || 'Unknown Course',
      totalQuestions,
      overallStats: {
        avgScore: Math.round(avgScore * 10) / 10,
        passRate,
        totalAttempts,
        highScore: Math.round(highScore),
        lowScore: Math.round(lowScore),
      },
      scoreDistribution,
      studentScores,
      questionBreakdown,
      attemptHistory,
    };

    return new Response(
      JSON.stringify({
        success: true,
        message: "Quiz results retrieved successfully",
        data: results
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error retrieving quiz results:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : "Failed to retrieve quiz results"
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
