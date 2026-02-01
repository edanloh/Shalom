// supabase/functions/updatePDFProgress/index.ts
/**
 * Supabase Edge Function: updatePDFProgress
 * Purpose: Update PDF completion status and recalculate course progress
 * Endpoint: POST /updatePDFProgress
 *
 * Request Body:
 * {
 *   "userId": "uuid",
 *   "pdfId": "uuid",
 *   "courseId": "uuid",
 *   "isCompleted": boolean
 * }
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};

async function recordLessonCompleted(userId: string, courseId: string, pdfId: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceKey) return;
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/postCreditEvent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
      body: JSON.stringify({
        userId,
        type: "lesson_completed",
        title: "Lesson completed",
        points: 0,
        courseId,
        referenceKey: `lesson_completed:pdf:${pdfId}`,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("postCreditEvent lesson_completed failed:", res.status, text);
    }
  } catch (error) {
    console.error("Failed to record lesson completion:", error);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, message: "Method not allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    const body = await req.json();
    const { userId, pdfId, courseId, isCompleted } = body;

    // Validate required parameters
    if (!userId || !pdfId || !courseId || isCompleted === undefined) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Missing required parameters: userId, resourceId, courseId, or isCompleted",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: existingProgress, error: existingError } = await supabase
      .from("resource_progress")
      .select("is_completed")
      .eq("user_id", userId)
      .eq("resource_id", pdfId)
      .maybeSingle();
    if (existingError && existingError.code !== "PGRST116") {
      throw existingError;
    }

    // Upsert PDF progress
    const { data: progressData, error: progressError } = await supabase
      .from("resource_progress")
      .upsert(
        {
          user_id: userId,
          resource_id: pdfId,
          is_completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,resource_id",
        }
      )
      .select()
      .single();

    if (progressError) {
      console.error("Error updating PDF progress:", progressError);
      throw progressError;
    }
    const lessonCompleted = Boolean(isCompleted) && !Boolean(existingProgress?.is_completed);
    if (lessonCompleted) {
      await recordLessonCompleted(userId, courseId, pdfId);
    }

    // Recalculate course progress
    // Get all course items (videos, quizzes, Documents: PDF/PPTX/DOCX)
    const [
      { data: videos },
      { data: quizzes },
      { data: documents },
    ] = await Promise.all([
      supabase
        .from("course_videos")
        .select("id")
        .eq("course_id", courseId),
      supabase
        .from("course_quizzes")
        .select("id")
        .eq("course_id", courseId),
      supabase
        .from("course_resources")
        .select("id")
        .eq("course_id", courseId)
        .in("resource_type", ["pdf", "document", "ppt"]),
    ]);

    const totalVideos = videos?.length || 0;
    const totalQuizzes = quizzes?.length || 0;
    const totalDocuments = documents?.length || 0;
    const totalItems = totalVideos + totalQuizzes + totalDocuments;

    if (totalItems === 0) {
      // No items in course, cannot calculate progress
      return new Response(
        JSON.stringify({
          success: true,
          message: "PDF progress updated successfully",
          data: {
            pdfProgress: progressData,
          },
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get completed items for user
    const videoIds = (videos || []).map((v: any) => v.id);
    const quizIds = (quizzes || []).map((q: any) => q.id);
    const documentIds = (documents || []).map((d: any) => d.id);

    const [
      { data: completedVideos },
      { data: completedQuizzes },
      { data: completedDocuments },
    ] = await Promise.all([
      videoIds.length > 0
        ? supabase
            .from("user_video_progress")
            .select("video_id")
            .eq("user_id", userId)
            .in("video_id", videoIds)
            .eq("is_completed", true)
        : { data: [] },
      quizIds.length > 0
        ? supabase
            .from("quiz_attempts")
            .select("quiz_id")
            .eq("user_id", userId)
            .in("quiz_id", quizIds)
            .eq("is_passed", true)
        : { data: [] },
      documentIds.length > 0
        ? supabase
            .from("resource_progress")
            .select("resource_id")
            .eq("user_id", userId)
            .in("resource_id", documentIds)
            .eq("is_completed", true)
        : { data: [] },
    ]);

    // Count unique completed items
    const completedVideoIds = new Set((completedVideos || []).map((v: any) => v.video_id));
    const completedQuizIds = new Set((completedQuizzes || []).map((q: any) => q.quiz_id));
    const completedDocumentIds = new Set((completedDocuments || []).map((d: any) => d.resource_id));

    const completedCount = completedVideoIds.size + completedQuizIds.size + completedDocumentIds.size;
    const progressPercentage = ((completedCount / totalItems) * 100).toFixed(2);
    const isAllCompleted = completedCount >= totalItems;

    // Update course enrollment
    const { error: enrollmentError } = await supabase
      .from("course_enrollments")
      .update({
        progress_percentage: progressPercentage,
        is_completed: isAllCompleted,
        completion_date: isAllCompleted ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("course_id", courseId);

    if (enrollmentError) {
      console.error("Error updating course enrollment:", enrollmentError);
      // Don't throw - PDF progress was saved successfully
    }

    // If course just completed, trigger certificate issuance
    if (isAllCompleted) {
      try {
        await fetch(`${supabaseUrl}/functions/v1/completeCourse`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
            apikey: serviceKey,
          },
          body: JSON.stringify({
            userId,
            courseId,
          }),
        });
      } catch (certError) {
        console.error("Failed to trigger certificate issuance:", certError);
        // Don't throw - this is a non-critical error
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Resource progress updated successfully",
        data: {
          pdfProgress: progressData,
          courseProgress: {
            progress_percentage: progressPercentage,
            is_completed: isAllCompleted,
            completed_items: completedCount,
            total_items: totalItems,
          },
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("updatePDFProgress error:", err);
    return new Response(
      JSON.stringify({
        success: false,
        message: err.message || "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
