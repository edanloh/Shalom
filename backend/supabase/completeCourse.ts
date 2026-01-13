// supabase/functions/completeCourse/index.ts
/**
 * Supabase Edge Function: completeCourse
 * Purpose: Issue course completion certificate and notify user
 * Endpoint: POST /completeCourse
 *
 * Request Body:
 * {
 *   "userId": "uuid",
 *   "courseId": "uuid"
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

const buildCertificateNumber = (courseId: string, userId: string) =>
  `CC-${courseId}-${userId}`;

async function notifyStreakUpdate(userId: string, activityAt: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceKey) return;
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/updateStreak`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
      body: JSON.stringify({ userId, activityAt }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("updateStreak failed:", res.status, text);
    }
  } catch (error) {
    console.error("Failed to update streak:", error);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, message: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const userId = body.userId;
    const courseId = body.courseId;

    if (!userId || !courseId) {
      return new Response(
        JSON.stringify({ success: false, message: "userId and courseId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: enrollment, error: enrollmentError } = await supabase
      .from("course_enrollments")
      .select("is_completed")
      .eq("user_id", userId)
      .eq("course_id", courseId)
      .maybeSingle();

    if (enrollmentError) throw enrollmentError;
    if (!enrollment) {
      return new Response(
        JSON.stringify({ success: false, message: "Enrollment not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!enrollment.is_completed) {
      return new Response(
        JSON.stringify({ success: false, message: "Course not completed" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: existingCert, error: certLookupError } = await supabase
      .from("certificates")
      .select("id")
      .eq("user_id", userId)
      .eq("course_id", courseId)
      .eq("certificate_type", "course_completion")
      .maybeSingle();

    if (certLookupError && certLookupError.code !== "PGRST116") {
      throw certLookupError;
    }

    let certificateIssued = false;
    let courseTitle = "Course Completion";

    if (!existingCert?.id) {
      const { data: course, error: courseError } = await supabase
        .from("courses")
        .select("title")
        .eq("id", courseId)
        .single();

      if (!courseError && course?.title) {
        courseTitle = course.title;
      }

      const certificateNumber = buildCertificateNumber(courseId, userId);

      const { error: insertError } = await supabase.from("certificates").insert({
        user_id: userId,
        course_id: courseId,
        certificate_type: "course_completion",
        certificate_number: certificateNumber,
        issued_at: new Date().toISOString(),
        metadata: {
          course_title: courseTitle,
          required_courses: 1,
          completed_courses: 1,
          progress_percent: 100,
          required_points: 0,
          earned_points: 0,
        },
      });

      if (insertError && insertError.code !== "23505") {
        throw insertError;
      }
      certificateIssued = true;
    }

    if (certificateIssued) {
      try {
        await fetch(`${supabaseUrl}/functions/v1/postNotification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
            apikey: serviceKey,
          },
          body: JSON.stringify({
            userId,
            title: "Course completed",
            message: `You completed ${courseTitle}. Your certificate is ready!`,
            type: "course",
            data: { courseId },
          }),
        });
      } catch (notifyError) {
        console.error("Failed to send completion notification:", notifyError);
      }
    }

    await notifyStreakUpdate(userId, new Date().toISOString());

    return new Response(
      JSON.stringify({ success: true, certificateIssued }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("completeCourse error", err);
    return new Response(
      JSON.stringify({ success: false, message: err.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
