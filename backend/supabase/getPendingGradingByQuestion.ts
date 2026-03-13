// supabase/functions/getPendingGradingByQuestion/index.ts
/**
 * Supabase Edge Function: getPendingGradingByQuestion
 * Purpose: Fetch pending grading grouped by question with answer variations
 * Endpoint: GET /getPendingGradingByQuestion/{instructorId}?courseId={courseId}&moduleId={moduleId}&quizId={quizId}
 * 
 * Returns questions with unique answer variations (deduplicates identical answers)
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
};

interface StudentAnswer {
  attemptId: string;
  attemptNumber: number;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentAnswer: string;
  submittedAt: string;
  totalScore: number;
  isPassed: boolean;
  gradesReleased?: boolean;
}

interface AnswerVariation {
  variationId: string; // hash of the answer
  answerText: string;
  studentCount: number;
  isGraded: boolean;
  gradedPoints: number | null;
  gradedFeedback: string | null;
  students: StudentAnswer[];
}

interface QuestionGrading {
  questionId: string;
  questionText: string;
  questionImageUrl: string | null;
  questionExplanation: string | null;
  maxPoints: number;
  sampleAnswer: string;
  quizId: string;
  quizTitle: string;
  courseId: string;
  courseTitle: string;
  moduleId: string | null;
  moduleTitle: string | null;
  totalPendingCount: number;
  orderIndex: number;
  variations: AnswerVariation[];
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
    const instructorId = pathParts[pathParts.length - 1];
    const courseId = url.searchParams.get('courseId');
    const moduleId = url.searchParams.get('moduleId');
    const quizId = url.searchParams.get('quizId');

    if (!instructorId || instructorId === 'getPendingGradingByQuestion') {
      return new Response(
        JSON.stringify({ success: false, message: "Instructor ID is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching pending grading by question:', { instructorId, courseId, moduleId, quizId });

    // Get instructor's courses
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
        JSON.stringify({ success: true, message: "No courses found", data: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get quizzes
    let quizzesQuery = supabaseClient
      .from('course_quizzes')
      .select('id, title, course_id, section_id')
      .in('course_id', courseIds);

    if (moduleId) {
      quizzesQuery = quizzesQuery.eq('section_id', moduleId);
    }

    if (quizId) {
      quizzesQuery = quizzesQuery.eq('id', quizId);
    }

    const { data: quizzes, error: quizzesError } = await quizzesQuery;
    if (quizzesError) throw quizzesError;

    const quizIds = quizzes?.map(q => q.id) || [];
    if (quizIds.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No quizzes found", data: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get short-answer questions (support both 'short-answer' and legacy 'text')
    const { data: questions, error: questionsError } = await supabaseClient
      .from('quiz_questions')
      .select('id, quiz_id, question, question_type, correct_answer, points, image_url, explanation, graded_variations, order_index')
      .in('quiz_id', quizIds)
      .in('question_type', ['short-answer', 'text'])
      .order('order_index', { ascending: true });

    if (questionsError) throw questionsError;

    if (!questions || questions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No short-answer questions found", data: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get quiz attempts
    const { data: attempts, error: attemptsError } = await supabaseClient
      .from('quiz_attempts')
      .select(`
        id,
        user_id,
        quiz_id,
        score,
        is_passed,
        answers,
        attempt_number,
        completed_at,
        graded_answers,
        grades_released
      `)
      .in('quiz_id', quizIds)
      .order('completed_at', { ascending: false });

    if (attemptsError) throw attemptsError;

    // Get user info
    const userIds = [...new Set(attempts?.map(a => a.user_id) || [])];
    const { data: users, error: usersError } = await supabaseClient
      .from('users')
      .select('id, name, email')
      .in('id', userIds);

    if (usersError) throw usersError;

    const usersMap = new Map(users?.map(u => [u.id, u]) || []);
    const coursesMap = new Map(courses?.map(c => [c.id, c]) || []);
    const quizzesMap = new Map(quizzes?.map(q => [q.id, q]) || []);

    // Get sections
    const sectionIds = [...new Set(quizzes?.map(q => q.section_id).filter(Boolean) || [])];
    const { data: sections } = await supabaseClient
      .from('course_sections')
      .select('id, title')
      .in('id', sectionIds);

    const sectionsMap = new Map(sections?.map(s => [s.id, s]) || []);

    // Group by question and deduplicate answers
    const questionGradingMap = new Map<string, QuestionGrading>();

    questions.forEach(question => {
      const quiz = quizzesMap.get(question.quiz_id);
      const course = coursesMap.get(quiz?.course_id);
      const section = sectionsMap.get(quiz?.section_id);

      if (!quiz || !course) return;

      // Initialize question grading data
      if (!questionGradingMap.has(question.id)) {
        questionGradingMap.set(question.id, {
          questionId: question.id,
          questionText: question.question,
          questionImageUrl: question.image_url,
          questionExplanation: question.explanation || null,
          maxPoints: question.points,
          sampleAnswer: question.correct_answer,
          quizId: quiz.id,
          quizTitle: quiz.title,
          courseId: course.id,
          courseTitle: course.title,
          moduleId: section?.id || null,
          moduleTitle: section?.title || null,
          totalPendingCount: 0,
          orderIndex: question.order_index,
          variations: []
        });
      }

      const questionGrading = questionGradingMap.get(question.id)!;
      const answerVariationsMap = new Map<string, AnswerVariation>();
      const gradedVariations = question.graded_variations || {};

      // Process attempts for this question
      attempts?.forEach(attempt => {
        if (attempt.quiz_id !== question.quiz_id) return;

        const userAnswer = attempt.answers?.[question.id];
        const gradedAnswers = attempt.graded_answers || {};
        const attemptGrading = gradedAnswers[question.id];

        // Include all students who answered
        if (userAnswer) {
          const user = usersMap.get(attempt.user_id);
          if (!user) return;

          // Normalize answer for deduplication (trim, lowercase)
          const normalizedAnswer = String(userAnswer).trim().toLowerCase();
          const variationId = normalizedAnswer; // Use normalized answer as ID
          
          // Check if this variation has been graded (from quiz_questions.graded_variations)
          const variationGrade = gradedVariations[normalizedAnswer];
          const isGraded = variationGrade !== undefined;

          if (!answerVariationsMap.has(variationId)) {
            answerVariationsMap.set(variationId, {
              variationId,
              answerText: String(userAnswer).trim(), // Keep original casing for display
              studentCount: 0,
              isGraded: isGraded,
              gradedPoints: isGraded ? variationGrade.pointsAwarded : null,
              gradedFeedback: isGraded ? (variationGrade.feedback || null) : null,
              students: []
            });
          }

          const variation = answerVariationsMap.get(variationId)!;
          variation.studentCount++;
          variation.students.push({
            attemptId: attempt.id,
            attemptNumber: attempt.attempt_number,
            studentId: user.id,
            studentName: user.name,
            studentEmail: user.email,
            studentAnswer: String(userAnswer).trim(),
            submittedAt: attempt.completed_at,
            totalScore: attempt.score,
            isPassed: attempt.is_passed,
            gradesReleased: attempt.grades_released || false
          });

          // Only count ungraded as pending
          if (!isGraded) {
            questionGrading.totalPendingCount++;
          }
        }
      });

      // Convert map to array and sort by student count (most common first)
      questionGrading.variations = Array.from(answerVariationsMap.values())
        .sort((a, b) => b.studentCount - a.studentCount);
    });

    // Convert to array and show all questions with variations (graded or ungraded)
    // Sort by quiz title, then by order_index to maintain proper question order
    const result = Array.from(questionGradingMap.values())
      .filter(q => q.variations.length > 0)
      .sort((a, b) => {
        // First sort by quiz title
        const quizCompare = a.quizTitle.localeCompare(b.quizTitle);
        if (quizCompare !== 0) return quizCompare;
        // Then by order_index to maintain question order within quiz
        return a.orderIndex - b.orderIndex;
      });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Pending grading by question retrieved successfully",
        data: result
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error("Error retrieving pending grading by question:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "An error occurred",
        error: error.message || "Unknown error"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
