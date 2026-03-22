import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
};

const dayMs = 24 * 60 * 60 * 1000;

const toPercent = (value: number) => Math.round(Number.isFinite(value) ? value : 0);
const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const LOW_COMPLETION_THRESHOLD = Number(
  Deno.env.get("INSTRUCTOR_LOW_COMPLETION_THRESHOLD") ?? "60"
);
const LOW_ENGAGEMENT_THRESHOLD = Number(
  Deno.env.get("INSTRUCTOR_LOW_ENGAGEMENT_THRESHOLD") ?? "40"
);
const LOW_RATING_THRESHOLD = Number(Deno.env.get("INSTRUCTOR_LOW_RATING_THRESHOLD") ?? "3.8");
const MIN_RATING_SAMPLE = Number(Deno.env.get("INSTRUCTOR_MIN_RATING_SAMPLE") ?? "10");
const NEGATIVE_TREND_DELTA = Number(Deno.env.get("INSTRUCTOR_NEGATIVE_TREND_DELTA") ?? "15");
const MODULE_DROPOFF_THRESHOLD = Number(
  Deno.env.get("INSTRUCTOR_MODULE_DROPOFF_THRESHOLD") ?? "20"
);
const RATING_TREND_DELTA = Number(Deno.env.get("INSTRUCTOR_RATING_TREND_DELTA") ?? "0.3");
const RATING_TREND_MIN_SAMPLE = Number(
  Deno.env.get("INSTRUCTOR_RATING_TREND_MIN_SAMPLE") ?? "3"
);

type InstructorInsight = {
  id: string;
  severity: "high" | "medium" | "low";
  type:
    | "low_completion"
    | "low_engagement"
    | "low_rating"
    | "negative_trend"
    | "high_drop_off"
    | "rating_decline";
  target: { course_id?: string; module_id?: string; name: string };
  message: string;
  recommended_action: string;
  supporting_metrics: Record<string, unknown>;
  created_at: string;
};

const formatDayLabel = (date: Date) =>
  date.toLocaleDateString("en-US", { weekday: "short" });

const formatMonthLabel = (date: Date) =>
  date.toLocaleDateString("en-US", { month: "short" });
const formatMonthYearLabel = (date: Date) =>
  date.toLocaleDateString("en-US", { month: "short", year: "numeric" });

const severityRank: Record<InstructorInsight["severity"], number> = {
  high: 3,
  medium: 2,
  low: 1,
};

const insightMagnitude = (insight: InstructorInsight) => {
  const metrics = insight.supporting_metrics || {};
  if (insight.type === "high_drop_off") {
    return Number(metrics.dropoff_percent || 0);
  }
  if (insight.type === "low_completion") {
    return Number(metrics.threshold_percent || 0) - Number(metrics.module_completion_percent || metrics.completion_percent || 0);
  }
  if (insight.type === "low_engagement") {
    return Number(metrics.threshold_percent || 0) - Number(metrics.module_engagement_percent || metrics.engagement_percent || 0);
  }
  if (insight.type === "rating_decline") {
    return Math.abs(Number(metrics.rating_delta || 0));
  }
  if (insight.type === "low_rating") {
    return Number(metrics.threshold || 0) - Number(metrics.rating || 0);
  }
  if (insight.type === "negative_trend") {
    return Math.abs(Number(metrics.trend_delta || 0));
  }
  return 0;
};

