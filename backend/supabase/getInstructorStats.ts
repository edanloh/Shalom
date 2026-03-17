// supabase/functions/getInstructorStats/index.ts
/**
 * Supabase Edge Function: getInstructorStats
 * Purpose: Fetch instructor/admin dashboard statistics including courses, students, ratings, and recent activity
 * Endpoint: GET /getInstructorStats/{adminId}
 * Database: PostgreSQL (Supabase compatible)
 * Modification: Only calculates stats for published courses (is_published = true)
 */
// supabase/functions/getInstructorStats/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const adminId = pathParts[pathParts.length - 1];

    if (!adminId || adminId === "getInstructorStats") {
      return new Response(
        JSON.stringify({ success: false, message: "Admin ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify admin/instructor
    const { data: admin, error: adminError } = await supabaseClient
      .from("users")
      .select("id, name, role")
      .eq("id", adminId)
      .in("role", ["admin", "instructor"])
      .single();

    if (adminError || !admin) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Admin/Instructor not found or invalid role",
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Published courses
    const { data: courses, error: coursesError } = await supabaseClient
      .from("courses")
      .select("id, title, rating, is_published")
      .eq("instructor_id", adminId)
      .eq("is_published", true);

    if (coursesError) throw coursesError;

    const publishedCourseIds = courses?.map((c) => c.id) || [];

    // All instructor courses (for grading queue)
    const { data: allInstructorCourses, error: allCoursesError } =
      await supabaseClient
        .from("courses")
        .select("id")
        .eq("instructor_id", adminId);

    if (allCoursesError) throw allCoursesError;

    const allInstructorCourseIds = allInstructorCourses?.map((c) => c.id) || [];

    // Enrollments (published only)
    const { data: enrollments, error: enrollmentsError } =
      publishedCourseIds.length > 0
        ? await supabaseClient
            .from("course_enrollments")
            .select(
              "id, user_id, course_id, enrollment_date, progress_percentage, is_completed"
            )
            .in("course_id", publishedCourseIds)
        : { data: [], error: null };

    if (enrollmentsError) throw enrollmentsError;

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

    // Ratings
    const { data: courseRatings, error: ratingsError } =
      publishedCourseIds.length > 0
        ? await supabaseClient
            .from("course_ratings")
            .select("course_id, rating")
            .in("course_id", publishedCourseIds)
        : { data: [], error: null };

    if (ratingsError) throw ratingsError;

    const totalRatingsCount = courseRatings?.length || 0;

    const averageRating =
      totalRatingsCount > 0
        ? courseRatings.reduce((sum, r) => sum + (r.rating || 0), 0) /
          totalRatingsCount
        : 0;

    // Stats
    const totalCourses = courses?.length || 0;

    const uniqueStudents = new Set(
      (enrollments || []).map((e: any) => e.user_id)
    ).size;

    const newEnrollments30d = (enrollments || []).filter(
      (e: any) => new Date(e.enrollment_date) >= thirtyDaysAgo
    ).length;

    const newEnrollments7d = (enrollments || []).filter(
      (e: any) => new Date(e.enrollment_date) >= sevenDaysAgo
    ).length;

    const averageCompletion =
      enrollments && enrollments.length > 0
        ? enrollments.reduce(
            (sum: number, e: any) => sum + (e.progress_percentage || 0),
            0
          ) / enrollments.length
        : 0;

    const completedEnrollments = (enrollments || []).filter(
      (e: any) => e.is_completed
    ).length;

    const activeEnrollments = (enrollments || []).filter(
      (e: any) => !e.is_completed
    ).length;

    // Pending grading
    let pendingAssessmentCount = 0;

    if (allInstructorCourseIds.length > 0) {
      const { data: quizzes } = await supabaseClient
        .from("course_quizzes")
        .select("id")
        .in("course_id", allInstructorCourseIds);

      const quizIds = quizzes?.map((q) => q.id) || [];

      if (quizIds.length > 0) {
        const { data: questions } = await supabaseClient
          .from("quiz_questions")
          .select("id, quiz_id, graded_variations")
          .in("quiz_id", quizIds)
          .in("question_type", ["short-answer", "text"]);

        const { data: attempts } = await supabaseClient
          .from("quiz_attempts")
          .select("quiz_id, answers")
          .in("quiz_id", quizIds);

        for (const q of questions || []) {
          const graded = q.graded_variations || {};
          for (const a of attempts || []) {
            if (a.quiz_id !== q.quiz_id) continue;

            const ans = a.answers?.[q.id];
            if (!ans) continue;

            const norm = String(ans).trim().toLowerCase();
            if (!graded[norm]) pendingAssessmentCount++;
          }
        }
      }
    }

    // Tasks
    const { data: manualTasks } = await supabaseClient
      .from("instructor_tasks")
      .select("id, title, count, status, due_at")
      .eq("instructor_id", adminId)
      .in("status", ["pending", "overdue"])
      .limit(5);

    const { data: completedTasks } = await supabaseClient
      .from("instructor_tasks")
      .select("id, title, count, status, due_at")
      .eq("instructor_id", adminId)
      .eq("status", "completed")
      .limit(10);

    const { count: unreadMessagesCount } = await supabaseClient
      .from("direct_messages")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", adminId)
      .eq("is_read", false);

    // Recent activity
    const { data: recentEnrollments } =
      publishedCourseIds.length > 0
        ? await supabaseClient
            .from("course_enrollments")
            .select(
              `
              enrollment_date,
              users (name, email),
              courses (title)
            `
            )
            .in("course_id", publishedCourseIds)
            .order("enrollment_date", { ascending: false })
            .limit(10)
        : { data: [] };

    // Course performance
    const coursesPerformance = (courses || []).map((course: any) => {
      const courseEnrollments = (enrollments || []).filter(
        (e: any) => e.course_id === course.id
      );

      const enrolled = courseEnrollments.length;
      const completed = courseEnrollments.filter((e) => e.is_completed).length;

      return {
        course_id: course.id,
        title: course.title,
        enrolled_students: enrolled,
        completed_students: completed,
        completion_rate:
          enrolled > 0 ? ((completed / enrolled) * 100).toFixed(2) : "0.00",
        rating: parseFloat(course.rating || 0).toFixed(2),
      };
    });

    const responseData = {
      admin_id: adminId,
      statistics: {
        total_courses: totalCourses,
        total_students: uniqueStudents,
        average_rating: averageRating.toFixed(2),
        new_enrollments_this_month: newEnrollments30d,
        new_enrollments_this_week: newEnrollments7d,
        average_completion_rate: averageCompletion.toFixed(2),
        active_students: activeEnrollments,
        completed_courses: completedEnrollments,
      },
      recent_activity: (recentEnrollments || []).map((a: any) => ({
        student_name: a.users?.name,
        student_email: a.users?.email,
        course_title: a.courses?.title,
        date: a.enrollment_date,
      })),
      upcoming_sessions: [], // ← cleaned
      pending_tasks: [
        ...(manualTasks || []),
        {
          id: "assignment_grading",
          title: "Assessments to Grade",
          count: pendingAssessmentCount,
          status: "pending",
        },
        {
          id: "unread_messages",
          title: "Unread Messages",
          count: unreadMessagesCount || 0,
          status: "pending",
        },
      ],
      completed_tasks: completedTasks || [],
      courses_performance: coursesPerformance,
    };

    return new Response(
      JSON.stringify({
        success: true,
        message: "Instructor statistics retrieved successfully",
        data: responseData,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        success: false,
        message: "Failed to retrieve instructor statistics",
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});