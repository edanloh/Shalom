import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QuestionAttempt {
  questionId: string;
  questionNumber: number;
  questionText: string;
  questionType: string;
  studentAnswer: any;
  correctAnswer: any;
  pointsEarned: number;
  maxPoints: number;
  feedback: string | null;
  isCorrect: boolean | null;
  options?: any[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get attemptId from URL path (e.g., /getStudentAttemptDetails/uuid-here)
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const attemptId = pathParts[pathParts.length - 1];

    console.log('Received attemptId:', attemptId);
    console.log('Full URL:', req.url);
    console.log('Path parts:', pathParts);

    if (!attemptId || attemptId === 'getStudentAttemptDetails') {
      throw new Error('Attempt ID is required');
    }

    // Fetch the quiz attempt (without joins to avoid FK issues)
    const { data: attempt, error: attemptError } = await supabaseClient
      .from('quiz_attempts')
      .select('*')
      .eq('id', attemptId)
      .single();

    if (attemptError) {
      console.error('Error fetching quiz attempt:', attemptError);
      throw new Error(`Quiz attempt not found: ${attemptError.message}`);
    }

    if (!attempt) {
      throw new Error('Quiz attempt not found - no data returned');
    }

    // Fetch user details separately
    const { data: user, error: userError } = await supabaseClient
      .from('users')
      .select('*')
      .eq('id', attempt.user_id)
      .single();

    if (userError) {
      console.error('Error fetching user:', userError);
    }

    console.log('User data:', user);
    console.log('User fields available:', user ? Object.keys(user) : 'null');

    // Extract user name with flexible field access
    const userName = user ? (user.full_name || user.name || user.username || user.display_name || 'Unknown Student') : 'Unknown Student';
    const userEmail = user ? (user.email || '') : '';

    console.log('Extracted userName:', userName);
    console.log('Extracted userEmail:', userEmail);

    // Fetch quiz details separately
    const { data: quiz, error: quizError } = await supabaseClient
      .from('course_quizzes')
      .select('title, passing_score, course_id')
      .eq('id', attempt.quiz_id)
      .single();

    if (quizError) {
      console.error('Error fetching quiz:', quizError);
    }

    // Fetch course details if quiz was found
    let course = null;
    if (quiz?.course_id) {
      const { data: courseData, error: courseError } = await supabaseClient
        .from('courses')
        .select('title')
        .eq('id', quiz.course_id)
        .single();

      if (courseError) {
        console.error('Error fetching course:', courseError);
      } else {
        course = courseData;
      }
    }

    // Fetch all questions for this quiz
    const { data: questions, error: questionsError } = await supabaseClient
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', attempt.quiz_id);

    if (questionsError) {
      console.error('Error fetching quiz questions:', questionsError);
      throw new Error(`Failed to fetch quiz questions: ${questionsError.message}`);
    }

    if (!questions || questions.length === 0) {
      console.warn('No questions found for quiz:', attempt.quiz_id);
      // Return empty attempt details instead of failing
    }

    // Sort questions by order or id (in case question_number column doesn't exist)
    const sortedQuestions = (questions || []).sort((a, b) => {
      // Try to sort by 'order' field first, then 'position', then 'id'
      if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
      if (a.position !== undefined && b.position !== undefined) return a.position - b.position;
      return String(a.id).localeCompare(String(b.id));
    });

    // Parse answers and graded_answers from the attempt
    let attemptAnswers: any = {};
    let gradedAnswers: any = {};

    try {
      if (attempt.answers) {
        attemptAnswers = typeof attempt.answers === 'string' 
          ? JSON.parse(attempt.answers) 
          : attempt.answers;
      }
      console.log('Parsed attemptAnswers:', attemptAnswers);
    } catch (e) {
      console.error('Error parsing answers:', e);
    }

    try {
      if (attempt.graded_answers) {
        gradedAnswers = typeof attempt.graded_answers === 'string' 
          ? JSON.parse(attempt.graded_answers) 
          : attempt.graded_answers;
      }
      console.log('Parsed gradedAnswers:', gradedAnswers);
    } catch (e) {
      console.error('Error parsing graded_answers:', e);
    }

    // Build question attempts array
    const questionAttempts: QuestionAttempt[] = sortedQuestions.map((question, index) => {
      const studentAnswer = attemptAnswers[question.id];
      const gradedAnswer = Array.isArray(gradedAnswers) 
        ? gradedAnswers.find((ga: any) => ga.questionId === question.id)
        : gradedAnswers[question.id];

      console.log(`Question ${index + 1} (${question.id}):`, {
        type: question.question_type,
        studentAnswer,
        correctAnswer: question.correct_answer,
        gradedAnswer,
        hasOptions: !!question.options
      });

      // Normalize question type for comparison
      const normalizedType = (question.question_type || '').toLowerCase().replace(/[_-]/g, '');
      console.log(`Question ${question.id} normalized type: "${normalizedType}"`);

      let isCorrect: boolean | null = null;
      let pointsEarned = 0;
      let feedback: string | null = null;

      // Handle graded answers (for manual grading)
      if (gradedAnswer) {
        pointsEarned = gradedAnswer.pointsAwarded || gradedAnswer.points || 0;
        feedback = gradedAnswer.feedback || null;
        const maxPoints = question.points || 10;
        isCorrect = pointsEarned >= maxPoints; // Full points = correct
      }
      // Auto-graded questions (MCQ, True/False)
      else if (normalizedType === 'mcq' || normalizedType === 'multiplechoice' || normalizedType === 'truefalse') {
        const correctAnswer = question.correct_answer;
        isCorrect = studentAnswer === correctAnswer;
        pointsEarned = isCorrect ? (question.points || 10) : 0;
        console.log(`Auto-graded question ${question.id}: ${studentAnswer} === ${correctAnswer} = ${isCorrect}`);
      }
      // Matching questions
      else if (normalizedType === 'matching') {
        // Matching questions compare student pairs with correct pairs (by value, not position)
        const correctPairs = question.correct_answer || [];
        const studentPairs = studentAnswer || [];
        
        console.log(`Matching question ${question.id}:`, {
          correctPairs,
          studentPairs,
          bothArrays: Array.isArray(correctPairs) && Array.isArray(studentPairs)
        });
        
        // Grade matching question
        if (Array.isArray(correctPairs) && Array.isArray(studentPairs)) {
          const totalPairs = correctPairs.length;
          
          // First check: counts must match
          if (studentPairs.length !== totalPairs) {
            isCorrect = false;
            pointsEarned = 0; // No partial credit if wrong number of pairs
            console.log(`Matching result: INCORRECT - pair count mismatch (${studentPairs.length} vs ${totalPairs})`);
          } else {
            // Second check: count how many pairs are correct (regardless of order)
            const correctCount = studentPairs.filter((studentPair: any) => {
              return correctPairs.some((correctPair: any) => 
                correctPair.left === studentPair.left && correctPair.right === studentPair.right
              );
            }).length;
            
            if (totalPairs > 0) {
              // Award full points only if all pairs are correct
              isCorrect = correctCount === totalPairs;
              pointsEarned = isCorrect ? (question.points || 10) : 0;
            }
            console.log(`Matching result: ${correctCount}/${totalPairs} pairs correct, isCorrect: ${isCorrect}, points: ${pointsEarned}`);
          }
        }
      }
      // Short answer without grading
      else if (normalizedType === 'shortanswer' || normalizedType === 'text') {
        pointsEarned = 0; // Not graded yet
        isCorrect = null; // Unknown
      }

      // Parse options if they exist
      let questionOptions = null;
      try {
        if (question.options) {
          questionOptions = typeof question.options === 'string' 
            ? JSON.parse(question.options) 
            : question.options;
        }
        console.log(`Question ${question.id} options:`, questionOptions);
      } catch (e) {
        console.error('Error parsing question options:', e);
      }

      // Get question text with all possible field names
      const questionText = question.question_text || question.question || question.text || 'Question text not available';
      console.log(`Question ${question.id} text:`, questionText);

      return {
        questionId: question.id,
        questionNumber: question.question_number || question.order || question.position || (index + 1),
        questionText: questionText,
        questionType: question.question_type || question.type,
        studentAnswer: studentAnswer || 'No answer provided',
        correctAnswer: question.correct_answer || null,
        pointsEarned,
        maxPoints: question.points || 10,
        feedback,
        isCorrect,
        options: questionOptions,
      };
    });

    // Calculate total points
    const totalPointsEarned = questionAttempts.reduce((sum, q) => sum + q.pointsEarned, 0);
    const totalMaxPoints = questionAttempts.reduce((sum, q) => sum + q.maxPoints, 0);
    const scorePercentage = totalMaxPoints > 0 ? Math.round((totalPointsEarned / totalMaxPoints) * 100) : 0;

    // Get submission date with flexible field access
    const submittedAt = attempt.completed_at || attempt.submitted_at || attempt.created_at || new Date().toISOString();

    // Build response
    const response = {
      attemptId: attempt.id,
      quizId: attempt.quiz_id,
      quizTitle: quiz?.title || 'Unknown Quiz',
      courseTitle: course?.title || 'Unknown Course',
      studentId: attempt.user_id,
      studentName: userName,
      studentEmail: userEmail,
      score: scorePercentage,
      isPassed: scorePercentage >= (quiz?.passing_score || 60),
      submittedAt: submittedAt,
      totalPointsEarned,
      totalMaxPoints,
      questionAttempts,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error('Error in getStudentAttemptDetails:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
