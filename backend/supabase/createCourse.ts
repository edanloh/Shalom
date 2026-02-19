// supabase/functions/createCourse/index.ts
/**
 * Supabase Edge Function: createCourse
 * Purpose: Create a new course with category handling and instructor assignment
 * Endpoint: POST /createCourse
 * Database: PostgreSQL (Supabase compatible)
 * 
 * UPDATED: Handles category by ID instead of name
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
};

const estimatePdfReadMinutes = (fileSizeBytes?: number | null) => {
  if (!Number.isFinite(fileSizeBytes) || (fileSizeBytes ?? 0) <= 0) return 0;
  const bytesPerPage = 200 * 1024; // ~200KB/page heuristic
  const pages = Math.max(1, Math.round((fileSizeBytes as number) / bytesPerPage));
  return Math.max(1, pages * 2); // ~2 minutes per page
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

    const body = await req.json();
    console.log('Create course request');

    const {
      title,
      description,
      category,  
      instructorId,
      instructorName,
      thumbnailUrl,
      durationHours = 0,
      tags = [],
      modules = [],
      outcomes = []
    } = body;

    let computedDurationMinutes = 0;
    for (const module of modules || []) {
      const lessons = module?.lessons || [];
      for (const lesson of lessons) {
        if ((lesson?.type || 'video') === 'pdf') {
          computedDurationMinutes += estimatePdfReadMinutes(lesson?.fileSize ?? null);
        } else {
          const seconds =
            Number(lesson?.durationSeconds) ||
            Number(lesson?.durationMinutes || 0) * 60 ||
            0;
          computedDurationMinutes += Math.round(seconds / 60);
        }
      }
    }
    const computedDurationHours =
      computedDurationMinutes > 0
        ? Math.round((computedDurationMinutes / 60) * 100) / 100
        : 0;

    if (!title || !instructorId) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Title and Instructor ID are required"
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Handle category - use provided categoryId or null
    let finalCategoryId = category || null;

    // If no category provided, use or create "General" category
    if (!finalCategoryId) {
      const { data: generalCategory } = await supabaseClient
        .from('categories')
        .select('id')
        .eq('name', 'General')
        .single();

      if (generalCategory) {
        finalCategoryId = generalCategory.id;
      } else {
        // Create General category
        const { data: newGeneral, error: generalError } = await supabaseClient
          .from('categories')
          .insert({
            name: 'General',
            color: '#6B7280',
            course_count: 0
          })
          .select('id')
          .single();

        if (generalError) throw generalError;
        finalCategoryId = newGeneral.id;
      }
    } else {
      // Validate that the provided category exists
      const { data: categoryExists } = await supabaseClient
        .from('categories')
        .select('id')
        .eq('id', finalCategoryId)
        .single();

      if (!categoryExists) {
        return new Response(
          JSON.stringify({
            success: false,
            message: "Invalid category ID provided"
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Create course
    const { data: course, error: courseError } = await supabaseClient
      .from('courses')
      .insert({
        title,
        description: description || '',
        category_id: finalCategoryId,
        instructor_id: instructorId,
        instructor_name: instructorName || 'Shalom Instructor',
        thumbnail_url: thumbnailUrl || null,
        duration_hours: durationHours > 0 ? durationHours : computedDurationHours,
        tags,
        is_published: false,
        rating: 0,
        student_count: 0
      })
      .select()
      .single();

    if (courseError) throw courseError;

    const normalizeResourceType = (lesson: any) => {
      const rawType = (lesson.resourceType || lesson.type || 'pdf').toString().toLowerCase();
      if (rawType === 'docx') return 'document';
      if (rawType === 'pptx' || rawType === 'slides') return 'ppt';
      if (rawType === 'document' || rawType === 'ppt' || rawType === 'pdf') return rawType;

      const url = (lesson.resourceUrl || '').toString().toLowerCase();
      if (url.endsWith('.docx')) return 'document';
      if (url.endsWith('.pptx') || url.endsWith('.ppt')) return 'ppt';
      if (url.endsWith('.pdf')) return 'pdf';

      return 'pdf';
    };

    // Insert modules (sections) with their lessons and quizzes
    const createdModules = [];
    for (let i = 0; i < modules.length; i++) {
      const module = modules[i];

      // Create section
      const { data: section, error: sectionError } = await supabaseClient
        .from('course_sections')
        .insert({
          course_id: course.id,
          title: module.title,
          description: module.description || '',
          order_index: module.order ?? i
        })
        .select()
        .single();

      if (sectionError) throw sectionError;

      // Create lessons (videos and documents) for this section
      const createdLessons = [];
      const lessons = module.lessons || [];
      for (let j = 0; j < lessons.length; j++) {
        const lesson = lessons[j];
        const lessonType = (lesson.type || 'video').toString().toLowerCase();
        const isDocumentLesson = lessonType !== 'video';

        if (isDocumentLesson) {
          // Insert document resource (PDF/DOCX/PPTX)
          const resourceType = normalizeResourceType(lesson);
          const { data: resourceData, error: resourceError } = await supabaseClient
            .from('course_resources')
            .insert({
              course_id: course.id,
              section_id: section.id,
              title: lesson.title,
              description: lesson.content || '',
              resource_url: lesson.resourceUrl || '',
              resource_type: resourceType,
              order_index: lesson.order ?? j,
              is_preview: lesson.isPreview || false,
              is_downloadable: lesson.isDownloadable !== undefined ? lesson.isDownloadable : true,
              file_size_bytes: lesson.fileSize || null,
              estimated_read_minutes: estimatePdfReadMinutes(lesson.fileSize || null)
            })
            .select()
            .single();

          if (resourceError) throw resourceError;
          createdLessons.push(resourceData);
        } else {
          // Insert video lesson
          const { data: lessonData, error: lessonError } = await supabaseClient
            .from('course_videos')
            .insert({
              course_id: course.id,
              section_id: section.id,
              title: lesson.title,
              description: lesson.content || '',
              video_url: lesson.videoUrl || '',
              duration_seconds: lesson.durationSeconds || ((lesson.durationMinutes || 0) * 60),
              order_index: lesson.order ?? j,
              is_preview: lesson.isPreview || false,
              thumbnail_url: lesson.thumbnailUrl || null
            })
            .select()
            .single();

          if (lessonError) throw lessonError;
          createdLessons.push(lessonData);
        }
      }

      // Create quizzes for this section
      const createdQuizzes = [];
      const quizzes = module.quizzes || [];
      for (let k = 0; k < quizzes.length; k++) {
        const quiz = quizzes[k];

        const { data: quizData, error: quizError } = await supabaseClient
          .from('course_quizzes')
          .insert({
            course_id: course.id,
            section_id: section.id,
            title: quiz.title,
            description: quiz.description || '',
            passing_score: quiz.passingScore || 70,
            order_index: quiz.order ?? k,
            time_limit_minutes: quiz.timeLimitMinutes || 30,
            max_attempts: quiz.maxAttempts === null ? null : quiz.maxAttempts ?? 1
          })
          .select()
          .single();

        if (quizError) throw quizError;

        // Create questions in quiz_questions table
        const questions = quiz.questions || [];
        const createdQuestions = [];
        for (let q = 0; q < questions.length; q++) {
          const question = questions[q];

          // Map question types to database-supported types
          let questionType = question.type || 'multiple-choice';
          // Support all question types: multiple-choice, multiple-correct, true-false, short-answer, matching, text
          if (questionType === 'text') {
            questionType = 'short-answer'; // Normalize legacy 'text' to 'short-answer'
          }

          // Serialize correctAnswer properly based on type
          let correctAnswerStr = '';
          let optionsArray = [];
          
          if (questionType === 'multiple-correct') {
            // For multiple-correct, store as JSON array of indices
            correctAnswerStr = JSON.stringify(Array.isArray(question.correctAnswer) ? question.correctAnswer : [question.correctAnswer]);
            optionsArray = question.options || [];
          } else if (questionType === 'matching') {
            // For matching, store matchingPairs in correct_answer
            correctAnswerStr = JSON.stringify(question.matchingPairs || []);
            // For matching, options can be derived from matchingPairs or left empty
            // The matchingPairs structure is [{ left: string, right: string }, ...]
            optionsArray = [];
          } else {
            // For single-answer types (multiple-choice, true-false, short-answer)
            correctAnswerStr = String(question.correctAnswer ?? '');
            optionsArray = question.options || [];
          }

          const { data: questionData, error: questionError } = await supabaseClient
            .from('quiz_questions')
            .insert({
              quiz_id: quizData.id,
              question: question.text || '',
              question_type: questionType,
              options: optionsArray,
              correct_answer: correctAnswerStr,
              explanation: question.explanation || question.sampleAnswer || '',
              points: question.points || 1,
              order_index: q,
              image_url: question.imageUrl || null
            })
            .select()
            .single();

          if (questionError) throw questionError;
          createdQuestions.push(questionData);
        }

        createdQuizzes.push({
          ...quizData,
          questions: createdQuestions
        });
      }

      createdModules.push({
        ...section,
        lessons: createdLessons,
        quizzes: createdQuizzes
      });
    }

    // Insert learning outcomes
    for (let i = 0; i < outcomes.length; i++) {
      await supabaseClient
        .from('course_outcomes')
        .insert({
          course_id: course.id,
          outcome: outcomes[i],
          order_index: i
        });
    }

    // Get category details
    let categoryDetails = null;
    if (finalCategoryId) {
      const { data } = await supabaseClient
        .from('categories')
        .select('name, color')
        .eq('id', finalCategoryId)
        .single();
      categoryDetails = data;
    }

    const enrichedCourse = {
      ...course,
      courseid: course.id,
      category_name: categoryDetails?.name,
      category_color: categoryDetails?.color,
      modules: createdModules,
      created_at: course.created_at,
      updated_at: course.updated_at
    };

    return new Response(
      JSON.stringify({
        success: true,
        message: "Course created successfully with modules",
        data: {
          course: enrichedCourse
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID(),
          modulesCreated: createdModules.length,
          lessonsCreated: createdModules.reduce((sum, m) => sum + m.lessons.length, 0),
          quizzesCreated: createdModules.reduce((sum, m) => sum + m.quizzes.length, 0)
        }
      }),
      {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error("Error creating course:", error);

    return new Response(
      JSON.stringify({
        success: false,
        message: "Failed to create course",
        error: error.message,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID()
        }
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
