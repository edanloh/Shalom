import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
};

const dayMs = 24 * 60 * 60 * 1000;

const toPercent = (value: number) => Math.round(Number.isFinite(value) ? value : 0);

const formatDayLabel = (date: Date) =>
  date.toLocaleDateString("en-US", { weekday: "short" });

const formatMonthLabel = (date: Date) =>
  date.toLocaleDateString("en-US", { month: "short" });
const formatMonthYearLabel = (date: Date) =>
  date.toLocaleDateString("en-US", { month: "short", year: "numeric" });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const adminId = pathParts[pathParts.length - 1];
    const days = Math.max(1, Number(url.searchParams.get("days") || 30));
    const courseId = url.searchParams.get("courseId");

    if (!adminId || adminId === "getInstructorAnalytics") {
      return new Response(
        JSON.stringify({ success: false, message: "Admin ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: admin, error: adminError } = await supabase
      .from("users")
      .select("id,name,role")
      .eq("id", adminId)
      .in("role", ["admin", "instructor"])
      .single();

    if (adminError || !admin) {
      return new Response(
        JSON.stringify({ success: false, message: "Admin/Instructor not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let coursesQuery = supabase
      .from("courses")
      .select("id,title,category_id,rating,is_published,instructor_id,instructor_name")
      .eq("is_published", true)
      .eq("instructor_id", adminId);

    let { data: courses, error: coursesError } = await coursesQuery;
    if (coursesError) throw coursesError;

    if (!courses || courses.length === 0) {
      const fallback = await supabase
        .from("courses")
        .select("id,title,category_id,rating,is_published,instructor_id,instructor_name")
        .eq("is_published", true)
        .eq("instructor_name", admin.name);
      courses = fallback.data || [];
    }

    const courseIds = courses.map((c) => c.id);
    const courseIdFilter = courseId && courseIds.includes(courseId) ? [courseId] : courseIds;

    const { data: enrollments, error: enrollmentsError } =
      courseIdFilter.length > 0
        ? await supabase
            .from("course_enrollments")
            .select(
              "course_id,user_id,progress_percentage,is_completed,total_watch_time_minutes,enrollment_date,updated_at,last_activity_at"
            )
            .in("course_id", courseIdFilter)
        : { data: [], error: null };

    if (enrollmentsError) throw enrollmentsError;

    const { data: ratings, error: ratingsError } =
      courseIdFilter.length > 0
        ? await supabase
            .from("course_ratings")
            .select("course_id,rating")
            .in("course_id", courseIdFilter)
        : { data: [], error: null };

    if (ratingsError) throw ratingsError;

    const { data: categories, error: categoriesError } =
      courseIdFilter.length > 0
        ? await supabase
            .from("categories")
            .select("id,name")
            .in("id", courses.map((c) => c.category_id).filter(Boolean))
        : { data: [], error: null };

    if (categoriesError) throw categoriesError;

    const categoryMap = new Map<string, string>(
      (categories || []).map((c: any) => [String(c.id), String(c.name)])
    );

    const distinctStudents = new Set((enrollments || []).map((e) => e.user_id));
    const totalStudents = distinctStudents.size;
    const avgProgress =
      enrollments && enrollments.length > 0
        ? enrollments.reduce((sum, e) => sum + Number(e.progress_percentage || 0), 0) / enrollments.length
        : 0;
    const completedCount = (enrollments || []).filter((e) => e.is_completed).length;
    const completionRate = enrollments.length > 0 ? (completedCount / enrollments.length) * 100 : 0;
    const totalWatchMinutes = (enrollments || []).reduce(
      (sum, e) => sum + Number(e.total_watch_time_minutes || 0),
      0
    );

    const ratingValues = (ratings || []).map((r) => Number(r.rating || 0));
    const averageRating =
      ratingValues.length > 0
        ? ratingValues.reduce((sum, r) => sum + r, 0) / ratingValues.length
        : 0;

    const now = new Date();
    const start = new Date(now.getTime() - days * dayMs);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(monthStart.getTime() - 1);

    const enrollmentTrendMap = new Map<string, number>();
    let currentMonthEnrollments = 0;
    let previousMonthEnrollments = 0;
    const useDailyLabels = days <= 31;

    for (const enrollment of enrollments || []) {
      if (!enrollment.enrollment_date) continue;
      const date = new Date(enrollment.enrollment_date);
      if (date >= monthStart && date <= now) {
        currentMonthEnrollments += 1;
      } else if (date >= previousMonthStart && date <= previousMonthEnd) {
        previousMonthEnrollments += 1;
      }
      if (date < start) continue;
      const label = useDailyLabels
        ? date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
        : formatMonthLabel(date);
      enrollmentTrendMap.set(label, (enrollmentTrendMap.get(label) || 0) + 1);
    }

    const enrollment_trend = Array.from(enrollmentTrendMap.entries()).map(
      ([label, count]) => ({ month: label, students: count })
    );
    const enrollment_monthly = {
      current: { label: formatMonthYearLabel(monthStart), students: currentMonthEnrollments },
      previous: { label: formatMonthYearLabel(previousMonthStart), students: previousMonthEnrollments },
    };

    const completion_breakdown = [
      {
        name: "Completed",
        value: (enrollments || []).filter((e) => e.is_completed).length,
      },
      {
        name: "In Progress",
        value: (enrollments || []).filter(
          (e) => !e.is_completed && Number(e.progress_percentage || 0) > 0
        ).length,
      },
      {
        name: "Not Started",
        value: (enrollments || []).filter(
          (e) => Number(e.progress_percentage || 0) <= 0
        ).length,
      },
    ];

    const activityByDay: Array<{ day: string; active: number; inactive: number }> = [];
    for (let i = 6; i >= 0; i -= 1) {
      const dayStart = new Date(now.getTime() - i * dayMs);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart.getTime() + dayMs);

      const activeSet = new Set(
        (enrollments || [])
          .filter((e) => {
            const updated = new Date(
              e.last_activity_at || e.updated_at || e.enrollment_date || 0
            );
            return updated >= dayStart && updated < dayEnd;
          })
          .map((e) => e.user_id)
      );

      const activeCount = activeSet.size;
      activityByDay.push({
        day: formatDayLabel(dayStart),
        active: activeCount,
        inactive: Math.max(0, totalStudents - activeCount),
      });
    }

    const categoryScores = new Map<string, { total: number; count: number }>();
    for (const enrollment of enrollments || []) {
      const course = courses.find((c) => c.id === enrollment.course_id);
      const categoryName = course
        ? String(categoryMap.get(course.category_id) ?? "Uncategorized")
        : "Uncategorized";
      const entry = categoryScores.get(categoryName) || { total: 0, count: 0 };
      entry.total += Number(enrollment.progress_percentage || 0);
      entry.count += 1;
      categoryScores.set(categoryName, entry);
    }

    const category_performance = Array.from(categoryScores.entries()).map(
      ([category, value]) => ({
        category,
        value: toPercent(value.count > 0 ? value.total / value.count : 0),
      })
    );

    const coursePerformance = courses.map((course) => {
      const courseEnrollments = (enrollments || []).filter((e) => e.course_id === course.id);
      const courseRatingValues = (ratings || [])
        .filter((r) => r.course_id === course.id)
        .map((r) => Number(r.rating || 0));
      const avgCourseRating =
        courseRatingValues.length > 0
          ? courseRatingValues.reduce((sum, r) => sum + r, 0) / courseRatingValues.length
          : Number(course.rating || 0);
      const courseAvgProgress =
        courseEnrollments.length > 0
          ? courseEnrollments.reduce((sum, e) => sum + Number(e.progress_percentage || 0), 0) /
            courseEnrollments.length
          : 0;
      const courseCompletionRate =
        courseEnrollments.length > 0
          ? (courseEnrollments.filter((e) => e.is_completed).length / courseEnrollments.length) * 100
          : 0;
      return {
        id: course.id,
        name: course.title,
        students: courseEnrollments.length,
        rating: Number(avgCourseRating.toFixed(2)),
        completion: toPercent(courseCompletionRate),
        engagement: toPercent(courseAvgProgress),
      };
    });

    const cohortCourseIds = courses.map((course) => course.id).filter(Boolean);
    const quizStatsByCourse = new Map<
      string,
      { total: number; pass: number; scoreSum: number }
    >();

    if (cohortCourseIds.length > 0) {
      const { data: quizAttempts } = await supabase
        .from("quiz_attempts")
        .select("score,is_passed,course_quizzes!inner(course_id)")
        .in("course_quizzes.course_id", cohortCourseIds);

      (quizAttempts || []).forEach((attempt: any) => {
        const courseId = attempt?.course_quizzes?.course_id;
        if (!courseId) return;
        const score = Number(attempt.score || 0);
        const isPassed = Boolean(attempt.is_passed);
        const current = quizStatsByCourse.get(courseId) || {
          total: 0,
          pass: 0,
          scoreSum: 0,
        };
        current.total += 1;
        current.pass += isPassed ? 1 : 0;
        current.scoreSum += Number.isFinite(score) ? score : 0;
        quizStatsByCourse.set(courseId, current);
      });
    }

    const cohort_analytics = courses.map((course) => {
      const courseEnrollments = (enrollments || []).filter((e) => e.course_id === course.id);
      const enrolledCount = courseEnrollments.length;
      const activeLearnerSet = new Set(
        courseEnrollments
          .filter((e) => {
            const updated = new Date(
              e.last_activity_at || e.updated_at || e.enrollment_date || 0
            );
            return updated >= start;
          })
          .map((e) => e.user_id)
      );
      const avgProgress =
        enrolledCount > 0
          ? courseEnrollments.reduce((sum, e) => sum + Number(e.progress_percentage || 0), 0) /
            enrolledCount
          : 0;
      const completionRate =
        enrolledCount > 0
          ? (courseEnrollments.filter((e) => e.is_completed).length / enrolledCount) * 100
          : 0;
      const quizStats = quizStatsByCourse.get(course.id) || {
        total: 0,
        pass: 0,
        scoreSum: 0,
      };
      const averageQuizScore =
        quizStats.total > 0 ? quizStats.scoreSum / quizStats.total : 0;
      const quizPassRate =
        quizStats.total > 0 ? (quizStats.pass / quizStats.total) * 100 : 0;

      return {
        course_id: course.id,
        course_name: course.title,
        enrolled: enrolledCount,
        active_learners: activeLearnerSet.size,
        average_progress: toPercent(avgProgress),
        completion_rate: toPercent(completionRate),
        average_quiz_score: toPercent(averageQuizScore),
        quiz_pass_rate: toPercent(quizPassRate),
      };
    });

    const course_performance = coursePerformance.map((c) => ({
      course: c.name,
      engagement: c.engagement,
      completion: c.completion,
    }));

    let module_performance: Array<{ module: string; completion: number; avgScore: number }> = [];
    let weekly_study_time: Array<{ week: string; hours: number }> = [];
    let cohort_metrics: {
      enrolled: number;
      active_learners: number;
      average_progress: number;
      completion_rate: number;
      average_quiz_score: number;
      quiz_pass_rate: number;
      submissions_pending: number;
      submissions_graded: number;
      average_watch_hours: number;
    } | null = null;

    if (courseIdFilter.length === 1) {
      const activeCourseId = courseIdFilter[0];
      const { data: sections } = await supabase
        .from("course_sections")
        .select("id,title,order_index")
        .eq("course_id", activeCourseId)
        .order("order_index", { ascending: true });

      const { data: courseQuizScores } = await supabase
        .from("quiz_attempts")
        .select("score,is_passed,course_quizzes(course_id)")
        .eq("course_quizzes.course_id", activeCourseId);

      const quizScores =
        (courseQuizScores || [])
          .map((row: any) => Number(row.score || 0))
          .filter((score: number) => Number.isFinite(score)) || [];

      const avgScore =
        quizScores.length > 0
          ? Math.round(quizScores.reduce((sum: number, s: number) => sum + s, 0) / quizScores.length)
          : 0;

      const courseEnrollments = (enrollments || []).filter((e) => e.course_id === activeCourseId);
      const courseAvgProgress =
        courseEnrollments.length > 0
          ? courseEnrollments.reduce((sum, e) => sum + Number(e.progress_percentage || 0), 0) /
            courseEnrollments.length
          : 0;
      const activeLearnerSet = new Set(
        courseEnrollments
          .filter((e) => {
            const updated = new Date(
              e.last_activity_at || e.updated_at || e.enrollment_date || 0
            );
            return updated >= start;
          })
          .map((e) => e.user_id)
      );

      const quizAttempts = courseQuizScores || [];
      const passedCount = quizAttempts.filter((row: any) => row.is_passed).length;
      const quizPassRate =
        quizAttempts.length > 0 ? (passedCount / quizAttempts.length) * 100 : 0;

      const { count: pendingSubmissionsCount } = await supabase
        .from("assignment_submissions")
        .select("id, assignments!inner(course_id)", { count: "exact", head: true })
        .eq("submission_status", "submitted")
        .eq("assignments.course_id", activeCourseId);

      const { count: gradedSubmissionsCount } = await supabase
        .from("assignment_submissions")
        .select("id, assignments!inner(course_id)", { count: "exact", head: true })
        .eq("submission_status", "graded")
        .eq("assignments.course_id", activeCourseId);

      const totalWatchMinutes = courseEnrollments.reduce(
        (sum, e) => sum + Number(e.total_watch_time_minutes || 0),
        0
      );
      const averageWatchHours =
        courseEnrollments.length > 0 ? totalWatchMinutes / 60 / courseEnrollments.length : 0;

      module_performance = (sections || []).map((section: any, index: number) => ({
        module: section.title || `Module ${index + 1}`,
        completion: toPercent(courseAvgProgress),
        avgScore: avgScore,
      }));

      const weeklyBuckets = Array.from({ length: 4 }).map((_, index) => ({
        week: `Week ${index + 1}`,
        hours: 0,
      }));

      const fourWeeksAgo = new Date(now.getTime() - 28 * dayMs);
      const recentEnrollments = courseEnrollments.filter((e) => {
        const updated = new Date(e.updated_at || e.enrollment_date || 0);
        return updated >= fourWeeksAgo;
      });

      const totalRecentMinutes = recentEnrollments.reduce(
        (sum, e) => sum + Number(e.total_watch_time_minutes || 0),
        0
      );
      const perWeekHours = totalRecentMinutes / 60 / 4;

      weekly_study_time = weeklyBuckets.map((bucket) => ({
        ...bucket,
        hours: Math.round(perWeekHours),
      }));

      cohort_metrics = {
        enrolled: courseEnrollments.length,
        active_learners: activeLearnerSet.size,
        average_progress: toPercent(courseAvgProgress),
        completion_rate: toPercent(
          courseEnrollments.length > 0
            ? (courseEnrollments.filter((e) => e.is_completed).length / courseEnrollments.length) * 100
            : 0
        ),
        average_quiz_score: avgScore,
        quiz_pass_rate: toPercent(quizPassRate),
        submissions_pending: Number(pendingSubmissionsCount || 0),
        submissions_graded: Number(gradedSubmissionsCount || 0),
        average_watch_hours: Math.round(averageWatchHours * 10) / 10,
      };
    }

    const responseData = {
      summary: {
        total_enrolled: totalStudents,
        average_engagement: toPercent(avgProgress),
        study_hours: Math.round(totalWatchMinutes / 60),
        goal_completion: toPercent(completionRate),
        average_rating: Number(averageRating.toFixed(2)),
      },
      courses: coursePerformance,
      enrollment_trend,
      enrollment_monthly,
      completion_breakdown,
      activity_by_day: activityByDay,
      category_performance,
      course_performance,
      cohort_analytics,
      course_details: {
        module_performance,
        weekly_study_time,
        cohort_metrics,
      },
    };

    return new Response(JSON.stringify({ success: true, data: responseData }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("getInstructorAnalytics error", err);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Failed to fetch analytics",
        error: err.message || "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
