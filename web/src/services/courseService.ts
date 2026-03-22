/**
 * Course Service - Handles all course-related API calls for web/instructor view
 * Matches mobile implementation with instructor-specific features
 */

import { Colors } from '@/constants/Colors';
import apiService from './apiService';
import { DEFAULT_COURSE_THUMBNAIL } from '@/constants/images';

// Course service endpoints matching Lambda functions
const ENDPOINTS = {
  COURSES: '/getAllCourse',
  COURSE_BY_ID_INSTRUCTOR: (adminId: string, courseId: string) => `/getModuleDetailInstructor/${adminId}/${courseId}`,
  INSTRUCTOR_REVIEWS: (instructorId: string) => `/getInstructorReviews/${instructorId}`,
  COURSE_STUDENTS: (courseId: string) => `/getCourseStudents/${courseId}`,
  AVAILABLE_STUDENTS: (courseId: string) => `/getAvailableStudents/${courseId}`,
  ALL_STUDENTS: '/getAllStudents',
  // COURSE_REVIEWS: (courseId: string) => `/courses/${courseId}/reviews`,
  // USER_ENROLLMENTS: (uid: string) => `/courses/enrollment/${encodeURIComponent(uid)}`,
  // CREATE_COURSE: '/courses',
  UPDATE_COURSE: (courseId: string) => `/updateCourse/${courseId}`,
  // DELETE_COURSE: (courseId: string) => `/courses/${courseId}`,
  ENROLL_STUDENT: (userId: string) => `/postUserEnrollment/${userId}`,
  INSTRUCTOR_STATS: (adminId: string) => `/getInstructorStats/${adminId}`,
  COURSE_DUPLICATE: (courseId: string) => `/courseDuplicateHandler/${encodeURIComponent(courseId)}`,
  RECOMMENDATIONS: '/recommendations',
  RECOMMENDATION_EVENT: '/recommendations/events',
  INSTRUCTOR_REVIEW_ACTION: '/postInstructorReviewAction',
};

export interface CourseListParams {
  limit?: number;
  category?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  instructorId?: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  category: string;
  categoryColor: string;
  status: 'published' | 'draft';
  instructor: string;
  instructorId?: string;
  enrolledCount: number;
  completionRate: number;
  rating: number;
  totalRatings: number;
  duration: string;
  modules: number;
  lessons: number;
  quizzes: number;
  createdDate: string;
  lastUpdated: string;
  tags?: string[];
  outcomes?: string[];
  recommendationPrimaryTag?: string;
  recommendationModelVersion?: string;
  recommendationRequestId?: string;
  recommendationScore?: number;
}

export interface Module {
  id: number;
  title: string;
  lessons: number;
  quizzes: number;
  duration: string;
  isCompleted: boolean;
  completedAt: string | null;
  items: ModuleItem[];
}

export interface ModuleItem {
  id: number;
  type: 'lesson' | 'quiz';
  title: string;
  duration?: string;
  questions?: number;
}

export interface ModuleDetail {
  id: number;
  title: string;
  description: string;
  order_index: number;
  lessons: Lesson[];
  quizzes: Quiz[];
}

export interface Lesson {
  id: number;
  title: string;
  content: string;
  video_url?: string;
  thumbnail_url?: string;
  duration: string;
  duration_seconds?: number;
  is_preview?: boolean;
  order_index: number;
}

export interface Review {
  id: string | number;
  studentName: string;
  rating: number;
  date: string;
  comment: string;
  reviewStatus?: "visible" | "hidden" | "flagged" | "resolved";
  contextSectionId?: string | null;
  contextSectionTitle?: string | null;
  flagReason?: string | null;
  moderationNote?: string | null;
  moderatedBy?: string | null;
  moderatedAt?: string | null;
  instructorReply?: string | null;
  instructorRepliedAt?: string | null;
  acknowledgedAt?: string | null;
  isPinned?: boolean;
  pinnedAt?: string | null;
  pinnedBy?: string | null;
}

export interface Student {
  id: number;
  name: string;
  email?: string;
  progress?: number;
  lastActive?: string;
}

export interface EnrollmentCourse {
  enrollment_id: string;
  enrollment_date: string;
  completion_date: string | null;
  progress_percentage: string;
  is_completed: boolean;
  is_in_wishlist: boolean;
  last_accessed: string;
  total_watch_time_minutes: number;
  course_id: string;
  title: string;
  description: string;
  duration_hours: number;
  thumbnail_url: string;
  rating: string;
  student_count: number;
  tags: string[];
  category_name: string;
  category_icon: string;
  category_color: string;
  instructor_name: string;
  instructor_avatar: string;
  instructor_rating: string;
  total_videos: string;
  completed_videos: string;
  video_watch_time_seconds: string;
  total_quizzes: string;
  passed_quizzes: string;
  video_progress_percent: number;
  quiz_progress_percent: number;
  estimated_time_remaining_minutes: number;
  last_accessed_formatted: string;
  enrollment_date_formatted: string;
  completion_date_formatted: string | null;
}

export interface CourseDetailResponse {
  course: Course;
  modules: any[];
  enrolledStudents: Student[];
  availableStudents: Array<{
    id: string;
    name: string;
    email: string;
    totalEnrollments?: number;
    averageProgress?: number;
  }>;
}

export interface InstructorReviewsResponse {
  reviews: Review[];
  summary: {
    total_reviews: number;
    average_rating: number;
    courses_covered: number;
  };
  pagination: {
    limit: number;
    offset: number;
    total: number;
    has_more: boolean;
  };
}

// CourseBuilder-specific interfaces
export interface CourseBuilderLesson {
  id: string;
  title: string;
  baseTitle: string;
  type: 'video' | 'pdf';
  status: 'published' | 'draft';
  content: string;
  videoUrl: string;
  resourceUrl: string;
  fileSize?: number;
  isDownloadable: boolean;
  thumbnailUrl: string;
  durationSeconds: number;
  isPreview: boolean;
  order: number;
}

