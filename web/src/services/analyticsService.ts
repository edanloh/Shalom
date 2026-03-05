import apiService from "./apiService";

export type InstructorAnalytics = {
  summary: {
    total_enrolled: number;
    average_engagement: number;
    study_hours: number;
    goal_completion: number;
    average_rating: number;
  };
  courses: Array<{
    id: string;
    name: string;
    students: number;
    rating: number;
    completion: number;
    engagement: number;
  }>;
  enrollment_trend: Array<{ month: string; students: number }>;
  enrollment_monthly: {
    current: { label: string; students: number };
    previous: { label: string; students: number };
  };
  completion_breakdown: Array<{ name: string; value: number }>;
  activity_by_day: Array<{ day: string; active: number; inactive: number }>;
  category_performance: Array<{ category: string; value: number }>;
  course_performance: Array<{ course: string; engagement: number; completion: number }>;
  cohort_analytics: Array<{
    course_id: string;
    course_name: string;
    enrolled: number;
    active_learners: number;
    average_progress: number;
    completion_rate: number;
    average_quiz_score: number;
    quiz_pass_rate: number;
  }>;
  course_details: {
    module_performance: Array<{ module: string; completion: number; avgScore: number }>;
    weekly_study_time: Array<{ week: string; hours: number }>;
    cohort_metrics: {
      enrolled: number;
      active_learners: number;
      average_progress: number;
      completion_rate: number;
      average_quiz_score: number;
      quiz_pass_rate: number;
      submissions_pending: number;
      submissions_graded: number;
      average_watch_hours: number;
    } | null;
  };
  insights: Array<{
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
  }>;
};

const ENDPOINTS = {
  INSTRUCTOR_ANALYTICS: (adminId: string) => `/getInstructorAnalytics/${adminId}`,
} as const;

export const analyticsService = {
  async getInstructorAnalytics(
    adminId: string,
    params?: { days?: number; courseId?: string }
  ): Promise<InstructorAnalytics> {
    const response = await apiService.get<any>(ENDPOINTS.INSTRUCTOR_ANALYTICS(adminId), {
      days: params?.days ? String(params.days) : undefined,
      courseId: params?.courseId ?? undefined,
    });
    const payload = response?.data ?? response;
    if (!payload) {
      throw new Error("Failed to load analytics");
    }
    return payload as InstructorAnalytics;
  },
};

export default analyticsService;
