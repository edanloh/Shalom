// supabase/functions/getModuleDetailInstructor/index.ts
/**
 * Supabase Edge Function: getModuleDetailInstructor (Course Content for Instructors)
 * Purpose: Fetch complete course content including sections, videos, quizzes WITH QUESTIONS for course editing
 * Endpoint: GET /getModuleDetailInstructor/{adminId}/{courseId}
 * 
 * Instructor View Expectations:
 * - Full course content with all quiz questions and answers for editing
 * - No user progress tracking (instructors don't need student progress)
 * - Includes all fields needed for CourseBuilder editing
 * - Validates that the admin has permission to view this course (instructor_id check)
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
    
    // Extract parameters from path: /getModuleDetailInstructor/{adminId}/{courseId}
    const pathParts = url.pathname.split('/').filter(Boolean);
    const adminId = pathParts[pathParts.length - 2];
    const courseId = pathParts[pathParts.length - 1];

    if (!adminId || !courseId || adminId === 'getModuleDetailInstructor') {
      return new Response(
        JSON.stringify({
          success: false,
          message: "adminId and courseId are required"
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Instructor view request - Admin: ${adminId}, Course: ${courseId}`);

    // ========================================
    // 1. Fetch core course details
    // ========================================
    const { data: course, error: courseError } = await supabaseClient
      .from('courses')
      .select(`
        id, title, description, instructor_name,
        duration_hours, thumbnail_url,
        rating, total_ratings, student_count, is_published,
        is_featured, language, tags,
        created_at, updated_at,
        categories (
          id,
          name, 
          color
        )
      `)
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
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

    // Optional: Verify instructor has permission to view this course
    // Uncomment if you want to enforce instructor ownership
    // if (course.instructor_id && course.instructor_id !== adminId) {
    //   return new Response(
    //     JSON.stringify({
    //       success: false,
    //       message: "You do not have permission to view this course"
    //     }),
    //     {
    //       status: 403,
    //       headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    //     }
    //   );
    // }

    // ========================================
    // 2. Fetch sections, lessons, quizzes, quiz questions, outcomes, reviews in parallel
    // ========================================
    // First, get section IDs for filtering videos
    const sectionIds = await getSectionIds(supabaseClient, courseId);
    console.log('Section IDs:', sectionIds);
    
    const [
      { data: sections, error: sectionsError },
      { data: lessons, error: lessonsError },
      { data: pdfResources, error: pdfResourcesError },
      { data: quizzes, error: quizzesError },
      { data: quizQuestions, error: quizQuestionsError },
      { data: outcomes, error: outcomesError },
      { data: reviews, error: reviewsError }
    ] = await Promise.all([
      supabaseClient
        .from('course_sections')
        .select('id, title, description, order_index, lessons_count, duration_minutes')
        .eq('course_id', courseId)
        .order('order_index', { ascending: true }),
      
      supabaseClient
        .from('course_videos')
        .select(`
          id, section_id, title, description, video_url,
          order_index, duration_seconds, is_preview, thumbnail_url
        `)
        .in('section_id', sectionIds)
        .order('section_id', { ascending: true })
        .order('order_index', { ascending: true }),
      
      supabaseClient
        .from('course_resources')
        .select(`
          id, section_id, title, description, resource_url,
          order_index, resource_type, is_preview,
          file_size_bytes, is_downloadable
        `)
        .in('section_id', sectionIds)
        .order('section_id', { ascending: true })
        .order('order_index', { ascending: true }),
      
      supabaseClient
        .from('course_quizzes')
        .select(`
          id, section_id, title, description, order_index,
          passing_score, time_limit_minutes, max_attempts
        `)
        .eq('course_id', courseId)
        .order('section_id', { ascending: true })
        .order('order_index', { ascending: true }),
      
      supabaseClient
        .from('quiz_questions')
        .select(`
          id, quiz_id, question, question_type, 
          options, correct_answer, explanation, points, order_index, image_url
        `)
        .in('quiz_id', await getQuizIds(supabaseClient, courseId))
        .order('quiz_id', { ascending: true })
        .order('order_index', { ascending: true }),
      
      supabaseClient
        .from('course_outcomes')
        .select('outcome, order_index')
        .eq('course_id', courseId)
        .order('order_index', { ascending: true }),
      
      supabaseClient
        .from('course_ratings')
        .select(`
          id, rating, review, created_at,
          users (
            id, name, avatar_url
          )
        `)
        .eq('course_id', courseId)
        .order('created_at', { ascending: false })
    ]);

    // Log any errors from parallel queries
    if (sectionsError) console.error('Sections error:', sectionsError);
    if (lessonsError) console.error('Lessons error:', lessonsError);
    if (pdfResourcesError) console.error('PDF resources error:', pdfResourcesError);
    if (quizzesError) console.error('Quizzes error:', quizzesError);
    if (quizQuestionsError) console.error('Quiz questions error:', quizQuestionsError);
    if (outcomesError) console.error('Outcomes error:', outcomesError);
    if (reviewsError) console.error('Reviews error:', reviewsError);

    console.log('Fetched lessons count:', lessons?.length || 0);
    console.log('Fetched PDF resources count:', pdfResources?.length || 0);
    console.log('Fetched quizzes count:', quizzes?.length || 0);
    console.log('Lessons data:', lessons);
    console.log('PDF resources data:', pdfResources);

    // ========================================
    // 3. Combine sections with their items (lessons + PDF resources + quizzes WITH QUESTIONS)
    // ========================================
    const sectionsWithContent = (sections || []).map((section: any) => {
      // Get lessons (videos) for this section
      const sectionLessons = (lessons || [])
        .filter((l: any) => l.section_id === section.id)
        .map((l: any) => ({
          ...l,
          type: "video",
          duration_seconds: l.duration_seconds || 0 // Already in seconds
        }));

      // Helper function to detect file type from URL extension
      const detectFileTypeFromUrl = (url: string): 'pdf' | 'document' | 'ppt' => {
        if (!url) return 'pdf';
        const lowercaseUrl = url.toLowerCase();
        if (lowercaseUrl.includes('.docx') || lowercaseUrl.includes('.doc')) {
          return 'document';
        }
        if (lowercaseUrl.includes('.pptx') || lowercaseUrl.includes('.ppt')) {
          return 'ppt';
        }
        return 'pdf';
      };

      // Get document resources (PDFs, DOCX, PPTX) for this section
      const sectionPdfResources = (pdfResources || [])
        .filter((r: any) => r.section_id === section.id)
        .map((r: any) => {
          // Determine type: prioritize resource_type from DB, fallback to URL extension
          const dbType = r.resource_type?.toLowerCase();
          let finalType = dbType || detectFileTypeFromUrl(r.resource_url);
          
          // If DB says "document" but URL is actually a PDF, use the URL extension
          if (dbType === 'document' && r.resource_url.toLowerCase().includes('.pdf')) {
            finalType = 'pdf';
          }
          
          return {
            id: r.id,
            section_id: r.section_id,
            title: r.title,
            description: r.description,
            resource_url: r.resource_url,
            resource_type: finalType,
            is_preview: r.is_preview,
            is_downloadable: r.is_downloadable,
            file_size_bytes: r.file_size_bytes,
            order_index: r.order_index,
            type: finalType
          };
        });

      // Get quizzes for this section and add questions
      const sectionQuizzes = (quizzes || [])
        .filter((q: any) => q.section_id === section.id)
        .map((q: any) => {
          // Get questions for this quiz
          const questions = (quizQuestions || [])
            .filter((qq: any) => qq.quiz_id === q.id)
            .map((qq: any) => ({
              id: qq.id,
              text: qq.question, // Map 'question' column to 'text' for frontend
              question: qq.question, // Also include as 'question' for compatibility
              type: qq.question_type,
              question_type: qq.question_type, // Also include as 'question_type' for compatibility
              options: qq.options || [],
              correctAnswer: qq.correct_answer,
              correct_answer: qq.correct_answer, // Also include as 'correct_answer' for compatibility
              explanation: qq.explanation,
              points: qq.points,
              order: qq.order_index,
              order_index: qq.order_index, // Also include as 'order_index' for compatibility
              image_url: qq.image_url
            }));

          return {
            ...q,
            type: "quiz",
            questions // Include full questions array with answers for instructor editing
          };
        });

      // Combine videos, PDFs, and quizzes, then sort by order_index
      const items = [...sectionLessons, ...sectionPdfResources, ...sectionQuizzes]
        .sort((a: any, b: any) => a.order_index - b.order_index);

      // Calculate total duration from videos in this section (in minutes)
      const calculatedDuration = Math.ceil(
        sectionLessons.reduce((sum: number, video: any) => sum + (video.duration_seconds || 0), 0) / 60
      );

      return {
        ...section,
        items,
        itemCount: items.length,
        duration_minutes: calculatedDuration || section.duration_minutes || 0
      };
    });

    // ========================================
    // 4. Process reviews and calculate ratings
    // ========================================
    const processedReviews = (reviews || []).map((review: any) => ({
      id: review.id,
      rating: review.rating,
      review: review.review,
      createdAt: review.created_at,
      reviewerName: review.users?.name || 'Anonymous',
      reviewerAvatar: review.users?.avatar_url || null,
      reviewerId: review.users?.id || null
    }));

    // Calculate average rating and rating breakdown
    let averageRating = 0;
    const ratingBreakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    
    if (processedReviews.length > 0) {
      const totalRating = processedReviews.reduce((sum: number, r: any) => sum + r.rating, 0);
      averageRating = totalRating / processedReviews.length;
      
      // Calculate rating breakdown counts
      processedReviews.forEach((r: any) => {
        ratingBreakdown[r.rating]++;
      });
    }

    // ========================================
    // 5. Construct structured response for instructor
    // ========================================
    const responseData = {
      course: {
        ...course,
        category_name: course.categories?.name,
        category_id: course.categories?.id,
        category_color: course.categories?.color,
        requirements: [],
        outcomes: (outcomes || []).map((o: any) => o.outcome),
        rating: averageRating,
        totalRatings: processedReviews.length,
        ratingBreakdown: ratingBreakdown,
        reviews: processedReviews
      },
      sections: sectionsWithContent,
      totalSections: sections?.length || 0,
      totalVideos: lessons?.length || 0,
      totalQuizzes: quizzes?.length || 0,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        viewType: "instructor",
        adminId: adminId
      }
    };

    return new Response(
      JSON.stringify({
        success: true,
        message: "Course content retrieved successfully (instructor view)",
        data: responseData
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error("Error retrieving course content:", error);

    return new Response(
      JSON.stringify({
        success: false,
        message: "An error occurred while retrieving course content",
        error: error.message || "Unknown error",
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

// Helper function to get section IDs
async function getSectionIds(supabaseClient: any, courseId: string) {
  const { data } = await supabaseClient
    .from('course_sections')
    .select('id')
    .eq('course_id', courseId);
  
  return data ? data.map((s: any) => s.id) : [];
}

// Helper function to get quiz IDs
async function getQuizIds(supabaseClient: any, courseId: string) {
  const { data } = await supabaseClient
    .from('course_quizzes')
    .select('id')
    .eq('course_id', courseId);
  
  return data ? data.map((q: any) => q.id) : [];
}
