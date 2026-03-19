// supabase/functions/getModuleDetail/index.ts
/**
 * Supabase Edge Function: getModuleDetail (Course Content)
 * Purpose: Fetch complete course content including sections, videos, quizzes, and user progress
 * Endpoint: GET /getModuleDetail/{courseId}?userId={userId}
 * Database: PostgreSQL (Supabase compatible)
 * 
 * Frontend Expectations:
 * - ModuleDetailScreen expects: course, sections[], totalSections, totalVideos, totalQuizzes, userProgress
 * - Each section has: id, title, description, order_index, lessons_count, duration_minutes, items[], itemCount
 * - Each item has: id, type ('video'|'quiz'), title, description, order_index, and type-specific fields
 * - UserProgress has: progress_percentage, is_completed, videoProgress[], quizAttempts[]
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
    
    // Extract courseId from path: /getModuleDetail/{courseId}
    const pathParts = url.pathname.split('/').filter(Boolean);
    const courseId = pathParts[pathParts.length - 1];
    
    // Extract userId from query parameter
    const userId = url.searchParams.get('userId');

    if (!courseId || courseId === 'getModuleDetail') {
      return new Response(
        JSON.stringify({
          success: false,
          message: "courseId is required"
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Fetching course content:', { courseId, userId });

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

    // ========================================
    // 2. Fetch sections, lessons, quizzes, PDFs, outcomes, reviews in parallel
    // ========================================
    // First, get section IDs for filtering videos
    const sectionIds = await getSectionIds(supabaseClient, courseId);
    console.log('Section IDs:', sectionIds);
    
    const [
      { data: sections, error: sectionsError },
      { data: lessons, error: lessonsError },
      { data: quizzes, error: quizzesError },
      { data: resources, error: resourcesError },
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
        .from('course_quizzes')
        .select(`
          id, section_id, title, description, order_index,
          passing_score, time_limit_minutes, max_attempts
        `)
        .eq('course_id', courseId)
        .order('section_id', { ascending: true })
        .order('order_index', { ascending: true }),
      
      supabaseClient
        .from('course_resources')
        .select(`
          id, section_id, title, description, order_index,
          resource_type, resource_url, estimated_read_minutes
        `)
        .eq('course_id', courseId)
        .in('resource_type', ['pdf', 'document', 'ppt'])
        .order('section_id', { ascending: true })
        .order('order_index', { ascending: true }),
      
      supabaseClient
        .from('course_outcomes')
        .select('outcome, order_index')
        .eq('course_id', courseId)
        .order('order_index', { ascending: true }),
      
      supabaseClient
        .from('course_ratings')
        .select(`
          id, rating, review, created_at, review_status,
          instructor_reply, instructor_replied_at, acknowledged_at, is_pinned,
          reviewer:users!course_ratings_user_id_fkey (
            id, name, avatar_url
          )
        `)
        .eq('course_id', courseId)
        .in('review_status', ['visible', 'resolved'])
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
    ]);

    // Log any errors from parallel queries
    if (sectionsError) console.error('Sections error:', sectionsError);
    if (lessonsError) console.error('Lessons error:', lessonsError);
    if (quizzesError) console.error('Quizzes error:', quizzesError);
    if (resourcesError) console.error('Resources error:', resourcesError);
    if (outcomesError) console.error('Outcomes error:', outcomesError);
    if (reviewsError) console.error('Reviews error:', reviewsError);

    console.log('Fetched lessons count:', lessons?.length || 0);
    console.log('Fetched quizzes count:', quizzes?.length || 0);
    console.log('Fetched resources count:', resources?.length || 0);
    console.log('Lessons data:', lessons);

    const quizIds = (quizzes || []).map((q: any) => q.id);
    let shortAnswerQuizIds = new Set<string>();
    if (quizIds.length > 0) {
      const { data: shortAnswerRows, error: shortAnswerError } = await supabaseClient
        .from('quiz_questions')
        .select('quiz_id, question_type')
        .in('quiz_id', quizIds)
        .in('question_type', ['short-answer', 'text']);

      if (shortAnswerError) {
        console.error('Short-answer quiz detection error:', shortAnswerError);
      } else {
        shortAnswerQuizIds = new Set(
          (shortAnswerRows || []).map((row: any) => row.quiz_id),
        );
      }
    }

    // ========================================
    // 3. Fetch user progress if userId provided
    // ========================================
    let userProgress = null;

    if (userId) {
      try {
        // Check if user is enrolled
        const { data: enrollment, error: enrollmentError } = await supabaseClient
          .from('course_enrollments')
          .select(`
            progress_percentage,
            is_completed,
            current_video_id,
            total_watch_time_minutes,
            enrollment_date,
            completion_date
          `)
          .eq('user_id', userId)
          .eq('course_id', courseId)
          .single();

        if (!enrollmentError && enrollment) {
          // Get video IDs for this course
          const videoIds = (lessons || []).map((l: any) => l.id);
          const quizIds = (quizzes || []).map((q: any) => q.id);
          const pdfIds = (resources || []).map((r: any) => r.id);

          // Fetch video progress, quiz attempts, and PDF progress in parallel
          const [
            { data: videoProgress },
            { data: quizAttempts },
            { data: pdfProgress },
            { data: moduleProgress }
          ] = await Promise.all([
            supabaseClient
              .from('user_video_progress')
              .select(`
                video_id,
                watch_time_seconds,
                is_completed,
                last_position_seconds,
                completed_at
              `)
              .eq('user_id', userId)
              .in('video_id', videoIds),
            
            supabaseClient
              .from('quiz_attempts')
              .select(`
                quiz_id,
                score,
                is_passed,
                attempt_number,
                grades_released,
                completed_at
              `)
              .eq('user_id', userId)
              .in('quiz_id', (quizzes || []).map((q: any) => q.id))
              .order('quiz_id', { ascending: true })
              .order('attempt_number', { ascending: false }),
            
            supabaseClient
              .from('resource_progress')
              .select(`
                resource_id,
                is_completed,
                completed_at
              `)
              .eq('user_id', userId)
              .in('resource_id', pdfIds),
            
            supabaseClient
              .from('user_module_progress')
              .select(`
                section_id,
                is_completed,
                completed_at
              `)
              .eq('user_id', userId)
              .eq('course_id', courseId)
          ]);

          // Group quiz attempts by quiz_id (keep only latest attempt)
          const latestQuizAttempts = [];
          const seenQuizIds = new Set();

          for (const attempt of (quizAttempts || [])) {
            if (!seenQuizIds.has(attempt.quiz_id)) {
              latestQuizAttempts.push(attempt);
              seenQuizIds.add(attempt.quiz_id);
            }
          }

          // Create module progress map for quick lookup (for completed_at timestamp)
          const moduleProgressMap = new Map();
          for (const progress of (moduleProgress || [])) {
            moduleProgressMap.set(progress.section_id, {
              is_completed: progress.is_completed,
              completed_at: progress.completed_at
            });
          }

          userProgress = {
            progress_percentage: parseFloat(enrollment.progress_percentage) || 0,
            is_completed: enrollment.is_completed || false,
            current_video_id: enrollment.current_video_id,
            total_watch_time_minutes: enrollment.total_watch_time_minutes || 0,
            enrollment_date: enrollment.enrollment_date,
            completion_date: enrollment.completion_date,
            videoProgress: videoProgress || [],
            quizAttempts: latestQuizAttempts,
            pdfProgress: pdfProgress || [],
            moduleProgress: moduleProgressMap
          };
        }
      } catch (progressError) {
        console.error('Error fetching user progress:', progressError);
        // Continue without progress data rather than failing the whole request
        userProgress = null;
      }
    }

    // ========================================
    // 4. Combine sections with their items (lessons + quizzes + PDFs)
    // ========================================
    const sectionsWithContent = (sections || []).map((section: any) => {
      // Get lessons (videos) for this section
      const sectionLessons = (lessons || [])
        .filter((l: any) => l.section_id === section.id)
        .map((l: any) => ({
          ...l,
          type: "video",
          duration_seconds: l.duration_seconds || 0,
          is_completed: userProgress?.videoProgress?.some(
            (vp: any) => vp.video_id === l.id && vp.is_completed
          ) || false
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

      // Get documents (PDFs, DOCX, PPTX) for this section
      const sectionPDFs = (resources || [])
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
            order_index: r.order_index,
            type: finalType,
            pdf_url: r.resource_url,
            resource_url: r.resource_url,
            resource_type: finalType,
            estimated_read_minutes: r.estimated_read_minutes ?? 0,
            is_completed: userProgress?.pdfProgress?.some(
              (pp: any) => pp.resource_id === r.id && pp.is_completed
            ) || false
          };
        });

      // Get quizzes for this section
      const sectionQuizzes = (quizzes || [])
        .filter((q: any) => q.section_id === section.id)
        .map((q: any) => {
          // Find the latest attempt for this quiz
          const latestAttempt = userProgress?.quizAttempts?.find(
            (qa: any) => qa.quiz_id === q.id
          );
          const hasAttempt = Boolean(latestAttempt);
          const hasShortAnswer = shortAnswerQuizIds.has(q.id);

          const maxAttemptsRaw = q.max_attempts;
          const normalizedMaxAttempts =
            maxAttemptsRaw === null || maxAttemptsRaw === undefined
              ? null
              : Number(maxAttemptsRaw);
          
          // Quiz is completed if:
          // 1. User has passed, OR
          // 2. User has exhausted all attempts (even if failed)
          // 3. Quiz contains short-answer and user has submitted at least once
          const isPassed = latestAttempt?.is_passed === true;
          const hasExhaustedAttempts =
            hasAttempt &&
            normalizedMaxAttempts !== null &&
            Number.isFinite(normalizedMaxAttempts) &&
            normalizedMaxAttempts > 0 &&
            latestAttempt.attempt_number >= normalizedMaxAttempts;
          const isCompleted = isPassed || hasExhaustedAttempts || (hasShortAnswer && hasAttempt);
          
          console.log(`📝 Quiz ${q.title} (${q.id}):`, {
            isPassed,
            hasShortAnswer,
            hasAttempt,
            attemptNumber: latestAttempt?.attempt_number,
            maxAttempts: normalizedMaxAttempts,
            hasExhaustedAttempts,
            isCompleted
          });
          
          return {
            ...q,
            type: "quiz",
            has_short_answer: hasShortAnswer,
            is_completed: isCompleted
          };
        });

      // Combine and sort by order_index
      const items = [...sectionLessons, ...sectionPDFs, ...sectionQuizzes]
        .sort((a: any, b: any) => a.order_index - b.order_index);

      console.log(`📦 Section ${section.id} (${section.title}): ${sectionLessons.length} videos, ${sectionPDFs.length} PDFs, ${sectionQuizzes.length} quizzes = ${items.length} total items`);

      // ✨ CALCULATE module completion based on items
      let isModuleCompleted = false;
      let moduleCompletedAt = null;
      
      console.log(`📊 Checking module completion for section ${section.id}:`, {
        totalItems: items.length,
        itemTypes: items.map((i: any) => `${i.type}(${i.is_completed ? '✅' : '❌'})`)
      });
      
      if (userId && items.length > 0) {
        // Check if ALL items in this section are completed
        const completedItems = items.filter((item: any) => item.is_completed);
        const incompleteItems = items.filter((item: any) => !item.is_completed);
        isModuleCompleted = completedItems.length === items.length;
        
        console.log(`✅ Section ${section.id} (${section.title}): ${completedItems.length}/${items.length} items completed`);
        if (!isModuleCompleted && incompleteItems.length > 0) {
          console.log(`   ⏳ Incomplete items:`, incompleteItems.map((i: any) => `${i.title}(${i.type})`));
        } else if (isModuleCompleted) {
          console.log(`   🎉 MODULE COMPLETE!`);
        }
        
        // Keep a stable completion timestamp from DB if available.
        // If this is newly computed as completed, assign now and persist below.
        const storedProgress = userProgress?.moduleProgress?.get(section.id);
        if (isModuleCompleted) {
          moduleCompletedAt = storedProgress?.completed_at || new Date().toISOString();
        }
      }

      // Calculate total duration from videos in this section (in minutes)
      const videoMinutes = Math.ceil(
        sectionLessons.reduce((sum: number, video: any) => sum + (video.duration_seconds || 0), 0) / 60
      );
      const pdfMinutes = sectionPDFs.reduce(
        (sum: number, pdf: any) => sum + Number(pdf.estimated_read_minutes || 0),
        0
      );
      const calculatedDuration = videoMinutes + pdfMinutes;

      return {
        ...section,
        items,
        itemCount: items.length,
        duration_minutes: calculatedDuration || section.duration_minutes || 0,
        module_is_completed: isModuleCompleted,
        module_completed_at: moduleCompletedAt
      };
    });

    // ========================================
    // 4.5. Sync computed module completion to DB
    // ========================================
    if (userId && sectionsWithContent.length > 0) {
      try {
        const existingModuleProgress = userProgress?.moduleProgress || new Map();

        const progressRowsToUpsert = sectionsWithContent
          .map((section: any) => {
            const existing = existingModuleProgress.get(section.id);
            const isCompleted = Boolean(section.module_is_completed);
            const completedAt = isCompleted
              ? existing?.completed_at || section.module_completed_at || new Date().toISOString()
              : null;

            const hasChanged =
              !existing ||
              Boolean(existing.is_completed) !== isCompleted ||
              String(existing.completed_at || '') !== String(completedAt || '');

            if (!hasChanged) return null;

            return {
              user_id: userId,
              course_id: courseId,
              section_id: section.id,
              is_completed: isCompleted,
              completed_at: completedAt,
            };
          })
          .filter(Boolean);

        if (progressRowsToUpsert.length > 0) {
          const { error: syncModuleProgressError } = await supabaseClient
            .from('user_module_progress')
            .upsert(progressRowsToUpsert, {
              onConflict: 'user_id,course_id,section_id',
            });

          if (syncModuleProgressError) {
            console.error('Failed syncing user_module_progress from computed module states:', syncModuleProgressError);
          } else {
            console.log(`✅ Synced ${progressRowsToUpsert.length} module progress row(s) for user ${userId}`);
          }
        }
      } catch (syncError) {
        console.error('Error syncing computed module completion:', syncError);
      }
    }

    // ========================================
    // 5. Process reviews and calculate ratings
    // ========================================
    const processedReviews = (reviews || []).map((review: any) => ({
      id: review.id,
      rating: review.rating,
      review: review.review,
      createdAt: review.created_at,
      reviewerName: review.reviewer?.name || 'Anonymous',
      reviewerAvatar: review.reviewer?.avatar_url || null,
      reviewerId: review.reviewer?.id || null,
      instructorReply: review.instructor_reply || null,
      instructorRepliedAt: review.instructor_replied_at || null,
      acknowledgedAt: review.acknowledged_at || null,
      isPinned: Boolean(review.is_pinned)
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
    // 6. Construct structured response
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
      totalPDFs: resources?.length || 0,
      userProgress,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        userId: userId || null
      }
    };

    return new Response(
      JSON.stringify({
        success: true,
        message: "Course content retrieved successfully",
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
