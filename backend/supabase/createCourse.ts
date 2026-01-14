// supabase/functions/createCourse/index.ts
/**
 * Supabase Edge Function: createCourse
 * Purpose: Create a new course with category auto-creation and instructor assignment
 * Endpoint: POST /createCourse
 * Database: PostgreSQL (Supabase compatible)
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
      level = "Beginner",
      instructorId,
      instructorName,
      thumbnailUrl,
      durationHours = 0,
      tags = [],
      modules = [], // Array of modules with lessons and quizzes
      outcomes = [], // Learning outcomes
      requirements = [] // Prerequisites
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

    // Get or create category
    let categoryId;
    if (category) {
      const { data: existingCategory } = await supabaseClient
        .from('categories')
        .select('id')
        .eq('name', category)
        .single();

      if (existingCategory) {
        categoryId = existingCategory.id;
      } else {
        // Create new category
        const { data: newCategory, error: categoryError } = await supabaseClient
          .from('categories')
          .insert({
            name: category,
            description: `${category} courses`,
            color: '#6366F1' // Default purple color
          })
          .select('id')
          .single();

        if (categoryError) throw categoryError;
        categoryId = newCategory.id;
      }
    }

    // Create course
    const { data: course, error: courseError } = await supabaseClient
      .from('courses')
      .insert({
        title,
        description: description || '',
        category_id: categoryId,
        level,
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

      // Create lessons (videos and PDFs) for this section
      const createdLessons = [];
      const lessons = module.lessons || [];
      for (let j = 0; j < lessons.length; j++) {
        const lesson = lessons[j];

        // Determine lesson type - default to 'video' for backward compatibility
        const lessonType = lesson.type || 'video';

        if (lessonType === 'pdf') {
          // Insert PDF resource into course_resources table
          const { data: resourceData, error: resourceError } = await supabaseClient
            .from('course_resources')
            .insert({
              course_id: course.id,
              section_id: section.id,
              title: lesson.title,
              description: lesson.content || '',
              resource_url: lesson.resourceUrl || '',
              resource_type: 'pdf',
              order_index: lesson.order ?? j,
              is_preview: lesson.isPreview || false,
              thumbnail_url: lesson.thumbnailUrl || null,
              is_downloadable: lesson.isDownloadable !== undefined ? lesson.isDownloadable : true,
              file_size_bytes: lesson.fileSize || null,
              estimated_read_minutes: estimatePdfReadMinutes(lesson.fileSize || null)
            })
            .select()
            .single();

          if (resourceError) throw resourceError;
          createdLessons.push(resourceData);
        } else {
          // Insert video lesson into course_videos table
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

        // Create quiz without questions column (use normalized table)
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
            max_attempts: quiz.maxAttempts || 3
          })
          .select()
          .single();

        if (quizError) throw quizError;

        // Create questions in quiz_questions table
        const questions = quiz.questions || [];
        const createdQuestions = [];
        for (let q = 0; q < questions.length; q++) {
          const question = questions[q];

          // Normalize question type: 'multiple-correct' -> 'multiple-choice' (DB uses hyphens)
          let questionType = question.type || 'multiple-choice';
          if (questionType === 'multiple-correct') {
            questionType = 'multiple-choice';
          } else if (questionType === 'short-answer') {
            questionType = 'text';
          } else if (questionType === 'matching') {
            questionType = 'text';
          }

          const { data: questionData, error: questionError } = await supabaseClient
            .from('quiz_questions')
            .insert({
              quiz_id: quizData.id,
              question: question.text || '',
              question_type: questionType,
              options: question.options || [],
              correct_answer: String(question.correctAnswer || ''), // Convert to string
              explanation: question.explanation || question.sampleAnswer || '',
              points: question.points || 1,
              order_index: q
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

    // Insert requirements
    for (let i = 0; i < requirements.length; i++) {
      await supabaseClient
        .from('course_requirements')
        .insert({
          course_id: course.id,
          requirement: requirements[i],
          order_index: i
        });
    }

    // Get category details
    let categoryDetails = null;
    if (categoryId) {
      const { data } = await supabaseClient
        .from('categories')
        .select('name, color')
        .eq('id', categoryId)
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
