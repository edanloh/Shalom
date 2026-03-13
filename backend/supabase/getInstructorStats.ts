// supabase/functions/getInstructorStats/index.ts
/**
 * Supabase Edge Function: getInstructorStats
 * Purpose: Fetch instructor/admin dashboard statistics including courses, students, ratings, and recent activity
 * Endpoint: GET /getInstructorStats/{adminId}
 * Database: PostgreSQL (Supabase compatible)
 * Modification: Only calculates stats for published courses (is_published = true)
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const url = new URL(req.url);

    // Extract adminId from path: /getInstructorStats/{adminId}
    const pathParts = url.pathname.split("/").filter(Boolean);
    const adminId = pathParts[pathParts.length - 1];

    if (!adminId || adminId === "getInstructorStats") {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Admin ID is required",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Fetching instructor stats for:", adminId);

    // Verify the admin exists and has admin/instructor role
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
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get this instructor's published courses for dashboard/course stats
    const { data: courses, error: coursesError } = await supabaseClient
      .from("courses")
      .select("id, title, rating, is_published")
      .eq("instructor_id", adminId)
      .eq("is_published", true);

    if (coursesError) throw coursesError;

    const publishedCourseIds = courses?.map((c) => c.id) || [];

    // Fetch all instructor courses for assessment grading counts so the dashboard
    // matches the Assessments page queue.
    const { data: allInstructorCourses, error: allCoursesError } = await supabaseClient
      .from("courses")
      .select("id")
      .eq("instructor_id", adminId);

    if (allCoursesError) throw allCoursesError;

    const allInstructorCourseIds = allInstructorCourses?.map((c) => c.id) || [];

    // Get enrollments for PUBLISHED courses only
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

    // Date thresholds
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // =========================
    // 🔧 FIX: Fetch ACTUAL rating values
    // =========================
    const { data: courseRatings, error: ratingsError } =
      publishedCourseIds.length > 0
        ? await supabaseClient
            .from("course_ratings")
            .select("course_id, rating")
            .in("course_id", publishedCourseIds)
        : { data: [], error: null };

    if (ratingsError) throw ratingsError;

    // =========================
    // 🔧 FIX: Correct global average rating calculation
    // =========================
    const totalRatingsCount = courseRatings?.length || 0;

    const averageRating =
      totalRatingsCount > 0
        ? courseRatings.reduce((sum, r) => sum + (r.rating || 0), 0) /
          totalRatingsCount
        : 0;

    // Other statistics (unchanged)
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

    const upcomingAssignmentsEnd = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000
    );

    const { data: upcomingAssignments, error: upcomingError } =
      publishedCourseIds.length > 0
        ? await supabaseClient
            .from("assignments")
            .select("id, title, due_date, course_id")
            .in("course_id", publishedCourseIds)
            .gte("due_date", now.toISOString())
            .lte("due_date", upcomingAssignmentsEnd.toISOString())
            .order("due_date", { ascending: true })
            .limit(5)
        : { data: [], error: null };

    if (upcomingError) throw upcomingError;

    let pendingAssessmentCount = 0;

    if (allInstructorCourseIds.length > 0) {
      const { data: assessmentQuizzes, error: quizzesError } = await supabaseClient
        .from("course_quizzes")
        .select("id")
        .in("course_id", allInstructorCourseIds);

      if (quizzesError) throw quizzesError;

      const assessmentQuizIds = assessmentQuizzes?.map((q) => q.id) || [];

      if (assessmentQuizIds.length > 0) {
        const { data: shortAnswerQuestions, error: questionsError } = await supabaseClient
          .from("quiz_questions")
          .select("id, quiz_id, graded_variations")
          .in("quiz_id", assessmentQuizIds)
          .in("question_type", ["short-answer", "text"]);

        if (questionsError) throw questionsError;

        if ((shortAnswerQuestions || []).length > 0) {
          const { data: quizAttempts, error: attemptsError } = await supabaseClient
            .from("quiz_attempts")
            .select("quiz_id, answers")
            .in("quiz_id", assessmentQuizIds);

          if (attemptsError) throw attemptsError;

          for (const question of shortAnswerQuestions || []) {
            const gradedVariations = question.graded_variations || {};
            for (const attempt of quizAttempts || []) {
              if (attempt.quiz_id !== question.quiz_id) continue;

              const userAnswer = attempt.answers?.[question.id];
              if (!userAnswer) continue;

              const normalizedAnswer = String(userAnswer).trim().toLowerCase();
              if (!gradedVariations[normalizedAnswer]) {
                pendingAssessmentCount++;
              }
            }
          }
        }
      }
    }

    const { data: manualTasks, error: manualTasksError } = await supabaseClient
      .from("instructor_tasks")
      .select("id, title, count, status, due_at")
      .eq("instructor_id", adminId)
      .in("status", ["pending", "overdue"])
      .order("due_at", { ascending: true })
      .limit(5);

    if (manualTasksError) {
      console.warn("Failed to load instructor_tasks:", manualTasksError);
    }

    const { data: completedTasks, error: completedTasksError } =
      await supabaseClient
        .from("instructor_tasks")
        .select("id, title, count, status, due_at")
        .eq("instructor_id", adminId)
        .eq("status", "completed")
        .order("due_at", { ascending: false })
        .limit(10);

    if (completedTasksError) {
      console.warn("Failed to load completed instructor_tasks:", completedTasksError);
    }

    const { count: unreadMessagesCount, error: unreadMessagesError } =
      await supabaseClient
        .from("direct_messages")
        .select("id", { count: "exact", head: true })
        .eq("recipient_id", adminId)
        .eq("is_read", false);

    if (unreadMessagesError) throw unreadMessagesError;

    // Get recent activity for PUBLISHED courses only
    const { data: recentEnrollments, error: recentError } =
      publishedCourseIds.length > 0
        ? await supabaseClient
            .from("course_enrollments")
            .select(
              `
            enrollment_date,
            users (
              name,
              email
            ),
            courses (
              title,
              is_published
            )
          `
            )
            .in("course_id", publishedCourseIds)
            .order("enrollment_date", { ascending: false })
            .limit(10)
        : { data: [], error: null };

    if (recentError) throw recentError;

    // Build course performance data (unchanged)
    const coursesPerformance = (courses || []).map((course: any) => {
      const courseEnrollments = (enrollments || []).filter(
        (e: any) => e.course_id === course.id
      );

      const enrolledCount = courseEnrollments.length;
      const completedCount = courseEnrollments.filter(
        (e: any) => e.is_completed
      ).length;

      const avgProgress =
        enrolledCount > 0
          ? courseEnrollments.reduce(
              (sum: number, e: any) =>
                sum + (e.progress_percentage || 0),
              0
            ) / enrolledCount
          : 0;

      const totalRatings = (courseRatings || []).filter(
        (r: any) => r.course_id === course.id
      ).length;

      const completionRate =
        enrolledCount > 0 ? (completedCount / enrolledCount) * 100 : 0;

      return {
        course_id: course.id,
        title: course.title,
        enrolled_students: enrolledCount,
        average_progress: avgProgress.toFixed(2),
        completed_students: completedCount,
        completion_rate: completionRate.toFixed(2),
        rating: parseFloat(course.rating || 0).toFixed(2),
        // total_ratings: totalRatings
      };
    });

    coursesPerformance.sort(
      (a, b) => b.enrolled_students - a.enrolled_students
    );

    const responseData = {
      admin_id: adminId,
      statistics: {
        total_courses: totalCourses,
        total_students: uniqueStudents,
        average_rating: averageRating.toFixed(2), // 🔧 FIXED
        new_enrollments_this_month: newEnrollments30d,
        new_enrollments_this_week: newEnrollments7d,
        average_completion_rate: averageCompletion.toFixed(2),
        active_students: activeEnrollments,
        completed_courses: completedEnrollments,
      },
      recent_activity: (recentEnrollments || []).map((activity: any) => ({
        type: "enrollment",
        student_name: activity.users?.name,
        student_email: activity.users?.email,
        course_title: activity.courses?.title,
        date: activity.enrollment_date,
        formatted_date: new Date(
          activity.enrollment_date
        ).toLocaleDateString(),
      })),
      upcoming_sessions: (upcomingAssignments || [])
        .filter((assignment: any) => assignment.due_date)
        .map((assignment: any) => ({
          id: `assignment_${assignment.id}`,
          title: assignment.title,
          starts_at: assignment.due_date,
          location: null,
          formatted_date: new Date(assignment.due_date).toLocaleDateString(),
          formatted_time: new Date(assignment.due_date).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        }))
        .sort(
          (a, b) =>
            new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
        )
        .slice(0, 5),
      pending_tasks: [
        ...(manualTasks || []).map((task: any) => ({
          id: task.id,
          title: task.title,
          count: Number(task.count || 0),
          status: task.status,
          due_at: task.due_at,
          formatted_due: task.due_at
            ? new Date(task.due_at).toLocaleDateString()
            : null,
        })),
        {
          id: "assignment_grading",
          title: "Assessments to Grade",
          count: Number(pendingAssessmentCount || 0),
          status: "pending",
          due_at: null,
          formatted_due: null,
        },
        {
          id: "unread_messages",
          title: "Unread Messages",
          count: Number(unreadMessagesCount || 0),
          status: "pending",
          due_at: null,
          formatted_due: null,
        },
      ],
      completed_tasks: (completedTasks || []).map((task: any) => ({
        id: task.id,
        title: task.title,
        count: Number(task.count || 0),
        status: task.status,
        due_at: task.due_at,
        formatted_due: task.due_at
          ? new Date(task.due_at).toLocaleDateString()
          : null,
      })),
      courses_performance: coursesPerformance,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        note: "Statistics calculated for published courses only (is_published = true)",
      },
    };

    return new Response(
      JSON.stringify({
        success: true,
        message:
          "Instructor statistics retrieved successfully (published courses only)",
        data: responseData,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error retrieving instructor stats:", error);

    return new Response(
      JSON.stringify({
        success: false,
        message: "Failed to retrieve instructor statistics",
        error: error.message,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID(),
        },
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
