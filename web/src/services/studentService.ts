import apiService from "./apiService";

export interface StudentProfile {
  id: string;
  name: string;
  email: string;
  enabled: boolean;
  enrolledDate: string;
  progress: number;
  lastActivity: string;
  lastActivityAt?: string | null;
  engagement: number;
  coursesEnrolled: number;
  completedCourses: number;
  totalHours: number;
  currentCourses: Array<{ id: string; name: string; progress: number; grade: number }>;
  completedCoursesData: Array<{ id: string; name: string; completedDate: string; grade: number; certificate: boolean }>;
  quizResults: Array<{ quiz: string; score: number; date: string; course?: string | null }>;
  streak: number;
  badges: number;
  averageScore: number;
  strengths?: string[];
  risks?: string[];
}

const ENDPOINTS = {
  STUDENT_PROFILE: (userId: string) => `/getStudentProfile/${userId}`,
};

export const studentService = {
  async getStudentProfile(userId: string): Promise<StudentProfile> {
    const resp = await apiService.get<any>(ENDPOINTS.STUDENT_PROFILE(userId));
    const payload = resp?.data ?? resp;
    if (!payload || resp?.success === false) {
      throw new Error("Failed to load student profile");
    }
    return payload as StudentProfile;
  },
};

export default studentService;
