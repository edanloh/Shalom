/**
 * Course Service - Handles all course-related API calls for web/instructor view
 * Matches mobile implementation with instructor-specific features
 */

import apiService from './apiService';
import { DEFAULT_COURSE_THUMBNAIL } from '@/constants/images';

// Course service endpoints matching Lambda functions
const ENDPOINTS = {
  COURSES: '/courses',
  COURSE_BY_ID: (courseId: string) => `/courses/${courseId}`,
  COURSE_STUDENTS: (courseId: string) => `/courses/${courseId}/students`,
  AVAILABLE_STUDENTS: (courseId: string) => `/courses/${courseId}/availableStudents`,
  ALL_STUDENTS: '/students',
  COURSE_REVIEWS: (courseId: string) => `/courses/${courseId}/reviews`,
  USER_ENROLLMENTS: (uid: string) => `/courses/enrollment/${encodeURIComponent(uid)}`,
  CREATE_COURSE: '/courses',
  UPDATE_COURSE: (courseId: string) => `/courses/${courseId}`,
  DELETE_COURSE: (courseId: string) => `/courses/${courseId}`,
  ENROLL_STUDENT: (courseId: string) => `/courses/${courseId}/enroll`,
  INSTRUCTOR_STATS: (adminId: string) => `/admin/${adminId}/stats`,
};

export interface CourseListParams {
  limit?: number;
  category?: string;
  level?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  category: string;
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
  level?: string;
  tags?: string[];
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

export interface Review {
  id: number;
  studentName: string;
  rating: number;
  date: string;
  comment: string;
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
  level: string;
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

// Helper function to convert AWS course format to web format
const convertAWSCourseToWebCourse = (awsCourse: any, statistics?: any): Course => {
  if (!awsCourse || typeof awsCourse !== 'object') {
    console.warn('Invalid course data:', awsCourse);
    throw new Error('Invalid course data received from API');
  }

  // Use statistics if provided (from detailed course response)
  const stats = statistics || awsCourse.statistics || {};

  return {
    id: String(awsCourse.courseid || awsCourse.id || 'unknown'),
    title: awsCourse.title || 'Untitled Course',
    description: awsCourse.description || 'No description available',
    thumbnail: awsCourse.thumbnail_url || DEFAULT_COURSE_THUMBNAIL,
    category: awsCourse.category_name || 'General',
    status: awsCourse.is_published ? 'published' : 'draft',
    instructor: awsCourse.instructor_name || 'Unknown Instructor',
    instructorId: awsCourse.instructorid || awsCourse.instructor_id,
    enrolledCount: parseInt(awsCourse.student_count || '0'),
    completionRate: parseFloat(awsCourse.completion_rate || '0'),
    rating: parseFloat(awsCourse.rating || '4.0'),
    totalRatings: parseInt(awsCourse.total_ratings || '0'),
    duration: `${awsCourse.duration_hours || 0} weeks`,
    modules: parseInt(stats.total_sections || awsCourse.total_modules || '0'),
    lessons: parseInt(stats.total_videos || awsCourse.total_lessons || '0'),
    quizzes: parseInt(stats.total_quizzes || awsCourse.total_quizzes || '0'),
    createdDate: awsCourse.created_at ? new Date(awsCourse.created_at).toLocaleDateString() : 'N/A',
    lastUpdated: awsCourse.updated_at ? new Date(awsCourse.updated_at).toLocaleDateString() : 'N/A',
    level: awsCourse.level || 'beginner',
    tags: Array.isArray(awsCourse.tags) ? awsCourse.tags : [],
  };
};

class CourseService {
  /**
   * Get all courses (instructor view)
   */
  async getCourses(params?: CourseListParams): Promise<Course[]> {
    try {
      const queryParams: Record<string, string> = {};
      if (params?.limit) queryParams.limit = params.limit.toString();
      if (params?.category) queryParams.category = params.category;
      if (params?.level) queryParams.level = params.level;
      if (params?.sortBy) queryParams.sortBy = params.sortBy;
      if (params?.sortOrder) queryParams.sortOrder = params.sortOrder;

      const response = await apiService.get<any>(
        ENDPOINTS.COURSES,
        queryParams
      );

      let coursesArray;
      if (response.courses && Array.isArray(response.courses)) {
        coursesArray = response.courses;
      } else if (response.data && response.data.courses && Array.isArray(response.data.courses)) {
        coursesArray = response.data.courses;
      } else {
        console.error('Invalid API response structure:', response);
        throw new Error('Invalid API response: courses array not found');
      }

      return coursesArray.map(convertAWSCourseToWebCourse);
    } catch (error) {
      console.error('Error fetching courses:', error);
      throw error;
    }
  }