const insightPriorityComparator = (a: InstructorInsight, b: InstructorInsight) => {
  const severityDiff = severityRank[b.severity] - severityRank[a.severity];
  if (severityDiff !== 0) return severityDiff;
  const magnitudeDiff = insightMagnitude(b) - insightMagnitude(a);
  if (magnitudeDiff !== 0) return magnitudeDiff;
  const timeDiff =
    new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  if (timeDiff !== 0) return timeDiff;
  return String(a.id).localeCompare(String(b.id));
};

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
    const scopedCourses = (courses || []).filter((course) =>
      courseIdFilter.includes(course.id)
    );

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
            .select("course_id,rating,created_at")
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
    const now = new Date();
    const start = new Date(now.getTime() - days * dayMs);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(monthStart.getTime() - 1);
    const activeWindowEnrollments = (enrollments || []).filter((e) => {
      const updated = new Date(
        e.last_activity_at || e.updated_at || e.enrollment_date || 0
      );
      return updated >= start;
    });
    const avgProgress =
      activeWindowEnrollments.length > 0
        ? activeWindowEnrollments.reduce(
            (sum, e) => sum + Number(e.progress_percentage || 0),
            0
          ) / activeWindowEnrollments.length
        : 0;
    const completedCount = (enrollments || []).filter((e) => e.is_completed).length;
    const completionRate = enrollments.length > 0 ? (completedCount / enrollments.length) * 100 : 0;
    const ratingValues = (ratings || []).map((r) => Number(r.rating || 0));
    const averageRating =
      ratingValues.length > 0
        ? ratingValues.reduce((sum, r) => sum + r, 0) / ratingValues.length
        : 0;

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

    const totalWatchMinutes = (enrollments || []).reduce(
      (sum, e) => sum + Number(e.total_watch_time_minutes || 0),
      0
    );
    const totalWatchMinutesWindow = activeWindowEnrollments.reduce(
      (sum, e) => sum + Number(e.total_watch_time_minutes || 0),
      0
    );

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
    for (const enrollment of activeWindowEnrollments) {
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

    const ratingSampleCountByCourse = new Map<string, number>();
    for (const rating of ratings || []) {
      const key = String(rating.course_id || "");
      if (!key) continue;
      ratingSampleCountByCourse.set(key, (ratingSampleCountByCourse.get(key) || 0) + 1);
    }

    const courseTrendDeltaById = new Map<string, number>();
    const courseRatingTrendById = new Map<
      string,
      { prevAvg: number; recentAvg: number; delta: number; prevCount: number; recentCount: number }
    >();

    const coursePerformance = scopedCourses.map((course) => {
      const courseEnrollments = (enrollments || []).filter((e) => e.course_id === course.id);
      const courseWindowEnrollments = courseEnrollments.filter((e) => {
        const updated = new Date(
          e.last_activity_at || e.updated_at || e.enrollment_date || 0
        );
        return updated >= start;
      });
      const courseRatingValues = (ratings || [])
        .filter((r) => r.course_id === course.id)
        .map((r) => Number(r.rating || 0));
      const avgCourseRating =
        courseRatingValues.length > 0
          ? courseRatingValues.reduce((sum, r) => sum + r, 0) / courseRatingValues.length
          : Number(course.rating || 0);
      const courseAvgProgress =
        courseWindowEnrollments.length > 0
          ? courseWindowEnrollments.reduce(
              (sum, e) => sum + Number(e.progress_percentage || 0),
              0
            ) / courseWindowEnrollments.length
          : 0;
      const courseCompletionRate =
        courseWindowEnrollments.length > 0
          ? (courseWindowEnrollments.filter((e) => e.is_completed).length /
              courseWindowEnrollments.length) *
            100
          : 0;

      const midpoint = new Date(now.getTime() - (days / 2) * dayMs);
      const prevWindow = courseWindowEnrollments.filter((e) => {
        const updated = new Date(
          e.last_activity_at || e.updated_at || e.enrollment_date || 0
        );
        return updated >= start && updated < midpoint;
      });
      const recentWindow = courseWindowEnrollments.filter((e) => {
        const updated = new Date(
          e.last_activity_at || e.updated_at || e.enrollment_date || 0
        );
        return updated >= midpoint;
      });
      const prevAvg =
        prevWindow.length > 0
          ? prevWindow.reduce((sum, e) => sum + Number(e.progress_percentage || 0), 0) /
            prevWindow.length
          : 0;
      const recentAvg =
        recentWindow.length > 0
          ? recentWindow.reduce((sum, e) => sum + Number(e.progress_percentage || 0), 0) /
            recentWindow.length
          : 0;
      courseTrendDeltaById.set(String(course.id), Number((recentAvg - prevAvg).toFixed(2)));

      const courseRatings = (ratings || [])
        .filter((r) => r.course_id === course.id)
        .map((r: any) => ({
          rating: Number(r.rating || 0),
          created_at: r.created_at ? new Date(r.created_at) : null,
        }))
        .filter((r) => Number.isFinite(r.rating) && r.created_at instanceof Date && !Number.isNaN(r.created_at.getTime()));
      const prevRatingWindow = courseRatings.filter(
        (r) => r.created_at! >= start && r.created_at! < midpoint
      );
      const recentRatingWindow = courseRatings.filter((r) => r.created_at! >= midpoint);
      const prevRatingAvg =
        prevRatingWindow.length > 0
          ? prevRatingWindow.reduce((sum, r) => sum + r.rating, 0) / prevRatingWindow.length
          : 0;
      const recentRatingAvg =
        recentRatingWindow.length > 0
          ? recentRatingWindow.reduce((sum, r) => sum + r.rating, 0) / recentRatingWindow.length
          : 0;
      courseRatingTrendById.set(String(course.id), {
        prevAvg: Number(prevRatingAvg.toFixed(2)),
        recentAvg: Number(recentRatingAvg.toFixed(2)),
        delta: Number((recentRatingAvg - prevRatingAvg).toFixed(2)),
        prevCount: prevRatingWindow.length,
        recentCount: recentRatingWindow.length,
      });

      return {
        id: course.id,
        name: course.title,
        students: courseEnrollments.length,
        rating: Number(avgCourseRating.toFixed(2)),
        completion: toPercent(courseCompletionRate),
        engagement: toPercent(courseAvgProgress),
      };
    });

    const cohortCourseIds = scopedCourses.map((course) => course.id).filter(Boolean);
    const quizStatsByCourse = new Map<
      string,
      { total: number; pass: number; scoreSum: number }
    >();

    if (cohortCourseIds.length > 0) {
      const { data: quizAttempts } = await supabase
        .from("quiz_attempts")
        .select("score,is_passed,completed_at,course_quizzes!inner(course_id)")
        .in("course_quizzes.course_id", cohortCourseIds);

      (quizAttempts || []).forEach((attempt: any) => {
        const courseId = attempt?.course_quizzes?.course_id;
        if (!courseId) return;
        const completedAt = attempt?.completed_at
          ? new Date(attempt.completed_at)
          : null;
        if (completedAt && completedAt < start) return;
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

    const cohort_analytics = scopedCourses.map((course) => {
      const courseEnrollments = (enrollments || []).filter((e) => e.course_id === course.id);
      const courseWindowEnrollments = courseEnrollments.filter((e) => {
        const updated = new Date(
          e.last_activity_at || e.updated_at || e.enrollment_date || 0
        );
        return updated >= start;
      });
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
        courseWindowEnrollments.length > 0
          ? courseWindowEnrollments.reduce(
              (sum, e) => sum + Number(e.progress_percentage || 0),
              0
            ) / courseWindowEnrollments.length
          : 0;
      const completionRate =
        courseWindowEnrollments.length > 0
          ? (courseWindowEnrollments.filter((e) => e.is_completed).length /
              courseWindowEnrollments.length) *
            100
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
    let moduleInsightContext: Array<{
      moduleId: string;
      moduleName: string;
      completion: number;
      engagement: number;
    }> = [];
    let weekly_study_time: Array<{ week: string; hours: number }> = [];
    let insights: InstructorInsight[] = [];
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
        .select(
          "user_id,quiz_id,score,is_passed,attempt_number,completed_at,grades_released,course_quizzes!inner(course_id,section_id)"
        )
        .eq("course_quizzes.course_id", activeCourseId)
        .gte("completed_at", start.toISOString());

      const sectionIds = (sections || []).map((s: any) => String(s.id));
      const { data: moduleProgressRows } =
        sectionIds.length > 0
          ? await supabase
              .from("user_module_progress")
              .select("section_id,user_id,is_completed,completed_at")
              .eq("course_id", activeCourseId)
              .in("section_id", sectionIds)
          : { data: [] };

      const scopedQuizAttempts = (courseQuizScores || []).filter(
        (row: any) => String(row?.course_quizzes?.course_id || "") === String(activeCourseId)
      );

      const quizScores =
        scopedQuizAttempts
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

      const quizAttempts = scopedQuizAttempts;
      const passedCount = quizAttempts.filter((row: any) => row.is_passed).length;
      const quizPassRate =
        quizAttempts.length > 0 ? (passedCount / quizAttempts.length) * 100 : 0;
      const pendingSubmissionsCount = quizAttempts.filter(
        (row: any) => row.grades_released === false
      ).length;
      const gradedSubmissionsCount = quizAttempts.filter(
        (row: any) => row.grades_released === true
      ).length;

      const totalWatchMinutes = courseEnrollments.reduce(
        (sum, e) => sum + Number(e.total_watch_time_minutes || 0),
        0
      );
      const averageWatchHours =
        courseEnrollments.length > 0 ? totalWatchMinutes / 60 / courseEnrollments.length : 0;

      const enrolledUsers = new Set(courseEnrollments.map((e) => String(e.user_id)));
      const enrolledCountForModule = Math.max(1, enrolledUsers.size);
      const moduleProgressBySection = new Map<
        string,
        Array<{ user_id: string; is_completed: boolean }>
      >();
      for (const row of moduleProgressRows || []) {
        const sectionId = String((row as any).section_id || "");
        if (!sectionId) continue;
        if (!moduleProgressBySection.has(sectionId)) moduleProgressBySection.set(sectionId, []);
        moduleProgressBySection.get(sectionId)!.push({
          user_id: String((row as any).user_id || ""),
          is_completed: Boolean((row as any).is_completed),
        });
      }

      const latestAttemptByUserQuiz = new Map<string, any>();
      for (const attempt of courseQuizScores || []) {
        const userId = String((attempt as any).user_id || "");
        const quizId = String((attempt as any).quiz_id || "");
        if (!userId || !quizId) continue;
        const key = `${userId}:${quizId}`;
        const prev = latestAttemptByUserQuiz.get(key);
        const nextAttemptNum = Number((attempt as any).attempt_number || 0);
        const prevAttemptNum = Number((prev as any)?.attempt_number || 0);
        const nextTime = new Date((attempt as any).completed_at || 0).getTime();
        const prevTime = new Date((prev as any)?.completed_at || 0).getTime();
        if (!prev || nextAttemptNum > prevAttemptNum || nextTime > prevTime) {
          latestAttemptByUserQuiz.set(key, attempt);
        }
      }

      const sectionQuizScores = new Map<string, number[]>();
      for (const attempt of latestAttemptByUserQuiz.values()) {
        const sectionId = String((attempt as any)?.course_quizzes?.section_id || "");
        if (!sectionId) continue;
        if (!sectionQuizScores.has(sectionId)) sectionQuizScores.set(sectionId, []);
        const score = Number((attempt as any).score || 0);
        if (Number.isFinite(score)) sectionQuizScores.get(sectionId)!.push(score);
      }

      module_performance = (sections || []).map((section: any, index: number) => {
        const sectionId = String(section.id);
        const rows = moduleProgressBySection.get(sectionId) || [];
        const engagedUsers = new Set(rows.filter((r) => r.user_id).map((r) => r.user_id));
        const completedUsers = new Set(
          rows.filter((r) => r.is_completed && r.user_id).map((r) => r.user_id)
        );
        const completionPct = (completedUsers.size / enrolledCountForModule) * 100;
        const engagementPct = (engagedUsers.size / enrolledCountForModule) * 100;
        const scores = sectionQuizScores.get(sectionId) || [];
        const avgSectionScore =
          scores.length > 0
            ? scores.reduce((sum, value) => sum + value, 0) / scores.length
            : avgScore;
        moduleInsightContext.push({
          moduleId: sectionId,
          moduleName: section.title || `Module ${index + 1}`,
          completion: toPercent(completionPct),
          engagement: toPercent(engagementPct),
        });
        return {
          module: section.title || `Module ${index + 1}`,
          completion: toPercent(completionPct),
          avgScore: toPercent(avgSectionScore),
        };
      });

      const weeklyBucketCount = Math.max(1, Math.ceil(days / 7));
      const weeklyBuckets = Array.from({ length: weeklyBucketCount }).map((_, index) => ({
        week: `Week ${index + 1}`,
        hours: 0,
      }));
      for (const enrollment of courseEnrollments) {
        const lastActivity = new Date(
          enrollment.last_activity_at || enrollment.updated_at || enrollment.enrollment_date || 0
        );
        if (Number.isNaN(lastActivity.getTime()) || lastActivity < start || lastActivity > now) {
          continue;
        }
        const weekIndex = clamp(
          Math.floor((lastActivity.getTime() - start.getTime()) / (7 * dayMs)),
          0,
          weeklyBucketCount - 1
        );
        weeklyBuckets[weekIndex].hours += Number(enrollment.total_watch_time_minutes || 0) / 60;
      }
      weekly_study_time = weeklyBuckets.map((bucket) => ({
        ...bucket,
        hours: Math.round(bucket.hours * 10) / 10,
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

    const nowIso = new Date().toISOString();
    for (const course of coursePerformance) {
      if (course.completion < LOW_COMPLETION_THRESHOLD) {
        const gap = Number((LOW_COMPLETION_THRESHOLD - course.completion).toFixed(1));
        insights.push({
          id: `low_completion_${course.id}`,
          severity: gap >= 15 ? "high" : "medium",
          type: "low_completion",
          target: { course_id: course.id, name: course.name },
          message: `${course.name} completion is ${course.completion}% (below ${LOW_COMPLETION_THRESHOLD}%).`,
          recommended_action:
            "Audit module difficulty and add checkpoints or reminders in weaker modules.",
          supporting_metrics: {
            completion_percent: course.completion,
            threshold_percent: LOW_COMPLETION_THRESHOLD,
          },
          created_at: nowIso,
        });
      }

      if (course.engagement < LOW_ENGAGEMENT_THRESHOLD) {
        const gap = Number((LOW_ENGAGEMENT_THRESHOLD - course.engagement).toFixed(1));
        insights.push({
          id: `low_engagement_${course.id}`,
          severity: gap >= 15 ? "high" : "medium",
          type: "low_engagement",
          target: { course_id: course.id, name: course.name },
          message: `${course.name} engagement is ${course.engagement}% (below ${LOW_ENGAGEMENT_THRESHOLD}%).`,
          recommended_action:
            "Refresh early modules, reduce long content blocks, and add more interactive checks.",
          supporting_metrics: {
            engagement_percent: course.engagement,
            threshold_percent: LOW_ENGAGEMENT_THRESHOLD,
          },
          created_at: nowIso,
        });
      }

      const ratingSample = ratingSampleCountByCourse.get(String(course.id)) || 0;
      if (ratingSample >= MIN_RATING_SAMPLE && course.rating < LOW_RATING_THRESHOLD) {
        insights.push({
          id: `low_rating_${course.id}`,
          severity: "medium",
          type: "low_rating",
          target: { course_id: course.id, name: course.name },
          message: `${course.name} rating is ${course.rating.toFixed(2)} from ${ratingSample} reviews.`,
          recommended_action:
            "Review low-rated modules and update pacing, clarity, and examples based on feedback.",
          supporting_metrics: {
            rating: Number(course.rating.toFixed(2)),
            threshold: LOW_RATING_THRESHOLD,
            rating_sample_count: ratingSample,
            min_rating_sample: MIN_RATING_SAMPLE,
          },
          created_at: nowIso,
        });
      }

      const trendDelta = courseTrendDeltaById.get(String(course.id)) || 0;
      if (trendDelta <= -Math.abs(NEGATIVE_TREND_DELTA)) {
        insights.push({
          id: `negative_trend_${course.id}`,
          severity: "high",
          type: "negative_trend",
          target: { course_id: course.id, name: course.name },
          message: `${course.name} engagement trend dropped by ${Math.abs(trendDelta).toFixed(1)} points.`,
          recommended_action:
            "Check recent content changes and add intervention messages for at-risk learners.",
          supporting_metrics: {
            trend_delta: Number(trendDelta.toFixed(2)),
            threshold_delta: -Math.abs(NEGATIVE_TREND_DELTA),
            window_days: days,
          },
          created_at: nowIso,
        });
      }

      const ratingTrend = courseRatingTrendById.get(String(course.id));
      if (
        ratingTrend &&
        ratingTrend.prevCount >= RATING_TREND_MIN_SAMPLE &&
        ratingTrend.recentCount >= RATING_TREND_MIN_SAMPLE &&
        ratingTrend.delta <= -Math.abs(RATING_TREND_DELTA)
      ) {
        insights.push({
          id: `rating_decline_${course.id}`,
          severity: Math.abs(ratingTrend.delta) >= Math.abs(RATING_TREND_DELTA) * 2 ? "high" : "medium",
          type: "rating_decline",
          target: { course_id: course.id, name: course.name },
          message: `${course.name} rating trend declined from ${ratingTrend.prevAvg.toFixed(2)} to ${ratingTrend.recentAvg.toFixed(2)}.`,
          recommended_action:
            "Review recent low-rated feedback and improve module pacing, clarity, or examples in updated sections.",
          supporting_metrics: {
            previous_period_rating: ratingTrend.prevAvg,
            recent_period_rating: ratingTrend.recentAvg,
            rating_delta: ratingTrend.delta,
            threshold_delta: -Math.abs(RATING_TREND_DELTA),
            previous_period_count: ratingTrend.prevCount,
            recent_period_count: ratingTrend.recentCount,
            min_sample_per_period: RATING_TREND_MIN_SAMPLE,
            window_days: days,
          },
          created_at: nowIso,
        });
      }
    }

    if (courseIdFilter.length === 1) {
      const activeCourse = scopedCourses.find((course) => String(course.id) === String(courseIdFilter[0]));
      for (let index = 0; index < moduleInsightContext.length; index += 1) {
        const module = moduleInsightContext[index];
        if (module.completion < LOW_COMPLETION_THRESHOLD) {
          const severity: InstructorInsight["severity"] =
            module.completion < LOW_COMPLETION_THRESHOLD - 15 ? "high" : "medium";
          insights.push({
            id: `module_low_completion_${index + 1}`,
            severity,
            type: "low_completion",
            target: {
              course_id: activeCourse?.id,
              module_id: module.moduleId,
              name: `${activeCourse?.title || "Course"} • ${module.moduleName}`,
            },
            message: `${module.moduleName} completion is ${module.completion}% (below ${LOW_COMPLETION_THRESHOLD}%).`,
            recommended_action:
              "Shorten this module or split into smaller lessons with clearer outcomes.",
            supporting_metrics: {
              module_completion_percent: module.completion,
              threshold_percent: LOW_COMPLETION_THRESHOLD,
            },
            created_at: nowIso,
          });
        }

        if (module.engagement < LOW_ENGAGEMENT_THRESHOLD) {
          const severity: InstructorInsight["severity"] =
            module.engagement < LOW_ENGAGEMENT_THRESHOLD - 15 ? "high" : "medium";
          insights.push({
            id: `module_low_engagement_${index + 1}`,
            severity,
            type: "low_engagement",
            target: {
              course_id: activeCourse?.id,
              module_id: module.moduleId,
              name: `${activeCourse?.title || "Course"} • ${module.moduleName}`,
            },
            message: `${module.moduleName} engagement is ${module.engagement}% (below ${LOW_ENGAGEMENT_THRESHOLD}%).`,
            recommended_action:
              "Add a stronger intro hook, shorter lesson chunks, and an early checkpoint activity.",
            supporting_metrics: {
              module_engagement_percent: module.engagement,
              threshold_percent: LOW_ENGAGEMENT_THRESHOLD,
            },
            created_at: nowIso,
          });
        }

        if (index > 0) {
          const previousModule = moduleInsightContext[index - 1];
          const completionDrop = Number((previousModule.completion - module.completion).toFixed(1));
          if (completionDrop >= MODULE_DROPOFF_THRESHOLD) {
            const severity: InstructorInsight["severity"] =
              completionDrop >= MODULE_DROPOFF_THRESHOLD + 15 ? "high" : "medium";
            insights.push({
              id: `module_dropoff_${index + 1}`,
              severity,
              type: "high_drop_off",
              target: {
                course_id: activeCourse?.id,
                module_id: module.moduleId,
                name: `${activeCourse?.title || "Course"} • ${module.moduleName}`,
              },
              message: `Completion drops by ${completionDrop}% from ${previousModule.moduleName} to ${module.moduleName}.`,
              recommended_action:
                "Investigate transition friction between these modules and add bridging recap or prerequisite checkpoints.",
              supporting_metrics: {
                previous_module: previousModule.moduleName,
                previous_completion_percent: previousModule.completion,
                current_module: module.moduleName,
                current_completion_percent: module.completion,
                dropoff_percent: completionDrop,
                threshold_percent: MODULE_DROPOFF_THRESHOLD,
              },
              created_at: nowIso,
            });
          }
        }
      }
    }

    const dedupedByKey = new Map<string, InstructorInsight>();
    for (const insight of insights) {
      const target = insight.target || { course_id: "", module_id: "", name: "" };
      const signature = `${insight.type}:${target.course_id || ""}:${target.module_id || ""}`;
      const existing = dedupedByKey.get(signature);
      if (!existing || insightPriorityComparator(insight, existing) < 0) {
        dedupedByKey.set(signature, insight);
      }
    }

    const perCourseCap = 4;
    const byCourse = new Map<string, InstructorInsight[]>();
    for (const insight of dedupedByKey.values()) {
      const courseKey = String(insight.target?.course_id || "__global__");
      if (!byCourse.has(courseKey)) byCourse.set(courseKey, []);
      byCourse.get(courseKey)!.push(insight);
    }

    const prioritized: InstructorInsight[] = [];
    for (const courseInsights of byCourse.values()) {
      courseInsights.sort(insightPriorityComparator);
      prioritized.push(...courseInsights.slice(0, perCourseCap));
    }

    insights = prioritized.sort(insightPriorityComparator).slice(0, 12);

    const responseData = {
      summary: {
        total_enrolled: totalStudents,
        average_engagement: toPercent(avgProgress),
        study_hours: Math.round(totalWatchMinutesWindow / 60),
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
      insights,
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