export interface CourseBuilderQuiz {
  id: string;
  title: string;
  baseTitle: string;
  status: 'published' | 'draft';
  passingScore: number;
  questions: QuizQuestion[];
  order: number;
}

export interface CourseBuilderQuizQuestion {
  id: string;
  text: string;
  type: 'multiple-choice' | 'true-false' | 'multiple-correct';
  options: string[];
  correctAnswer: number | number[] | null;
  imageUrl?: string | null;
  points: number;
  sampleAnswer: string;
  matchingPairs?: any[];
}

export interface CourseBuilderModule {
  id: string;
  title: string;
  description: string;
  status: 'published' | 'draft';
  expanded: boolean;
  lessons: CourseBuilderLesson[];
  quizzes: CourseBuilderQuiz[];
}

export interface CourseBuilderData {
  courseName: string;
  courseDescription: string;
  courseThumbnailUrl: string;
  courseStatus: 'published' | 'draft';
  courseCategory: string;
  courseOutcomes: string[];
  modules: CourseBuilderModule[];
}


// QuizTaking-specific interfaces
export interface CourseSectionItem {
  id: string;
  type: 'video' | 'quiz' | 'pdf';
  title: string;
  description?: string;
  order_index: number;
  duration_seconds?: number;
  video_url?: string;
  thumbnail_url?: string;
}

export interface CourseSection {
  id: string;
  title: string;
  description?: string;
  order_index: number;
  items: CourseSectionItem[];
}

export interface QuizQuestion {
  id: number;
  type: 'mcq' | 'multiple-choice' | 'true-false' | 'short_answer' | 'short-answer' | 'multiple-correct' | 'matching' | 'true_false';
  question: string;
  text?: string; // Backend might use 'text' instead of 'question'
  question_text?: string; // Alternative backend format
  question_type?: string; // Backend format
  image?: string | null;
  image_url?: string; // Backend format
  imageUrl?: string; // Frontend format
  options?: string[];
  correctAnswer?: number | number[] | string;
  correct_answer?: number | number[] | string; // Backend format
  explanation?: string;
  points?: number;
  sampleAnswer?: string; // For short answer questions
  matching_pairs?: { left: string; right: string }[]; // For matching questions
}

// Alias for compatibility
export type Question = QuizQuestion;

export interface Quiz {
  id: string;
  title: string;
  description?: string;
  totalQuestions: number;
  passingScore: number;
  passing_score?: number; // Backend format
  timeLimit?: number;
  time_limit?: number; // Backend format
  questions: QuizQuestion[];
}

export interface QuizData {
  quiz: Quiz;
  sections: CourseSection[];
}

export interface DuplicateCourseResponse {
  success: boolean;
  message: string;
  data: {
    originalCourseId: string;
    duplicatedCourseId: string;
    duplicatedCourse: any;
    counts: {
      sections: number;
      videos: number;
      quizzes: number;
      resources: number;
    };
  };
  meta: {
    timestamp: string;
    requestId: string;
  };
}

// Helper function to convert AWS course format to web format
const convertAWSCourseToWebCourse = (awsCourse: any, statistics?: any): Course => {
  if (!awsCourse || typeof awsCourse !== 'object') {
    console.warn('Invalid course data:', awsCourse);
    throw new Error('Invalid course data received from API');
  }

  // Use statistics if provided (from detailed course response)
  const stats = statistics || awsCourse.statistics || {};

  // Handle is_published - it's a boolean in the database
  // Check for both direct boolean and string representations
  let isPublished = false;
  if (typeof awsCourse.is_published === 'boolean') {
    isPublished = awsCourse.is_published;
  } else if (typeof awsCourse.is_published === 'string') {
    isPublished = awsCourse.is_published.toLowerCase() === 'true';
  }
  
  const status: 'published' | 'draft' = isPublished ? 'published' : 'draft';

  // Handle category - might be category_name or we need to use a default
  const category = awsCourse.category_name || awsCourse.category || 'General';

  const converted = {
    id: String(awsCourse.courseid || awsCourse.id || 'unknown'),
    title: awsCourse.title || 'Untitled Course',
    description: awsCourse.description || 'No description available',
    thumbnail: awsCourse.thumbnail_url || DEFAULT_COURSE_THUMBNAIL,
    category: category,
    categoryColor: awsCourse.category_color || Colors.accent,
    status: status,
    instructor: awsCourse.instructor_name || 'Unknown Instructor',
    instructorId: awsCourse.instructorid || awsCourse.instructor_id,
    enrolledCount: parseInt(awsCourse.student_count || '0'),
    completionRate: parseFloat(awsCourse.completion_rate || '0'),
    rating: parseFloat(awsCourse.rating || '4.0'),
    totalRatings: parseInt(awsCourse.total_ratings || '0'),
    duration: `${awsCourse.duration_hours || 0} weeks`,
    modules: Number(
      awsCourse.total_sections ??
      stats.total_sections ??
      0
    ),
    lessons: Number(
      awsCourse.total_videos ??
      stats.total_videos ??
      0
    ),
    quizzes: Number(
      awsCourse.total_quizzes ??
      stats.total_quizzes ??
      0
    ),

    createdDate: awsCourse.created_at ? new Date(awsCourse.created_at).toLocaleDateString() : 'N/A',
    lastUpdated: awsCourse.updated_at ? new Date(awsCourse.updated_at).toLocaleDateString() : 'N/A',
    tags: Array.isArray(awsCourse.tags) ? awsCourse.tags : [],
    recommendationPrimaryTag: awsCourse.recommendation_primary_tag,
    recommendationModelVersion: awsCourse.recommendation_model_version,
    recommendationRequestId: awsCourse.recommendation_request_id,
    recommendationScore: awsCourse.recommendation_score,
  };

  return converted;
};

