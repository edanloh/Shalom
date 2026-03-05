// supabase/functions/getStudentProfile/index.ts
/**
 * Supabase Edge Function: getStudentProfile
 * Purpose: Fetch detailed student profile for instructor view
 * Endpoint: GET /getStudentProfile/{userId}
 * Database: PostgreSQL (Supabase compatible)
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
};

const formatLastActive = (hours: number): string => {
  if (hours < 1) return "Just now";
  if (hours < 24) return `${Math.floor(hours)} ${Math.floor(hours) === 1 ? "hour" : "hours"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"} ago`;
};

const calculateEngagementScore = (lastActivity: string | null): number => {
  if (!lastActivity) return 30;
  const now = new Date();
  const activityDate = new Date(lastActivity);
  const daysDiff = (now.getTime() - activityDate.getTime()) / (1000 * 60 * 60 * 24);
  if (daysDiff <= 7) return 100;
  if (daysDiff <= 14) return 70;
  if (daysDiff <= 30) return 50;
  return 30;
};

const pickLatestIso = (values: Array<string | null | undefined>): string | null => {
  const dates = values
    .filter(Boolean)
    .map((value) => new Date(value as string))
    .filter((value) => !Number.isNaN(value.getTime()))
    .sort((a, b) => b.getTime() - a.getTime());
  return dates.length ? dates[0].toISOString() : null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const userId = pathParts[pathParts.length - 1];

    if (!userId || userId === "getStudentProfile") {
      return new Response(
        JSON.stringify({ success: false, message: "User ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id,name,email,is_active,created_at,avatar_url")
      .eq("id", userId)
      .single();
    if (userError || !user) throw userError || new Error("User not found");

    const { data: enrollments, error: enrollError } = await supabase
      .from("course_enrollments")
      .select(
        "course_id,enrollment_date,completion_date,progress_percentage,is_completed,total_watch_time_minutes,updated_at,courses(id,title)"
      )
      .eq("user_id", userId);
    if (enrollError) throw enrollError;

    const { data: videoActivity } = await supabase
      .from("user_video_progress")
      .select("updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1);

    const { data: lessonActivity } = await supabase
      .from("user_lesson_progress")
      .select("updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1);

    const { data: quizAttempts, error: quizError } = await supabase
      .from("quiz_attempts")
      .select(
        "quiz_id,score,is_passed,completed_at,course_quizzes(id,title,course_id,courses(title))"
      )
      .eq("user_id", userId)
      .order("completed_at", { ascending: false })
      .limit(10);
    if (quizError) throw quizError;

    const { data: quizScoresByCourse } = await supabase
      .from("quiz_attempts")
      .select("score,quiz_id,course_quizzes(course_id)")
      .eq("user_id", userId);

    const { count: achievementsCount } = await supabase
      .from("user_achievements")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    const { data: certificates } = await supabase
      .from("certificates")
      .select("id,course_id")
      .eq("user_id", userId);

    const { data: streakRows } = await supabase
      .from("user_analytics")
      .select("streak_days")
      .eq("user_id", userId)
      .order("streak_days", { ascending: false })
      .limit(1);

    const totalEnrollments = enrollments?.length || 0;
    const completedCourses = enrollments?.filter((e) => e.is_completed).length || 0;
    const averageProgress =
      totalEnrollments > 0
        ? enrollments.reduce((sum, e) => sum + Number(e.progress_percentage || 0), 0) / totalEnrollments
        : 0;
    const totalMinutes =
      enrollments?.reduce((sum, e) => sum + Number(e.total_watch_time_minutes || 0), 0) || 0;

    const lastEnrollmentActivity =
      enrollments && enrollments.length > 0
        ? enrollments.reduce((latest: string | null, e) => {
            if (!latest) return e.updated_at;
            return new Date(e.updated_at) > new Date(latest) ? e.updated_at : latest;
          }, null)
        : null;

    const lastActivityAt = pickLatestIso([
      lastEnrollmentActivity,
      quizAttempts?.[0]?.completed_at || null,
      videoActivity?.[0]?.updated_at || null,
      lessonActivity?.[0]?.updated_at || null,
    ]);

    const engagement = calculateEngagementScore(lastActivityAt);
    const formattedLastActivity = lastActivityAt
      ? formatLastActive((Date.now() - new Date(lastActivityAt).getTime()) / (1000 * 60 * 60))
      : "Never";

    const quizScores = (quizAttempts || []).map((q) => Number(q.score || 0));
    const averageScore =
      quizScores.length > 0 ? Math.round(quizScores.reduce((a, b) => a + b, 0) / quizScores.length) : 0;

    const certificateCourseIds = new Set((certificates || []).map((c) => c.course_id));
    const quizScoresByCourseMap = new Map<string, number[]>();
    (quizScoresByCourse || []).forEach((row: any) => {
      const courseId = row?.course_quizzes?.course_id;
      if (!courseId) return;
      const score = Number(row.score || 0);
      const scores = quizScoresByCourseMap.get(courseId) || [];
      scores.push(score);
      quizScoresByCourseMap.set(courseId, scores);
    });

    const getCourseGrade = (courseId: string, fallback: number) => {
      const scores = quizScoresByCourseMap.get(courseId);
      if (!scores || scores.length === 0) return fallback;
      return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    };

    const currentCourses =
      enrollments
        ?.filter((e) => !e.is_completed)
        .map((e) => ({
          id: e.course_id,
          name: e.courses?.title || "Course",
          progress: Math.round(Number(e.progress_percentage || 0)),
          grade: getCourseGrade(e.course_id, Math.round(Number(e.progress_percentage || 0))),
        })) ?? [];

    const completedCoursesData =
      enrollments
        ?.filter((e) => e.is_completed)
        .map((e) => ({
          id: e.course_id,
          name: e.courses?.title || "Course",
          completedDate: e.completion_date
            ? new Date(e.completion_date).toISOString().split("T")[0]
            : "N/A",
          grade: getCourseGrade(e.course_id, Math.round(Number(e.progress_percentage || 0))),
          certificate: certificateCourseIds.has(e.course_id),
        })) ?? [];

    const quizResults =
      (quizAttempts || []).map((qa) => ({
        quiz: qa.course_quizzes?.title || "Quiz",
        score: Math.round(Number(qa.score || 0)),
        date: qa.completed_at
          ? new Date(qa.completed_at).toISOString().split("T")[0]
          : "N/A",
        course: qa.course_quizzes?.courses?.title || null,
      })) ?? [];

    const strengths: string[] = [];
    const risks: string[] = [];
    if (averageScore >= 85) strengths.push("Quiz Performance");
    if (completedCourses > 0) strengths.push("Course Completion");
    if (engagement >= 70) strengths.push("Consistency");
    if (averageScore > 0 && averageScore < 70) risks.push("Quiz Performance");
    if (engagement < 50) risks.push("Low Engagement");
    if (averageProgress < 50 && totalEnrollments > 0) risks.push("Course Progress");

    const payload = {
      id: user.id,
      name: user.name,
      email: user.email,
      enabled: user.is_active !== false,
      enrolledDate: user.created_at ? new Date(user.created_at).toISOString().split("T")[0] : "N/A",
      progress: Math.round(averageProgress),
      lastActivity: formattedLastActivity,
      lastActivityAt,
      engagement: Math.round(engagement),
      coursesEnrolled: totalEnrollments,
      completedCourses,
      totalHours: Math.round(totalMinutes / 60),
      currentCourses,
      completedCoursesData,
      quizResults,
      streak: Number(streakRows?.[0]?.streak_days || 0),
      badges: Number(achievementsCount || 0),
      averageScore,
      strengths,
      risks,
      avatarUrl: user.avatar_url
    };

    return new Response(JSON.stringify({ success: true, data: payload }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error fetching student profile:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Failed to fetch student profile",
        error: error.message || "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
