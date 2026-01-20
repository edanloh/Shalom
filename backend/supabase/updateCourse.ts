// supabase/functions/updateCourse/index.ts
/**
 * Supabase Edge Function: updateCourse
 * Purpose: Update existing course details with dynamic field updates and category management
 * Endpoint: PUT /updateCourse/{courseId}
 * Database: PostgreSQL (Supabase compatible)
 * 
 * UPDATED: Handles category by ID instead of name
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'PUT,OPTIONS',
};

const estimatePdfReadMinutes = (fileSizeBytes?: number | null) => {
  if (!Number.isFinite(fileSizeBytes) || (fileSizeBytes ?? 0) <= 0) return 0;
  const bytesPerPage = 200 * 1024;
  const pages = Math.max(1, Math.round((fileSizeBytes as number) / bytesPerPage));
  return Math.max(1, pages * 2);
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
    
    // Extract courseId from path: /updateCourse/{courseId}
    const pathParts = url.pathname.split('/').filter(Boolean);
    const courseId = pathParts[pathParts.length - 1];

    if (!courseId || courseId === 'updateCourse') {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Course ID is required"
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const body = await req.json();
    console.log('Update course request:', courseId);

    // Extract modules, outcomes, requirements for separate handling
    const { modules, outcomes, requirements, ...courseFields } = body;

    // Build update object for course fields
    const updateData: any = {};

    if (courseFields.title !== undefined) updateData.title = courseFields.title;
    if (courseFields.description !== undefined) updateData.description = courseFields.description;
    if (courseFields.level !== undefined) updateData.level = courseFields.level;
    if (courseFields.instructorName !== undefined) updateData.instructor_name = courseFields.instructorName;
    if (courseFields.thumbnailUrl !== undefined) updateData.thumbnail_url = courseFields.thumbnailUrl;
    if (courseFields.durationHours !== undefined) updateData.duration_hours = courseFields.durationHours;
    if (courseFields.tags !== undefined) updateData.tags = courseFields.tags;
    if (courseFields.isPublished !== undefined) updateData.is_published = courseFields.isPublished;
    
    console.log(courseFields);
    // UPDATED: Handle category by ID instead of name
    if (courseFields.category !== undefined) {
      if (courseFields.category) {
        // Validate that the category exists
        const { data: categoryExists } = await supabaseClient
          .from('categories')
          .select('id')
          .eq('id', courseFields.category)
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
        
        updateData.category_id = courseFields.category;
      } else {
        // If categoryId is null/empty, set to General category
        let generalCategoryId;
        const { data: generalCategory } = await supabaseClient
          .from('categories')
          .select('id')
          .eq('name', 'General')
          .single();

        if (generalCategory) {
          generalCategoryId = generalCategory.id;
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
          generalCategoryId = newGeneral.id;
        }
        
        updateData.category_id = generalCategoryId;
      }
    }

    // Update course if there are fields to update
    let course;
    if (Object.keys(updateData).length > 0) {
      updateData.updated_at = new Date().toISOString();

      const { data: updatedCourse, error: updateError } = await supabaseClient
        .from('courses')
        .update(updateData)
        .eq('id', courseId)
        .select()
        .single();

      if (updateError) throw updateError;

      if (!updatedCourse) {
        return new Response(
          JSON.stringify({
            success: false,
            message: "Course not found"
          }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      course = updatedCourse;
    } else {
      // Just fetch existing course if no updates
      const { data: existingCourse, error: fetchError } = await supabaseClient
        .from('courses')
        .select()
        .eq('id', courseId)
        .single();

      if (fetchError || !existingCourse) {
        return new Response(
          JSON.stringify({
            success: false,
            message: "Course not found"
          }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      course = existingCourse;
    }

    // Update modules if provided - PRESERVE STUDENT PROGRESS
    if (modules && Array.isArray(modules)) {
      // Get existing section IDs for this course
      const { data: existingSections } = await supabaseClient
        .from('course_sections')
        .select('id')
        .eq('course_id', courseId);

      const existingSectionIds = (existingSections || []).map((s: any) => s.id);
      const processedSectionIds: string[] = [];

      // Process each module (section)
      for (let i = 0; i < modules.length; i++) {
        const module = modules[i];
        let sectionId;

        if (module.id && existingSectionIds.includes(module.id)) {
          // UPDATE existing section
          await supabaseClient
            .from('course_sections')
            .update({
              title: module.title,
              description: module.description || '',
              order_index: i
            })
            .eq('id', module.id);

          sectionId = module.id;
        } else {
          // INSERT new section
          const { data: newSection, error: sectionError } = await supabaseClient
            .from('course_sections')
            .insert({
              course_id: courseId,
              title: module.title,
              description: module.description || '',
              order_index: i
            })
            .select('id')
            .single();

          if (sectionError) throw sectionError;
          sectionId = newSection.id;
        }

        processedSectionIds.push(sectionId);

        // Handle lessons (videos and PDFs) for this section
        const { data: existingVideos } = await supabaseClient
          .from('course_videos')
          .select('id')
          .eq('section_id', sectionId);

        const { data: existingResources } = await supabaseClient
          .from('course_resources')
          .select('id')
          .eq('section_id', sectionId);

        const existingVideoIds = (existingVideos || []).map((v: any) => v.id);
        const existingResourceIds = (existingResources || []).map((r: any) => r.id);
        const processedVideoIds: string[] = [];
        const processedResourceIds: string[] = [];

        const lessons = module.lessons || [];
        for (let j = 0; j < lessons.length; j++) {
          const lesson = lessons[j];
          const lessonType = lesson.type || 'video';

          if (lessonType === 'pdf') {
            // Handle PDF resources
            if (lesson.id && existingResourceIds.includes(lesson.id)) {
              // UPDATE existing PDF resource
              await supabaseClient
                .from('course_resources')
                .update({
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
                .eq('id', lesson.id);

              processedResourceIds.push(lesson.id);
            } else {
              // INSERT new PDF resource
              const { data: newResource, error: resourceError } = await supabaseClient
                .from('course_resources')
                .insert({
                  course_id: courseId,
                  section_id: sectionId,
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
                .select('id')
                .single();

              if (resourceError) throw resourceError;
              processedResourceIds.push(newResource.id);
            }
          } else {
            // Handle video lessons
            if (lesson.id && existingVideoIds.includes(lesson.id)) {
              // UPDATE existing video
              await supabaseClient
                .from('course_videos')
                .update({
                  title: lesson.title,
                  description: lesson.content || '',
                  video_url: lesson.videoUrl || '',
                  duration_seconds: lesson.durationSeconds || ((lesson.durationMinutes || 0) * 60),
                  order_index: lesson.order ?? j,
                  is_preview: lesson.isPreview || false,
                  thumbnail_url: lesson.thumbnailUrl || null
                })
                .eq('id', lesson.id);

              processedVideoIds.push(lesson.id);
            } else {
              // INSERT new video
              const { data: newVideo, error: videoError } = await supabaseClient
                .from('course_videos')
                .insert({
                  course_id: courseId,
                  section_id: sectionId,
                  title: lesson.title,
                  description: lesson.content || '',
                  video_url: lesson.videoUrl || '',
                  duration_seconds: lesson.durationSeconds || ((lesson.durationMinutes || 0) * 60),
                  order_index: lesson.order ?? j,
                  is_preview: lesson.isPreview || false,
                  thumbnail_url: lesson.thumbnailUrl || null
                })
                .select('id')
                .single();

              if (videoError) throw videoError;
              processedVideoIds.push(newVideo.id);
            }
          }
        }

        // Delete videos that were removed
        const videosToDelete = existingVideoIds.filter(id => !processedVideoIds.includes(id));
        if (videosToDelete.length > 0) {
          await supabaseClient
            .from('course_videos')
            .delete()
            .in('id', videosToDelete);
        }

        // Delete PDF resources that were removed
        const resourcesToDelete = existingResourceIds.filter(id => !processedResourceIds.includes(id));
        if (resourcesToDelete.length > 0) {
          await supabaseClient
            .from('course_resources')
            .delete()
            .in('id', resourcesToDelete);
        }

        // Handle quizzes for this section
        const { data: existingQuizzes } = await supabaseClient
          .from('course_quizzes')
          .select('id')
          .eq('section_id', sectionId);

        const existingQuizIds = (existingQuizzes || []).map((q: any) => q.id);
        const processedQuizIds: string[] = [];

        const quizzes = module.quizzes || [];
        for (let k = 0; k < quizzes.length; k++) {
          const quiz = quizzes[k];
          let quizId;

          if (quiz.id && existingQuizIds.includes(quiz.id)) {
            // UPDATE existing quiz
            await supabaseClient
              .from('course_quizzes')
              .update({
                title: quiz.title,
                description: quiz.description || '',
                passing_score: quiz.passingScore || 70,
                order_index: quiz.order ?? k,
                time_limit_minutes: quiz.timeLimitMinutes || 30,
                max_attempts: quiz.maxAttempts || 3
              })
              .eq('id', quiz.id);

            quizId = quiz.id;
          } else {
            // INSERT new quiz
            const { data: newQuiz, error: quizError } = await supabaseClient
              .from('course_quizzes')
              .insert({
                course_id: courseId,
                section_id: sectionId,
                title: quiz.title,
                description: quiz.description || '',
                passing_score: quiz.passingScore || 70,
                order_index: quiz.order ?? k,
                time_limit_minutes: quiz.timeLimitMinutes || 30,
                max_attempts: quiz.maxAttempts || 3
              })
              .select('id')
              .single();

            if (quizError) throw quizError;
            quizId = newQuiz.id;
          }

          processedQuizIds.push(quizId);

          // Handle quiz questions
          const { data: existingQuestions } = await supabaseClient
            .from('quiz_questions')
            .select('id')
            .eq('quiz_id', quizId);

          const existingQuestionIds = (existingQuestions || []).map((q: any) => q.id);
          const processedQuestionIds: string[] = [];

          const questions = quiz.questions || [];
          for (let q = 0; q < questions.length; q++) {
            const question = questions[q];

            let questionType = question.type || 'multiple-choice';
            if (questionType === 'multiple-correct') {
              questionType = 'multiple-choice';
            } else if (questionType === 'short-answer') {
              questionType = 'text';
            } else if (questionType === 'matching') {
              questionType = 'text';
            }

            if (question.id && existingQuestionIds.includes(question.id)) {
              // UPDATE existing question
              await supabaseClient
                .from('quiz_questions')
                .update({
                  question: question.text || question.question || '',
                  question_type: questionType,
                  options: question.options || [],
                  correct_answer: String(question.correctAnswer || question.correct_answer || ''),
                  explanation: question.explanation || question.sampleAnswer || '',
                  points: question.points || 1,
                  order_index: q
                })
                .eq('id', question.id);

              processedQuestionIds.push(question.id);
            } else {
              // INSERT new question
              const { data: newQuestion, error: questionError } = await supabaseClient
                .from('quiz_questions')
                .insert({
                  quiz_id: quizId,
                  question: question.text || question.question || '',
                  question_type: questionType,
                  options: question.options || [],
                  correct_answer: String(question.correctAnswer || question.correct_answer || ''),
                  explanation: question.explanation || question.sampleAnswer || '',
                  points: question.points || 1,
                  order_index: q
                })
                .select('id')
                .single();

              if (questionError) throw questionError;
              processedQuestionIds.push(newQuestion.id);
            }
          }

          // Delete questions that were removed
          const questionsToDelete = existingQuestionIds.filter(id => !processedQuestionIds.includes(id));
          if (questionsToDelete.length > 0) {
            await supabaseClient
              .from('quiz_questions')
              .delete()
              .in('id', questionsToDelete);
          }
        }

        // Delete quizzes that were removed
        const quizzesToDelete = existingQuizIds.filter(id => !processedQuizIds.includes(id));
        if (quizzesToDelete.length > 0) {
          await supabaseClient
            .from('quiz_attempts')
            .delete()
            .in('quiz_id', quizzesToDelete);

          await supabaseClient
            .from('course_quizzes')
            .delete()
            .in('id', quizzesToDelete);
        }
      }

      // Delete sections that were completely removed
      const sectionsToDelete = existingSectionIds.filter(id => !processedSectionIds.includes(id));
      if (sectionsToDelete.length > 0) {
        await supabaseClient
          .from('course_sections')
          .delete()
          .in('id', sectionsToDelete);
      }
    }

    // Recompute duration if modules were updated but durationHours wasn't explicitly set
    if (modules && Array.isArray(modules) && courseFields.durationHours === undefined) {
      let computedDurationMinutes = 0;
      for (const module of modules) {
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
      const { data: updatedDuration, error: durationErr } = await supabaseClient
        .from('courses')
        .update({
          duration_hours: computedDurationHours,
          updated_at: new Date().toISOString(),
        })
        .eq('id', courseId)
        .select()
        .single();
      if (durationErr) throw durationErr;
      if (updatedDuration) course = updatedDuration;
    }

    // Update outcomes if provided
    if (outcomes && Array.isArray(outcomes)) {
      await supabaseClient
        .from('course_outcomes')
        .delete()
        .eq('course_id', courseId);

      for (let i = 0; i < outcomes.length; i++) {
        await supabaseClient
          .from('course_outcomes')
          .insert({
            course_id: courseId,
            outcome: outcomes[i],
            order_index: i
          });
      }
    }

    // Update requirements if provided
    if (requirements && Array.isArray(requirements)) {
      await supabaseClient
        .from('course_requirements')
        .delete()
        .eq('course_id', courseId);

      for (let i = 0; i < requirements.length; i++) {
        await supabaseClient
          .from('course_requirements')
          .insert({
            course_id: courseId,
            requirement: requirements[i],
            order_index: i
          });
      }
    }

    // Get category details
    const enrichedCourse: any = {
      ...course,
      courseid: course.id
    };

    if (course.category_id) {
      const { data: categoryDetails } = await supabaseClient
        .from('categories')
        .select('name, color')
        .eq('id', course.category_id)
        .single();

      if (categoryDetails) {
        enrichedCourse.category_name = categoryDetails.name;
        enrichedCourse.category_color = categoryDetails.color;
      }
    }

    // Get updated modules if they were updated
    if (modules) {
      const { data: sectionsData } = await supabaseClient
        .from('course_sections')
        .select(`
          id,
          title,
          description,
          order_index,
          course_videos (
            id,
            title,
            description,
            video_url,
            order_index,
            duration_seconds,
            is_preview
          ),
          course_quizzes (
            id,
            title,
            passing_score,
            order_index
          )
        `)
        .eq('course_id', courseId)
        .order('order_index', { ascending: true });

      enrichedCourse.modules = (sectionsData || []).map((section: any) => ({
        id: section.id,
        title: section.title,
        description: section.description,
        section_order: section.order_index,
        lessons: (section.course_videos || []).map((video: any) => ({
          id: video.id,
          title: video.title,
          content: video.description,
          videoUrl: video.video_url,
          order: video.order_index,
          durationMinutes: Math.floor(video.duration_seconds / 60),
          isPreview: video.is_preview
        })),
        quizzes: (section.course_quizzes || []).map((quiz: any) => ({
          id: quiz.id,
          title: quiz.title,
          passingScore: quiz.passing_score,
          order: quiz.order_index
        }))
      }));
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Course updated successfully",
        data: {
          course: enrichedCourse
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID(),
          modulesUpdated: modules ? modules.length : 0
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error("Error updating course:", error);

    return new Response(
      JSON.stringify({
        success: false,
        message: "Failed to update course",
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