  /**
   * Get course by ID with full details
   */
  async getCourseById(courseId: string): Promise<Course | null> {
    try {
      const response = await apiService.get<any>(ENDPOINTS.COURSE_BY_ID(courseId));
      
      // Handle nested response structure from Lambda
      let courseData, statistics;
      if (response.data && response.data.course) {
        courseData = response.data.course;
        statistics = response.data.statistics;
      } else if (response.course) {
        courseData = response.course;
        statistics = response.statistics;
      } else {
        console.error('Invalid course response structure:', response);
        return null;
      }

      return convertAWSCourseToWebCourse(courseData, statistics);
    } catch (error) {
      console.error(`Error fetching course ${courseId}:`, error);
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
  async getAllStudents(): Promise<{
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
      const response = await apiService.get<any>(ENDPOINTS.ALL_STUDENTS);
      
      // API response: { success, data: { students, statistics } }
      return {
        students: response.data.students.map((student: any) => ({
          id: student.id,
          name: student.name,
          email: student.email,
          enrolledDate: student.enrolledDate,
          progress: student.progress || 0,
          lastActivity: student.lastActivity || 'Never',
          engagement: student.engagement || 0,
          coursesEnrolled: student.coursesEnrolled || 0,
          completedCourses: student.completedCourses || 0,
          totalHours: student.totalHours || 0
        })),
        statistics: response.data.statistics || {
          total_students: 0,
          active_students: 0,
          engaged_students: 0,
          at_risk_students: 0,
          average_progress: 0,
          average_engagement: 0
        }
      };
    } catch (error) {
      console.error('Error fetching all students:', error);
      throw new Error('Failed to fetch students');
    }
  }

  /**
   * Get reviews for a course
   */
  async getCourseReviews(courseId: string): Promise<Review[]> {
    try {
      const response = await apiService.get<any>(ENDPOINTS.COURSE_REVIEWS(courseId));
      
      if (!response || !response.data || !response.data.reviews) {
        return [];
      }

      return response.data.reviews.map((review: any, index: number) => ({
        id: review.id || index,
        studentName: review.student_name || review.username,
        rating: parseFloat(review.rating || '5'),
        date: review.created_at ? new Date(review.created_at).toLocaleDateString() : 'N/A',
        comment: review.comment || review.review_text || '',
      }));
    } catch (error) {
      console.error(`Error fetching reviews for course ${courseId}:`, error);
      return [];
    }
  }

  /**
   * Create a new course
   */
  async createCourse(courseData: {
    title: string;
    category: string;
    description?: string;
    level?: string;
    tags?: string[];
    instructorId?: string;
  }): Promise<Course> {
    try {
      // Get instructor ID from context or use default
      const instructorId = courseData.instructorId || '550e8400-e29b-41d4-a716-446655440101';

      const response = await apiService.post<any>(ENDPOINTS.CREATE_COURSE, {
        title: courseData.title,
        category: courseData.category,
        description: courseData.description || '',
        level: courseData.level || 'Beginner',
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
   * Update an existing course
   */
  async updateCourse(courseId: string, courseData: Partial<Course>): Promise<Course> {
    try {
      const response = await apiService.put<any>(
        ENDPOINTS.UPDATE_COURSE(courseId),
        courseData
      );

      if (!response || !response.course) {
        throw new Error('Failed to update course');
      }

      return convertAWSCourseToWebCourse(response.course);
    } catch (error) {
      console.error(`Error updating course ${courseId}:`, error);
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
      await apiService.post(`/courses/${courseId}/enroll`, {
        userId: studentId,
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
}

export const courseService = new CourseService();
export default courseService;
