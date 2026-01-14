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

async function recordCourseCompleted(userId: string, courseId: string, courseTitle: string) {
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
        type: "course_completed",
        title: `Course completed: ${courseTitle}`,
        points: 0,
        courseId,
        referenceKey: `course_completed:${courseId}`,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("postCreditEvent course_completed failed:", res.status, text);
    }
  } catch (error) {
    console.error("Failed to record course completion:", error);
  }
}

const isGoalComplete = (goal: any) => {
  const checks: Array<{ target: number; current: number }> = [];
  const targetHours = Number(goal.target_hours ?? 0);
  const targetLessons = Number(goal.target_lessons ?? 0);
  const targetCourses = Number(goal.target_courses ?? 0);
  const targetPoints = Number(goal.target_points ?? 0);
  const targetQuizzes = Number(goal.target_quizzes ?? 0);

  if (targetHours > 0) checks.push({ target: targetHours, current: Number(goal.current_hours ?? 0) });
  if (targetLessons > 0)
    checks.push({ target: targetLessons, current: Number(goal.current_lessons ?? 0) });
  if (targetCourses > 0)
    checks.push({ target: targetCourses, current: Number(goal.current_courses ?? 0) });
  if (targetPoints > 0) checks.push({ target: targetPoints, current: Number(goal.current_points ?? 0) });
  if (targetQuizzes > 0)
    checks.push({ target: targetQuizzes, current: Number(goal.current_quizzes ?? 0) });

  if (!checks.length) return false;
  return checks.every((c) => c.current >= c.target);
};

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

async function awardGoalCredits(userId: string, goal: any) {
  const rewardPoints = Number(goal.reward_points ?? 0);
  if (!rewardPoints || rewardPoints <= 0) return;
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceKey) return;
  const res = await fetch(`${supabaseUrl}/functions/v1/postCreditEvent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
    },
    body: JSON.stringify({
      userId,
      type: "goal_hit",
      title: `${goal.label || "Goal"} completed`,
      points: rewardPoints,
      referenceKey: `goal_completed:${goal.id}`,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error("postCreditEvent failed:", res.status, text);
  }
}

async function updateActiveGoalsForCourseCompletion(supabaseClient: any, userId: string, now: Date) {
  const { data: goals, error } = await supabaseClient
    .from("learning_goals")
    .select(
      "id,label,target_courses,current_courses,target_hours,current_hours,target_lessons,current_lessons,target_quizzes,current_quizzes,target_points,current_points,is_active,completed_at,reward_points"
    )
    .eq("user_id", userId)
    .eq("is_active", true)
    .is("completed_at", null)
    .or(`deadline.is.null,deadline.gte.${now.toISOString()}`);
  if (error) throw error;
  if (!goals?.length) return;

  const { count: completedCount, error: countErr } = await supabaseClient
    .from("course_enrollments")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_completed", true);
  if (countErr) throw countErr;

  const totalCompleted = Number(completedCount ?? 0);

  for (const goal of goals) {
    const updates: Record<string, number | string | boolean | null> = {};

    if (Number(goal.target_courses ?? 0) > 0 && Number(goal.current_courses ?? 0) !== totalCompleted) {
      const targetCourses = Number(goal.target_courses ?? 0);
      const cappedCourses = targetCourses > 0 ? Math.min(totalCompleted, targetCourses) : totalCompleted;
      updates.current_courses = cappedCourses;
      goal.current_courses = cappedCourses;
    }

    const completed = isGoalComplete(goal);
    if (completed) {
      updates.completed_at = now.toISOString();
      updates.is_active = false;
    }

    if (Object.keys(updates).length) {
      let query = supabaseClient.from("learning_goals").update(updates).eq("id", goal.id);
      if (updates.completed_at) {
        query = query.is("completed_at", null);
      }
      const { error: updateErr } = await query;
      if (updateErr) throw updateErr;
    }

    if (completed) {
      await awardGoalCredits(userId, goal);
    }
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

    await recordCourseCompleted(userId, courseId, courseTitle);

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

    const now = new Date();
    await notifyStreakUpdate(userId, now.toISOString());
    await updateActiveGoalsForCourseCompletion(supabase, userId, now);

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
