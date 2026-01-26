// supabase/functions/courseDuplicateHandler/index.ts
/**
 * Supabase Edge Function: courseDuplicateHandler
 * Purpose: Duplicate a course with all its content
 * Endpoints: 
 *   POST /courseDuplicateHandler/{courseId}
 * 
 * DUPLICATES:
 * - Course record (sets is_published to false)
 * - All course_sections
 * - All course_videos (with updated section references)
 * - All course_quizzes (with updated section references)
 * - All quiz_questions (with updated quiz references)
 * - All course_resources/PDFs (with updated section references)
 * - Maintains all order_index values and relationships
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
};

function created(payload: any) {
  return new Response(JSON.stringify(payload), {
    status: 201,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function badRequest(msg: string) {
  return new Response(
    JSON.stringify({ success: false, message: msg }),
    {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

function notFound(msg: string) {
  return new Response(
    JSON.stringify({ success: false, message: msg }),
    {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

function forbidden(msg: string) {
  return new Response(
    JSON.stringify({ success: false, message: msg }),
    {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

function serverError(error: any) {
  return new Response(
    JSON.stringify({
      success: false,
      message: "Internal Server Error",
      error: error?.message,
      stack: error?.stack,
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
    
    // Extract courseId from path: /courseDuplicateHandler/{courseId}
    const pathParts = url.pathname.split('/').filter(Boolean);
    const courseId = pathParts[pathParts.length - 1] !== 'courseDuplicateHandler'
      ? pathParts[pathParts.length - 1]
      : null;

    if (!courseId || courseId === 'courseDuplicateHandler') {
      return badRequest("Course ID is required");
    }

    console.log('Course duplicate request:', { method: req.method, courseId });

    // ===================================================
    // ROUTE: POST /courseDuplicateHandler/{courseId}
    // ===================================================
    if (req.method === "POST") {
      // 1. Check if course exists and fetch all details
      const { data: originalCourse, error: courseError } = await supabaseClient
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();

      if (courseError || !originalCourse) {
        console.error('Course not found:', courseError);
        return notFound("Course not found");
      }

      console.log('Original course found:', originalCourse.title);

      // 2. Optional: Check permissions (uncomment if you have authentication)
      // const authHeader = req.headers.get('Authorization');
      // if (authHeader) {
      //   const token = authHeader.replace('Bearer ', '');
      //   const { data: { user } } = await supabaseClient.auth.getUser(token);
      //   
      //   // You might need to add instructor_id to courses table to check ownership
      //   if (!user) {
      //     return forbidden("You don't have permission to duplicate this course");
      //   }
      // }

      // 3. Generate new course ID
      const newCourseId = crypto.randomUUID();
      const timestamp = new Date().toISOString();

      // 4. Create duplicate course
      const duplicateCourseData = {
        id: newCourseId,
        title: `${originalCourse.title} (Copy)`,
        description: originalCourse.description,
        instructor_name: originalCourse.instructor_name,
        category_id: originalCourse.category_id,
        duration_hours: originalCourse.duration_hours,
        thumbnail_url: originalCourse.thumbnail_url,
        tags: originalCourse.tags,
        language: originalCourse.language,
        is_published: false, // Always start as unpublished
        is_featured: false,
        rating: 0,
        student_count: 0,
        total_ratings: 0,
        created_at: timestamp,
        updated_at: timestamp,
      };

      const { data: newCourse, error: insertError } = await supabaseClient
        .from('courses')
        .insert(duplicateCourseData)
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting duplicate course:', insertError);
        throw insertError;
      }

      console.log('Duplicate course created:', newCourse.id);

      // 5. Fetch and duplicate sections with section ID mapping
      const { data: originalSections, error: sectionsError } = await supabaseClient
        .from('course_sections')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index', { ascending: true });

      if (sectionsError) {
        console.error('Error fetching sections:', sectionsError);
      }

      const sectionIdMap = new Map(); // Map old section IDs to new ones
      let duplicatedSectionsCount = 0;

      if (originalSections && originalSections.length > 0) {
        console.log(`Duplicating ${originalSections.length} sections...`);
        
        const sectionsToInsert = originalSections.map((section: any) => {
          const newSectionId = crypto.randomUUID();
          sectionIdMap.set(section.id, newSectionId);
          
          return {
            id: newSectionId,
            course_id: newCourseId,
            title: section.title,
            description: section.description,
            order_index: section.order_index,
            section_order: section.section_order,
            lessons_count: section.lessons_count,
            duration_minutes: section.duration_minutes,
            created_at: timestamp,
          };
        });

        const { data: insertedSections, error: sectionInsertError } = await supabaseClient
          .from('course_sections')
          .insert(sectionsToInsert)
          .select();

        if (sectionInsertError) {
          console.error('Error duplicating sections:', sectionInsertError);
        } else {
          duplicatedSectionsCount = insertedSections?.length || 0;
          console.log(`Duplicated ${duplicatedSectionsCount} sections`);
        }
      }

      // 6. Fetch and duplicate videos with updated section references
      const { data: originalVideos, error: videosError } = await supabaseClient
        .from('course_videos')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index', { ascending: true });

      let duplicatedVideosCount = 0;

      if (!videosError && originalVideos && originalVideos.length > 0) {
        console.log(`Duplicating ${originalVideos.length} videos...`);
        
        const videosToInsert = originalVideos.map((video: any) => {
          const newSectionId = video.section_id ? sectionIdMap.get(video.section_id) : null;
          
          return {
            id: crypto.randomUUID(),
            course_id: newCourseId,
            section_id: newSectionId,
            title: video.title,
            description: video.description,
            video_url: video.video_url,
            duration_seconds: video.duration_seconds,
            order_index: video.order_index,
            is_preview: video.is_preview,
            thumbnail_url: video.thumbnail_url,
            created_at: timestamp,
          };
        });

        const { data: insertedVideos, error: videoInsertError } = await supabaseClient
          .from('course_videos')
          .insert(videosToInsert)
          .select();

        if (videoInsertError) {
          console.error('Error duplicating videos:', videoInsertError);
        } else {
          duplicatedVideosCount = insertedVideos?.length || 0;
          console.log(`Duplicated ${duplicatedVideosCount} videos`);
        }
      }

      // 7. Fetch and duplicate quizzes with updated section references
      const { data: originalQuizzes, error: quizzesError } = await supabaseClient
        .from('course_quizzes')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index', { ascending: true });

      const quizIdMap = new Map(); // Map old quiz IDs to new ones
      let duplicatedQuizzesCount = 0;

      if (!quizzesError && originalQuizzes && originalQuizzes.length > 0) {
        console.log(`Duplicating ${originalQuizzes.length} quizzes...`);
        
        const quizzesToInsert = originalQuizzes.map((quiz: any) => {
          const newQuizId = crypto.randomUUID();
          const newSectionId = quiz.section_id ? sectionIdMap.get(quiz.section_id) : null;
          
          // Store mapping for quiz questions
          quizIdMap.set(quiz.id, newQuizId);
          
          return {
            id: newQuizId,
            course_id: newCourseId,
            section_id: newSectionId,
            title: quiz.title,
            description: quiz.description,
            order_index: quiz.order_index,
            passing_score: quiz.passing_score,
            time_limit_minutes: quiz.time_limit_minutes,
            max_attempts: quiz.max_attempts,
            created_at: timestamp,
          };
        });

        const { data: insertedQuizzes, error: quizInsertError } = await supabaseClient
          .from('course_quizzes')
          .insert(quizzesToInsert)
          .select();

        if (quizInsertError) {
          console.error('Error duplicating quizzes:', quizInsertError);
        } else {
          duplicatedQuizzesCount = insertedQuizzes?.length || 0;
          console.log(`Duplicated ${duplicatedQuizzesCount} quizzes`);
        }
      }

      // 8. Fetch and duplicate quiz questions with updated quiz references
      let duplicatedQuestionsCount = 0;

      if (originalQuizzes && originalQuizzes.length > 0) {
        // Get all quiz IDs to fetch their questions
        const originalQuizIds = originalQuizzes.map((quiz: any) => quiz.id);

        const { data: originalQuestions, error: questionsError } = await supabaseClient
          .from('quiz_questions')
          .select('*')
          .in('quiz_id', originalQuizIds)
          .order('order_index', { ascending: true });

        if (!questionsError && originalQuestions && originalQuestions.length > 0) {
          console.log(`Duplicating ${originalQuestions.length} quiz questions...`);
          
          const questionsToInsert = originalQuestions.map((question: any) => {
            const newQuizId = quizIdMap.get(question.quiz_id);
            
            return {
              id: crypto.randomUUID(),
              quiz_id: newQuizId,
              question: question.question,
              question_type: question.question_type,
              options: question.options,
              correct_answer: question.correct_answer,
              explanation: question.explanation,
              points: question.points,
              order_index: question.order_index,
              created_at: timestamp,
            };
          });

          const { data: insertedQuestions, error: questionInsertError } = await supabaseClient
            .from('quiz_questions')
            .insert(questionsToInsert)
            .select();

          if (questionInsertError) {
            console.error('Error duplicating quiz questions:', questionInsertError);
          } else {
            duplicatedQuestionsCount = insertedQuestions?.length || 0;
            console.log(`Duplicated ${duplicatedQuestionsCount} quiz questions`);
          }
        }
      }

      // 9. Fetch and duplicate resources (PDFs, documents, etc.) with updated section references
      const { data: originalResources, error: resourcesError } = await supabaseClient
        .from('course_resources')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index', { ascending: true });

      let duplicatedResourcesCount = 0;

      if (!resourcesError && originalResources && originalResources.length > 0) {
        console.log(`Duplicating ${originalResources.length} resources...`);
        
        const resourcesToInsert = originalResources.map((resource: any) => {
          const newSectionId = resource.section_id ? sectionIdMap.get(resource.section_id) : null;
          const newLessonId = resource.lesson_id ? sectionIdMap.get(resource.lesson_id) : null;
          
          return {
            id: crypto.randomUUID(),
            course_id: newCourseId,
            section_id: newSectionId,
            lesson_id: newLessonId,
            title: resource.title,
            description: resource.description,
            resource_type: resource.resource_type,
            resource_url: resource.resource_url,
            file_size_bytes: resource.file_size_bytes,
            estimated_read_minutes: resource.estimated_read_minutes,
            download_count: 0, // Reset download count for duplicate
            is_downloadable: resource.is_downloadable,
            order_index: resource.order_index,
            thumbnail_url: resource.thumbnail_url,
            is_preview: resource.is_preview,
            created_at: timestamp,
            updated_at: timestamp,
          };
        });

        const { data: insertedResources, error: resourceInsertError } = await supabaseClient
          .from('course_resources')
          .insert(resourcesToInsert)
          .select();

        if (resourceInsertError) {
          console.error('Error duplicating resources:', resourceInsertError);
        } else {
          duplicatedResourcesCount = insertedResources?.length || 0;
          console.log(`Duplicated ${duplicatedResourcesCount} resources`);
        }
      }

      // 10. Format response to match your app's Course type
      const formattedCourse = {
        courseid: newCourse.id,
        title: newCourse.title,
        description: newCourse.description,
        instructor_name: newCourse.instructor_name,
        duration_hours: newCourse.duration_hours,
        thumbnail_url: newCourse.thumbnail_url,
        rating: newCourse.rating,
        total_ratings: newCourse.total_ratings,
        student_count: newCourse.student_count,
        tags: newCourse.tags,
        is_published: newCourse.is_published,
        is_featured: newCourse.is_featured,
        created_at: newCourse.created_at,
        updated_at: newCourse.updated_at,
      };

      // 11. Return success response
      return created({
        success: true,
        message: `Course "${originalCourse.title}" duplicated successfully`,
        data: {
          originalCourseId: courseId,
          duplicatedCourseId: newCourseId,
          duplicatedCourse: formattedCourse,
          counts: {
            sections: duplicatedSectionsCount,
            videos: duplicatedVideosCount,
            quizzes: duplicatedQuizzesCount,
            quizQuestions: duplicatedQuestionsCount,
            resources: duplicatedResourcesCount,
          }
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID()
        }
      });
    }

    // ===================================================
    // If method not matched
    // ===================================================
    return badRequest("Method not allowed. Use POST to duplicate a course.");

  } catch (error) {
    console.error("Course duplicate handler error:", error);
    return serverError(error);
  }
});