class CourseService {
  /**
   * Get all courses (instructor view)
   */
  async getCourses(params?: CourseListParams): Promise<Course[]> {
    try {
      // Use Supabase Edge Function instead of AWS API Gateway
      const queryParams = new URLSearchParams();
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.category) queryParams.append('filterField', 'category_name');
      if (params?.category) queryParams.append('filterValue', params.category);
      if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);
      if (params?.instructorId) queryParams.append('instructorId', params.instructorId);
      
      const response = await apiService.get<any>(ENDPOINTS.COURSES + `?${queryParams.toString()}`);    

      let coursesArray;
      if (response.data && Array.isArray(response.data)) {
        coursesArray = response.data;
      } else if (response.courses && Array.isArray(response.courses)) {
        coursesArray = response.courses;
      } else if (response.data && response.data.courses && Array.isArray(response.data.courses)) {
        coursesArray = response.data.courses;
      } else if (Array.isArray(response)) {
        // Sometimes the response itself is the array
        coursesArray = response;
      } else {
        console.error('Invalid API response structure:', response);
        throw new Error('Invalid API response: courses array not found');
      }

      const convertedCourses = coursesArray.map(convertAWSCourseToWebCourse);
      return convertedCourses;
    } catch (error) {
      console.error('Error fetching courses:', error);
      // Instructor-scoped empty state should not hard-fail page rendering.
      if (params?.instructorId) {
        return [];
      }
      throw error;
    }
  }


  /**
   * Get complete course details with modules and students (for CourseDetail page)
   * @param courseId - The course ID
   * @param adminId - The admin/instructor ID
   * @returns Complete course data including modules and students
   */
  async getCourseDetailData(courseId: string, adminId: string): Promise<CourseDetailResponse> {
    try {
      // Fetch main course data with modules
      const fullData = await apiService.post<{
        success: boolean;
        data?: {
          course: any;
          sections?: any[];
          totalSections?: number;
          totalVideos?: number;
          totalQuizzes?: number;
        };
        message?: string;
      }>(ENDPOINTS.COURSE_BY_ID_INSTRUCTOR(adminId, courseId), {});

      if (!fullData.success || !fullData.data) {
        throw new Error(fullData.message || "Course not found");
      }

      const courseData = fullData.data.course;
      const actualEnrolledCount = parseInt(courseData.student_count) || 0;

      // Build course object
      const course: Course = {
        id: courseData.id,
        title: courseData.title,
        description: courseData.description || "",
        thumbnail: courseData.thumbnail_url || "",
        category: courseData.category_name || "Uncategorized",
        categoryColor: courseData.category_color || Colors.accent,
        status: courseData.is_published ? "published" : "draft",
        instructor: courseData.instructor_name || "Unknown",
        instructorId: courseData.instructor_id,
        enrolledCount: actualEnrolledCount,
        completionRate: 0, // Will be calculated after fetching students
        rating: parseFloat(courseData.rating) || 0,
        totalRatings: parseInt(courseData.totalRatings) || 0,
        duration: `${courseData.duration_hours || 0}h`,
        modules: fullData.data.totalSections || 0,
        lessons: fullData.data.totalVideos || 0,
        quizzes: fullData.data.totalQuizzes || 0,
        createdDate: courseData.created_at
          ? new Date(courseData.created_at).toLocaleDateString()
          : "N/A",
        lastUpdated: courseData.updated_at
          ? new Date(courseData.updated_at).toLocaleDateString()
          : "N/A",
        outcomes: Array.isArray(courseData.outcomes) ? courseData.outcomes : [],
      };

      // Extract modules/sections
      const modules = fullData.data.sections || [];

      // Fetch enrolled students
      let enrolledStudents: Student[] = [];
      try {
        enrolledStudents = await this.getCourseStudents(courseId);
        
        // Update enrolled count and completion rate with actual data
        course.enrolledCount = enrolledStudents.length;
        
        if (enrolledStudents.length > 0) {
          const completedCount = enrolledStudents.filter(
            (s) => s.progress === 100
          ).length;
          course.completionRate = Math.round(
            (completedCount / enrolledStudents.length) * 100
          );
        }
      } catch (err) {
        console.error("Error fetching students:", err);
      }

      // Fetch available students
      let availableStudents: Array<{
        id: string;
        name: string;
        email: string;
        totalEnrollments?: number;
        averageProgress?: number;
      }> = [];
      try {
        availableStudents = await this.getAvailableStudents(courseId);
      } catch (err) {
        console.error("Error fetching available students:", err);
      }

      return {
        course,
        modules,
        enrolledStudents,
        availableStudents,
      };
    } catch (error) {
      console.error(`Error fetching course detail data for ${courseId}:`, error);
      throw error;
    }
  }


  /**
   * Get enrolled students for a course
   */
  async getCourseStudents(courseId: string): Promise<Student[]> {
    try {
      const response = await apiService.get<any>(ENDPOINTS.COURSE_STUDENTS(courseId));
      
      if (!response || !response.data || !response.data.students) {
        return [];
      }

      return response.data.students.map((student: any) => ({
        id: student.id || student.user_id,
        name: student.name || student.username,
        email: student.email,
        progress: student.progress || 0,
        lastActive: student.lastActive || student.last_accessed || 'N/A',
      }));
    } catch (error) {
      console.error(`Error fetching students for course ${courseId}:`, error);
      return [];
    }
  }

  /**
   * Get available students (not enrolled in this course)
   */
  async getAvailableStudents(courseId: string): Promise<Array<{id: string, name: string, email: string, totalEnrollments?: number, averageProgress?: number}>> {
    try {
      const response = await apiService.get<any>(ENDPOINTS.AVAILABLE_STUDENTS(courseId));
      
      // API response: { success, data: { availableStudents, totalAvailable } }
      return response.data.availableStudents.map((student: any) => ({
        id: student.id,
        name: student.name,
        email: student.email,
        totalEnrollments: student.totalEnrollments || 0,
        averageProgress: student.averageProgress || 0
      }));
    } catch (error) {
      console.error(`Error fetching available students for course ${courseId}:`, error);
      return [];
    }
  }

  /**
   * Get all students in the system with enrollment statistics
   */
  async getAllStudents(instructorId?: string): Promise<{
    students: Array<{
      id: string;
      name: string;
      email: string;
      enrolledDate: string;
      progress: number;
      lastActivity: string;
      engagement: number;
      coursesEnrolled: number;
      completedCourses: number;
      totalHours: number;
      enabled?: boolean;
      avatarUrl?: string;
    }>;
    statistics: {
      total_students: number;
      active_students: number;
      engaged_students: number;
      at_risk_students: number;
      average_progress: number;
      average_engagement: number;
    };
  }> {
    try {
      const response = await apiService.get<any>(
        ENDPOINTS.ALL_STUDENTS,
        instructorId ? { instructorId } : undefined
      );

      const payload = response?.data ?? response;
      const students = Array.isArray(payload?.students) ? payload.students : [];
      const statistics = payload?.statistics || {
        total_students: 0,
        active_students: 0,
        engaged_students: 0,
        at_risk_students: 0,
        average_progress: 0,
        average_engagement: 0
      };

      return {
        students: students.map((student: any) => ({
          id: student.id,
          name: student.name,
          email: student.email,
          enrolledDate: student.enrolledDate,
          progress: Number(student.progress ?? 0),
          lastActivity: student.lastActivity || 'Never',
          engagement: Number(student.engagement ?? 0),
          coursesEnrolled: Number(student.coursesEnrolled ?? 0),
          completedCourses: Number(student.completedCourses ?? 0),
          totalHours: Number(student.totalHours ?? 0),
          enabled: student.enabled,
          avatarUrl: student.avatarUrl
        })),
        statistics
      };
    } catch (error) {
      console.error('Error fetching all students:', error);
      throw new Error('Failed to fetch students');
    }
  }

  /**
   * Get instructor-scoped reviews (optionally filtered to a single course)
   */
  async getInstructorReviews(input: {
    instructorId: string;
    courseId?: string;
    sort?: "latest" | "lowest_rating" | "highest_rating";
    status?: "all" | "visible" | "hidden" | "flagged" | "resolved";
    q?: string;
    limit?: number;
    offset?: number;
  }): Promise<InstructorReviewsResponse> {
    const params: Record<string, string> = {
      sort: input.sort || "latest",
      limit: String(input.limit ?? 100),
      offset: String(input.offset ?? 0),
    };

    if (input.courseId) {
      params.courseId = input.courseId;
    }
    if (input.status && input.status !== "all") {
      params.status = input.status;
    }
    if (input.q && input.q.trim().length > 0) {
      params.q = input.q.trim();
    }

    try {
      const response = await apiService.get<any>(
        ENDPOINTS.INSTRUCTOR_REVIEWS(input.instructorId),
        params
      );

      const payload = response?.data ?? response ?? {};
      const reviews = (payload?.reviews ?? []).map((review: any, index: number) => ({
        id: review.id || index,
        studentName:
          review.reviewer_name ||
          review.reviewerName ||
          review.student_name ||
          "Anonymous",
        rating: parseFloat(String(review.rating || "0")),
        date: review.created_at
          ? new Date(review.created_at).toLocaleDateString()
          : review.createdAt
            ? new Date(review.createdAt).toLocaleDateString()
            : "N/A",
        comment: review.review || review.comment || "",
        reviewStatus: review.review_status || review.reviewStatus || "visible",
        contextSectionId: review.context_section_id || review.contextSectionId || null,
        contextSectionTitle:
          review.context_section_title || review.contextSectionTitle || null,
        flagReason: review.flag_reason || review.flagReason || null,
        moderationNote: review.moderation_note || review.moderationNote || null,
        moderatedBy: review.moderated_by || review.moderatedBy || null,
        moderatedAt: review.moderated_at || review.moderatedAt || null,
        instructorReply: review.instructor_reply || review.instructorReply || null,
        instructorRepliedAt:
          review.instructor_replied_at || review.instructorRepliedAt || null,
        acknowledgedAt: review.acknowledged_at || review.acknowledgedAt || null,
        isPinned: Boolean(review.is_pinned ?? review.isPinned),
        pinnedAt: review.pinned_at || review.pinnedAt || null,
        pinnedBy: review.pinned_by || review.pinnedBy || null,
      }));
      return {
        reviews,
        summary: {
          total_reviews: Number(payload?.summary?.total_reviews || 0),
          average_rating: Number(payload?.summary?.average_rating || 0),
          courses_covered: Number(payload?.summary?.courses_covered || 0),
        },
        pagination: {
          limit: Number(payload?.pagination?.limit || input.limit || 100),
          offset: Number(payload?.pagination?.offset || input.offset || 0),
          total: Number(payload?.pagination?.total || 0),
          has_more: Boolean(payload?.pagination?.has_more || false),
        },
      };
    } catch (error) {
      console.error(
        `Error fetching instructor reviews for ${input.instructorId}:`,
        error
      );
      return {
        reviews: [],
        summary: {
          total_reviews: 0,
          average_rating: 0,
          courses_covered: 0,
        },
        pagination: {
          limit: Number(input.limit || 100),
          offset: Number(input.offset || 0),
          total: 0,
          has_more: false,
        },
      };
    }
  }


  /**
   * Get course data for CourseBuilder (editing/creating courses)
   * @param courseId - The course ID
   * @param adminId - The admin/instructor ID
   * @returns Course data formatted for CourseBuilder component
   */
  async getCourseBuilderData(courseId: string, adminId: string): Promise<CourseBuilderData> {
    try {

      const response = await apiService.get<any>(ENDPOINTS.COURSE_BY_ID_INSTRUCTOR(adminId, courseId), {});

      if (!response || !response.data) {
        throw new Error(`Course with ID ${courseId} not found`);
      }

      const course = response.data.course;
      const sections = response.data.sections || [];

      // Transform sections to moduleDetails format
      const moduleDetails = sections.map((section: any) => {
        const sectionItems = Array.isArray(section.items) ? section.items : [];
        const fallbackItemOrder = new Map<string, number>(
          sectionItems.map((item: any, index: number) => [String(item.id), index]),
        );

        const lessons =
          sectionItems
            ?.filter((item: any) =>
              ["video", "pdf", "document", "slides", "pptx", "docx", "ppt"].includes(
                item.type,
              ),
            )
            .map((item: any) => ({
              id: item.id,
              title: item.title,
              type: item.type === "video" ? "video" : "document",
              content: item.description || "",
              video_url: item.video_url || "",
              resource_url: item.resource_url || "",
              resource_type: item.resource_type || item.type || "pdf",
              file_size_bytes: item.file_size_bytes,
              is_downloadable: item.is_downloadable || false,
              thumbnail_url: item.thumbnail_url || "",
              duration:
                item.type === "video"
                  ? `${Math.floor((item.duration_seconds || 0) / 60)} min`
                  : "",
              duration_seconds: item.duration_seconds || 0,
              is_preview: item.is_preview || false,
              order_index: item.order_index ?? fallbackItemOrder.get(String(item.id)),
            })) || [];

        const quizzes =
          sectionItems
            ?.filter((item: any) => item.type === "quiz")
            .map((quiz: any) => ({
              id: quiz.id,
              title: quiz.title,
              description: quiz.description || "",
              passing_score: quiz.passing_score || 70,
              max_attempts: quiz.max_attempts === null ? null : quiz.max_attempts ?? 1,
              order_index: quiz.order_index ?? fallbackItemOrder.get(String(quiz.id)),
              questions: (quiz.questions || []).map((q: any) => ({
                id: q.id,
                question_text: q.text || q.question_text,
                question_type: q.type || q.question_type,
                options: q.options || [],
                correct_answer: q.correctAnswer || q.correct_answer,
                explanation: q.explanation,
                image_url: q.image_url || q.imageUrl || null,
              })),
            })) || [];

        return {
          id: section.id,
          title: section.title,
          description: section.description || "",
          order_index: section.order_index,
          lessons,
          quizzes,
        };
      });

      // Transform to CourseBuilder format
      const transformedModules: CourseBuilderModule[] = moduleDetails.map((module) => ({
        id: module.id.toString(),
        title: module.title,
        description: module.description || "",
        status: "published", // Assume published if exists
        expanded: false,
        lessons: module.lessons.map((lesson: any) => ({
          id: lesson.id.toString(),
          title: lesson.title,
          baseTitle: lesson.title,
          type: lesson.type || "video",
          status: "published",
          content: lesson.content || "",
          videoUrl: lesson.video_url || "",
          resourceUrl: lesson.resource_url || "",
          resourceType: lesson.resource_type || lesson.type || "pdf",
          fileSize: lesson.file_size_bytes,
          isDownloadable: lesson.is_downloadable || false,
          thumbnailUrl: lesson.thumbnail_url || "",
          durationSeconds: lesson.duration_seconds || 0,
          isPreview: lesson.is_preview || false,
          order: lesson.order_index,
        })),
        quizzes: module.quizzes.map((quiz: any) => {
          console.log("Processing quiz:", quiz.title, "Questions:", quiz.questions);
          
          return {
            id: quiz.id.toString(),
            title: quiz.title,
            baseTitle: quiz.title,
            status: "published",
            passingScore: quiz.passing_score || 70,
            maxAttempts: quiz.max_attempts === null ? null : quiz.max_attempts ?? 1,
            questions: (quiz.questions || []).map((question: any) => {
              console.log("Transforming question:", question);

              // Parse options and correct_answer if they're JSON strings
              let options = question.options || [];
              if (typeof options === 'string') {
                try {
                  options = JSON.parse(options);
                } catch (e) {
                  console.error('Failed to parse options:', options);
                  options = [];
                }
              }

              let rawCorrectAnswer = question.correct_answer;
              // Only parse as JSON if it looks like an array (for multiple-correct)
              // Don't parse simple strings like "8" or "blue" which would be converted incorrectly
              if (typeof rawCorrectAnswer === 'string' && rawCorrectAnswer.trim().startsWith('[')) {
                try {
                  rawCorrectAnswer = JSON.parse(rawCorrectAnswer);
                } catch (e) {
                  // If parsing fails, keep as string
                }
              }

              // Parse correctAnswer: Backend stores index as string, convert to number
              let correctAnswer: number | number[] | null;
              const rawQuestionType = question.question_type || question.type || "multiple-choice";
              const questionType =
                rawQuestionType === "mcq" || rawQuestionType === "multiple_choice"
                  ? "multiple-choice"
                  : rawQuestionType === "true_false"
                    ? "true-false"
                    : rawQuestionType === "short_answer"
                      ? "short-answer"
                      : rawQuestionType;

              if (questionType === "multiple-choice" || questionType === "multiple_choice") {
                // Handle both old format (text values) and new format (numeric indices)
                if (typeof rawCorrectAnswer === "number") {
                  // NEW format: numeric index like 1, use directly
                  correctAnswer = rawCorrectAnswer;
                } else if (typeof rawCorrectAnswer === "string") {
                  // First, try to find the text in options (handles old format like "8")
                  const answerIndex = options.findIndex(
                    (opt: string) => String(opt).trim() === String(rawCorrectAnswer).trim()
                  );
                  if (answerIndex >= 0) {
                    // Found the text in options, use its index
                    correctAnswer = answerIndex;
                  } else {
                    // Not found as text, try parsing as numeric index (handles "0", "1", etc.)
                    const numericAnswer = parseInt(rawCorrectAnswer, 10);
                    correctAnswer = !isNaN(numericAnswer) ? numericAnswer : null;
                  }
                } else {
                  correctAnswer = null;
                }
              } else if (questionType === "true-false") {
                // For true/false, backend stores index as string ("0" or "1")
                if (typeof rawCorrectAnswer === "string") {
                  // Try to parse as number first
                  const numericAnswer = parseInt(rawCorrectAnswer, 10);
                  if (!isNaN(numericAnswer) && (numericAnswer === 0 || numericAnswer === 1)) {
                    correctAnswer = numericAnswer;
                  } else if (rawCorrectAnswer === "True" || rawCorrectAnswer === "true") {
                    correctAnswer = 0;
                  } else if (rawCorrectAnswer === "False" || rawCorrectAnswer === "false") {
                    correctAnswer = 1;
                  } else {
                    correctAnswer = 0;
                  }
                } else if (typeof rawCorrectAnswer === "number") {
                  correctAnswer = rawCorrectAnswer;
                } else if (rawCorrectAnswer === true) {
                  correctAnswer = 0;
                } else if (rawCorrectAnswer === false) {
                  correctAnswer = 1;
                } else {
                  correctAnswer = null;
                }
              } else if (questionType === "multiple-correct") {
                // Multiple correct answers - can be stored as:
                // - NEW format: array of numeric indices [0, 1, 2]
                // - OLD format: array of text values ["2", "4", "3"]
                if (Array.isArray(rawCorrectAnswer)) {
                  const mappedAnswers = rawCorrectAnswer.map((ans: any) => {
                    if (typeof ans === "number") {
                      // NEW format: numeric index, use directly
                      return ans;
                    } else if (typeof ans === "string") {
                      // OLD format: text value, find in options array
                      const idx = options.findIndex((opt: string) => String(opt).trim() === String(ans).trim());
                      return idx;
                    }
                    return -1;
                  });
                  correctAnswer = Array.from(
                    new Set(
                      mappedAnswers.filter(
                        (idx: number) => Number.isInteger(idx) && idx >= 0 && idx < options.length,
                      ),
                    ),
                  );
                } else {
                  correctAnswer = [];
                }
              } else {
                correctAnswer = null;
              }

              // Parse matching pairs - for matching type, correct_answer contains the pairs
              let matchingPairs: any[] = [];
              if (questionType === "matching") {
                // For matching, rawCorrectAnswer is already the pairs array
                if (Array.isArray(rawCorrectAnswer)) {
                  matchingPairs = rawCorrectAnswer;
                } else if (typeof rawCorrectAnswer === 'string') {
                  try {
                    matchingPairs = JSON.parse(rawCorrectAnswer);
                  } catch (e) {
                    matchingPairs = [];
                  }
                }
                // Ensure it's an array
                if (!Array.isArray(matchingPairs)) {
                  matchingPairs = [];
                }
              }

              return {
                id: question.id.toString(),
                text: question.question_text || question.text || "",
                type: questionType,
                options: options,
                correctAnswer,
                imageUrl: question.imageUrl || question.image_url || null,
                points: question.points || 1,
                sampleAnswer: question.explanation || "",
                matchingPairs: matchingPairs,
              };
            }),
            order: quiz.order_index,
          };
        }),
      }));

      const extractBaseModuleTitle = (title: string) =>
        String(title || "").replace(/^Module\s+\d+\s*:\s*/i, "").trim();

      // Apply numbering to modules, lessons and quizzes on initial load
      // so CourseBuilder sidebar matches add/reorder numbering behavior.
      const numberedModules = transformedModules.map((module, moduleIndex) => ({
        ...module,
        title: `Module ${moduleIndex + 1}: ${extractBaseModuleTitle(module.title)}`,
        lessons: module.lessons.map((lesson, lessonIndex) => {
          const baseTitle =
            lesson.baseTitle ||
            lesson.title.replace(/^Lesson \d+\.\d+:\s*/, "");
          return {
            ...lesson,
            baseTitle: baseTitle,
            title: `Lesson ${moduleIndex + 1}.${lessonIndex + 1}: ${baseTitle}`,
          };
        }),
        quizzes: module.quizzes.map((quiz, quizIndex) => {
          const baseTitle =
            quiz.baseTitle || quiz.title.replace(/^Quiz \d+\.\d+:\s*/, "");
          return {
            ...quiz,
            baseTitle: baseTitle,
            title: `Quiz ${moduleIndex + 1}.${quizIndex + 1}: ${baseTitle}`,
          };
        }),
      }));

      return {
        courseName: course.title || "",
        courseDescription: course.description || "",
        courseThumbnailUrl: course.thumbnail_url || "",
        courseStatus: course.is_published ? "published" : "draft",
        courseCategory: course.category_id || "",
        courseOutcomes: course.outcomes || [],
        modules: numberedModules,
      };
    } catch (error) {
      console.error("CourseService: Error fetching course builder data:", error);
      throw error;
    }
  }
  
  /**
   * Get course sections for navigation (used in QuizTaking, LessonViewing, etc.)
   * @param courseId - The course ID
   * @param adminId - The admin/instructor ID
   * @returns Array of course sections with items
   */
  async getCourseSections(courseId: string, adminId: string): Promise<CourseSection[]> {
    try {
      console.log('CourseService: Fetching course sections for:', courseId, 'with adminId:', adminId);
      
      // const response = await apiService.get<{
      //   data?: {
      //     sections?: CourseSection[];
      //   };
      // }>(`/getModuleDetailInstructor/${adminId}/${courseId}`);
      
      const response = await apiService.get<any>(ENDPOINTS.COURSE_BY_ID_INSTRUCTOR(adminId, courseId), {});

      if (response?.data?.sections) {
        return response.data.sections;
      } else {
        return [];
      }
    } catch (error) {
      console.error('CourseService: Error fetching course sections:', error);
      return [];
    }
  }

  
  /**
   * Get quiz data with questions for QuizTaking page
   * @param courseId - The course ID
   * @param moduleId - The module/section ID
   * @param quizId - The quiz ID
   * @param adminId - The admin/instructor ID
   * @returns Quiz data with questions and course sections for navigation
   */
 /**
   * Get quiz data with questions for QuizTaking page
   * @param courseId - The course ID
   * @param moduleId - The module/section ID
   * @param quizId - The quiz ID
   * @param adminId - The admin/instructor ID
   * @returns Quiz data with questions and course sections for navigation
   */
  async getQuizData(courseId: string, moduleId: string, quizId: string, adminId: string): Promise<QuizData> {
    try {
      const response = await apiService.get<any>(ENDPOINTS.COURSE_BY_ID_INSTRUCTOR(adminId, courseId), {});
      
      if (!response?.data?.sections) {
        throw new Error('No sections found in course');
      }

      const sections = response.data.sections;
      
      // Find the specific quiz in the sections
      let foundQuiz: any = null;
      
      for (const section of sections) {
        if (section.id === moduleId || section.id.toString() === moduleId) {
          // Found the right section, now find the quiz
          const quizItem = section.items?.find(
            (item) => 
              item.type === 'quiz' && 
              (item.id === quizId || item.id.toString() === quizId)
          );
          
          if (quizItem) {
            foundQuiz = quizItem;
            break;
          }
        }
      }

      if (!foundQuiz) {
        // Try to find quiz in any section if moduleId didn't match
        for (const section of sections) {
          const quizItem = section.items?.find(
            (item) => 
              item.type === 'quiz' && 
              (item.id === quizId || item.id.toString() === quizId)
          );
          
          if (quizItem) {
            foundQuiz = quizItem;
            break;
          }
        }
      }

      if (!foundQuiz) {
        throw new Error(`Quiz with ID ${quizId} not found in course ${courseId}`);
      }
      // Transform quiz data to the expected format
      const transformedQuestions: QuizQuestion[] = (foundQuiz.questions || []).map((q: any, index: number) => {
        const questionType = q.question_type || 'mcq';
        
        return {
          id: q.id || index + 1,
          type: questionType,
          question: q.text || q.question_text || q.question || '',
          text: q.text || q.question_text || q.question || '',
          image_url: q.image_url || q.imageUrl || null,
          options: q.options || [],
          correctAnswer: q.correct_answer !== undefined ? q.correct_answer : q.correctAnswer,
          correct_answer: q.correct_answer !== undefined ? q.correct_answer : q.correctAnswer,
          explanation: q.explanation || '',
          points: q.points || 1,
        };
      });

      const quiz: Quiz = {
        id: foundQuiz.id,
        title: foundQuiz.title || 'Untitled Quiz',
        description: foundQuiz.description || '',
        totalQuestions: transformedQuestions.length,
        passingScore: foundQuiz.passing_score || foundQuiz.passingScore || 70,
        passing_score: foundQuiz.passing_score || foundQuiz.passingScore || 70,
        timeLimit: foundQuiz.time_limit || foundQuiz.timeLimit || 30,
        time_limit: foundQuiz.time_limit || foundQuiz.timeLimit || 30,
        questions: transformedQuestions,
      };

      console.log('CourseService: Transformed quiz data:', quiz);

      return {
        quiz,
        sections,
      };
    } catch (error) {
      console.error('CourseService: Error fetching quiz data:', error);
      throw error;
    }
  }

  /**
   * Create a new course
   */
  async createCourse(courseData: {
    title: string;
    category: string;
    description?: string;
    tags?: string[];
    instructorId?: string;
  }): Promise<Course> {
    try {
      // Get instructor ID from context or use default
      const instructorId = courseData.instructorId

      const response = await apiService.post<any>(ENDPOINTS.CREATE_COURSE, {
        title: courseData.title,
        category: courseData.category,
        description: courseData.description || '',
        tags: courseData.tags || [],
        instructorId: instructorId,
        isPublished: false, // Create as draft by default
      });

      if (!response || !response.data || !response.data.course) {
        throw new Error('Failed to create course');
      }

      return convertAWSCourseToWebCourse(response.data.course);
    } catch (error) {
      console.error('Error creating course:', error);
      throw error;
    }
  }

  /**
   * Create a new course with full module structure
   */
  async createCourseWithModules(courseData: {
    title: string;
    category: string;
    description: string;
    thumbnailUrl?: string | null;
    instructorId: string;
    instructorName: string;
    modules: any[];
    outcomes: any[];
    requirements: any[];
  }): Promise<{ courseId: string }> {
    try {
      const response = await apiService.post<any>('/createCourse', courseData);
      const courseId = response.data?.course?.id || response.data?.id || response.id;
      
      if (!courseId) {
        throw new Error('Failed to get course ID from response');
      }

      return { courseId };
    } catch (error) {
      console.error('Error creating course with modules:', error);
      throw error;
    }
  }

  /**
   * Update an existing course
   */
  // async updateCourse(courseId: string, courseData: Partial<Course>): Promise<Course> {
  //   try {
  //     const response = await apiService.put<any>(
  //       ENDPOINTS.UPDATE_COURSE(courseId),
  //       courseData
  //     );

  //     if (!response || !response.course) {
  //       throw new Error('Failed to update course');
  //     }

  //     return convertAWSCourseToWebCourse(response.course);
  //   } catch (error) {
  //     console.error(`Error updating course ${courseId}:`, error);
  //     throw error;
  //   }
  // }
  /**
   * Update a course with its modules, lessons, and quizzes
   * This is used by CourseBuilder to save the complete course structure
   * @param courseId - The course ID to update
   * @param courseData - Complete course data including modules
   */
  async updateCourseWithModules(courseId: string, courseData: any): Promise<any> {
    try {
      // const response = await apiService.post(`/updateCourse/${courseId}`, courseData);
       const response = await apiService.post(`${ENDPOINTS.UPDATE_COURSE(courseId)}`, courseData);
      return response;
    } catch (error) {
      console.error(`Error updating course with modules ${courseId}:`, error);
      throw error;
    }
  }


  /**
   * Delete a course
   */
  async deleteCourse(courseId: string): Promise<void> {
    try {
      await apiService.delete(ENDPOINTS.DELETE_COURSE(courseId));
    } catch (error) {
      console.error(`Error deleting course ${courseId}:`, error);
      throw error;
    }
  }

  /**
   * Enroll a student in a course
   */
  async enrollStudent(courseId: string, studentId: string): Promise<void> {
    try {
      await apiService.post(ENDPOINTS.ENROLL_STUDENT(studentId), {
        courseId: courseId,
      });

    } catch (error) {
      console.error(`Error enrolling student ${studentId} in course ${courseId}:`, error);
      throw error;
    }
  }

  /**
   * Search courses
   */
  async searchCourses(query: string): Promise<Course[]> {
    try {
      const allCourses = await this.getCourses();
      const searchTerm = query.toLowerCase();
      
      return allCourses.filter(course => 
        course.title.toLowerCase().includes(searchTerm) ||
        course.description.toLowerCase().includes(searchTerm) ||
        course.category.toLowerCase().includes(searchTerm)
      );
    } catch (error) {
      console.error('Error searching courses:', error);
      throw error;
    }
  }

  /**
   * Get personalized recommendations
   */
  async getRecommendations(userId: string, limit = 6): Promise<Course[]> {
    if (!userId) {
      throw new Error("Missing userId for recommendations");
    }
    const uid = userId;
    const response = await apiService.get<any>(ENDPOINTS.RECOMMENDATIONS, {
      userId: uid,
      limit: String(limit),
    });

    const recs = response?.data?.recommendations ?? response?.recommendations ?? [];
    const meta =
      response?.data?.meta ??
      response?.meta ??
      {};
    return recs.map((item: any) => {
      const coursePayload = item.course || item;
      const course = convertAWSCourseToWebCourse(coursePayload, coursePayload.statistics);
      return {
        ...course,
        recommendationPrimaryTag:
          item.primary_reason_tag || coursePayload.recommendation_primary_tag,
        recommendationModelVersion:
          meta?.model_version ||
          item.model_version ||
          coursePayload.recommendation_model_version,
        recommendationRequestId:
          meta?.request_id ||
          item.request_id ||
          coursePayload.recommendation_request_id,
        recommendationScore: item.score || coursePayload.recommendation_score,
      };
    });
  }

  async recordRecommendationEvent(payload: {
    userId?: string;
    courseId?: string;
    eventType: 'impression' | 'view' | 'click' | 'start' | 'complete' | 'dismiss' | 'save';
    context?: Record<string, any>;
    requestId?: string;
  }): Promise<void> {
    if (!payload.userId) {
      throw new Error("Missing userId for recommendation event");
    }
    const body = {
      userId: payload.userId,
      courseId: payload.courseId ?? null,
      eventType: payload.eventType,
      context: payload.context || {},
      requestId: payload.requestId,
    };

    await apiService.post(ENDPOINTS.RECOMMENDATION_EVENT, body);
  }

  async applyInstructorReviewAction(input: {
    instructorId: string;
    reviewId: string;
    action:
      | "hide"
      | "unhide"
      | "flag"
      | "resolve"
      | "acknowledge"
      | "reply"
      | "pin"
      | "unpin";
    moderationNote?: string;
    flagReason?: string;
    instructorReply?: string;
  }): Promise<void> {
    await apiService.post(ENDPOINTS.INSTRUCTOR_REVIEW_ACTION, {
      instructorId: input.instructorId,
      reviewId: input.reviewId,
      action: input.action,
      moderationNote: input.moderationNote ?? null,
      flagReason: input.flagReason ?? null,
      instructorReply: input.instructorReply ?? null,
    });
  }

  /**
   * Get instructor/admin statistics for dashboard
   */
  async getInstructorStats(adminId: string): Promise<any> {
    try {
      const response = await apiService.get<any>(ENDPOINTS.INSTRUCTOR_STATS(adminId));
      
      if (!response || !response.data) {
        throw new Error('Failed to retrieve instructor statistics');
      }

      return response.data;
    } catch (error) {
      console.error(`Error fetching instructor stats for ${adminId}:`, error);
      throw error;
    }
  }


  /**
   * Duplicate a course
   * POST /courseDuplicateHandler/{courseId}
   * Creates a copy of the course with all its sections, videos, quizzes, and resources (PDFs)
   */
  async duplicateCourse(courseId: string): Promise<Course> {
    try {
      if (!courseId) throw new Error('Missing courseId');
      
      const url = ENDPOINTS.COURSE_DUPLICATE(courseId);
      const response = await apiService.post<DuplicateCourseResponse>(url);
      
      const data = response?.data ?? response;
      const duplicatedCourseData = data?.data?.duplicatedCourse ?? data?.duplicatedCourse;
      
      if (!duplicatedCourseData) {
        throw new Error('Invalid API response when duplicating course');
      }
      
      // Convert to app Course format using the correct function name
      const duplicatedCourse = convertAWSCourseToWebCourse(duplicatedCourseData);
      
      return duplicatedCourse;
    } catch (error) {
      console.error(`Error duplicating course ${courseId}:`, error);
      throw error;
    }
  }
}

export const courseService = new CourseService();
export default courseService;
