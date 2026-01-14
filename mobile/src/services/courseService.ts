/**
 * Course Service - Handles all course-related API calls
 * Updated to work with Supabase endpoints
 */

import { Course, AWSApiResponse, AWSCoursesResponse, AWSCourse } from '../types';
import apiService from './apiService';
import * as SecureStore from 'expo-secure-store';

function unwrap<T = any>(r: any): T {
  return (r && typeof r === 'object' && 'data' in r ? r.data : r) as T;
}

const DEFAULT_USER_ID = process.env.EXPO_PUBLIC_DEFAULT_USER_ID || '550e8400-e29b-41d4-a716-446655440101';

// Cache configuration
const CACHE_CONFIG = {
  COURSES_KEY: 'cached_courses',
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes in milliseconds
};

// Course service endpoints - Supabase Edge Functions
const ENDPOINTS = {
  COURSES: '/getAllCourse', // Maps to getAllCourse.mjs
  USER_ENROLLMENTS: (uid: string) => `/getUserEnrollment/${encodeURIComponent(uid)}`, // Maps to getUserEnrollment.mjs
  COURSE_DETAILS: (courseId: string) => `/getModuleDetail/${encodeURIComponent(courseId)}`, // Maps to getModuleDetail.mjs
  COURSE_REVIEWS: (courseId: string) => `/courseReviewHandler/${encodeURIComponent(courseId)}`, // Maps to courseReviewHandler
  POST_ENROLLMENT: (uid: string) => `/postUserEnrollment/${encodeURIComponent(uid)}`, // Maps to postUserEnrollment.mjs
  RECOMMENDATIONS: '/getRecommendations',
  RECOMMENDATION_EVENT: '/postRecommendationEvent',
};


// Wishlist endpoints - Supabase Edge Functions
const WISHLIST = {
  BASE: (uid: string) => `/wishlistHandler/${encodeURIComponent(uid)}`, // Maps to wishlistHandler.mjs
  ITEM: (uid: string, courseId: string) =>
    `/wishlistHandler/${encodeURIComponent(uid)}?courseId=${encodeURIComponent(courseId)}`,
};

export interface CourseListParams {
  limit?: number;
  category?: string;
  level?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Types for enrollment response
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
  total_sections: number;
  completed_sections: number;
  video_progress_percent: number;
  quiz_progress_percent: number;
  estimated_time_remaining_minutes: number;
  last_accessed_formatted: string;
  enrollment_date_formatted: string;
  completion_date_formatted: string | null;
}

export interface EnrollmentResponse {
  success: boolean;
  message: string;
  data: {
    enrollments: EnrollmentCourse[];
    statistics: {
      total_enrollments: number;
      completed_courses: number;
      wishlist_count: number;
      average_progress: number;
      total_watch_time_minutes: number;
      active_last_week: number;
      total_watch_time_hours: number;
      completion_rate: number;
    };
    pagination: {
      currentPageSize: number;
      totalCount: number;
      limit: number;
      offset: number;
      hasMore: boolean;
      totalPages: number;
      currentPage: number;
    };
    filters: {
      status: string | null;
      progress_min: number | null;
      progress_max: number | null;
      sortBy: string;
      sortOrder: string;
    };
    meta: {
      timestamp: string;
      requestId: string;
    };
  };
}

export interface EnrollRequest {
  userId: string;
  courseId: string;
}

export interface EnrollApiResponse {
  success: boolean;
  message: string;
  data?: {
    enrollment_id: string;
    firstModuleId?: string;
  };
}

export interface CourseReview {
  id: string;
  rating: number;            // 1–5
  review: string;            // text
  createdAt: string;         // ISO
  reviewerName: string;      // "Anonymous" or real name
  reviewerAvatar: string|null;
}

export interface AddReviewPayload {
  userId: string;
  rating: number;
  review: string;
  isAnonymous?: boolean;
}

export interface AddReviewApiResponse {
  success: boolean;
  message: string;
  data?: CourseReview;
}

// services/courseService.ts
export interface UpdateReviewPayload {
  userId: string;
  rating: number;
  review: string;
  isAnonymous?: boolean;
}

// Cache utility functions
class CacheManager {
  static async get<T>(key: string): Promise<T | null> {
    try {
      const cachedData = await SecureStore.getItemAsync(key);
      if (!cachedData) return null;

      const { data, timestamp } = JSON.parse(cachedData);
      const now = Date.now();

      // Check if cache is still valid
      if (now - timestamp > CACHE_CONFIG.CACHE_DURATION) {
        await SecureStore.deleteItemAsync(key);
        return null;
      }

      return data;
    } catch (error) {
      console.warn(`Cache read error for key ${key}:`, error);
      return null;
    }
  }

  static async set<T>(key: string, data: T): Promise<void> {
    try {
      const cacheData = {
        data,
        timestamp: Date.now(),
      };
      await SecureStore.setItemAsync(key, JSON.stringify(cacheData));
    } catch (error) {
      console.warn(`Cache write error for key ${key}:`, error);
    }
  }

  static async clear(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.warn(`Cache clear error for key ${key}:`, error);
    }
  }
}

// Helper function to convert AWS course format to our app format
const convertAWSCourseToAppCourse = (awsCourse: any): Course => {
  // Safety checks
  if (!awsCourse || typeof awsCourse !== 'object') {
    console.warn('Invalid course data:', awsCourse);
    throw new Error('Invalid course data received from API');
  }

  // Calculate duration string from hours
  const durationStr = awsCourse.duration_hours ? `${awsCourse.duration_hours}h` : '0h';
  
  // Map level to lowercase format expected by types/index.ts
  const mapLevel = (level: string): 'beginner' | 'intermediate' | 'advanced' => {
    const levelLower = level?.toLowerCase();
    switch (levelLower) {
      case 'intermediate': return 'intermediate';
      case 'advanced': return 'advanced';
      default: return 'beginner';
    }
  };

  // Generate avatar from instructor name
  const generateAvatar = (name: string): string => {
    if (!name) return 'https://via.placeholder.com/50x50';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=50&background=3B82F6&color=fff`;
  };
  
  return {
    id: String(awsCourse.courseid || awsCourse.id || 'unknown'),
    title: awsCourse.title || 'Untitled Course',
    description: awsCourse.description || 'No description available',
    instructor: {
      id: String(awsCourse.instructorid || awsCourse.instructor_id || 'unknown'),
      name: awsCourse.instructor_name || 'Unknown Instructor',
      avatar: generateAvatar(awsCourse.instructor_name || 'Unknown'),
      category: awsCourse.category_name || 'General',
      rating: parseFloat(awsCourse.instructor_rating || '4.5'),
      bio: awsCourse.instructor_bio || 'No bio available',
    },
    progress: {
      completed: 0, // Default values - would come from enrollment data
      total: Math.floor((awsCourse.duration_hours || 10) / 2) || 10,
      percentage: 0,
      lastAccessed: new Date().toISOString(),
    },
    duration: durationStr,
    rating: parseFloat(awsCourse.rating || '4.0'),
    image:
      awsCourse.thumbnail_url ||
      awsCourse.image ||
      'https://via.placeholder.com/400x250',
    category: awsCourse.category_name || 'General',
    level: mapLevel(awsCourse.level),
    modules: Math.floor((awsCourse.duration_hours || 10) / 2) || 10,
    tags: Array.isArray(awsCourse.tags) ? awsCourse.tags : [],
    prerequisites: [],
    outcomes: [],
    createdAt: awsCourse.created_at || new Date().toISOString(),
    updatedAt: awsCourse.updated_at || new Date().toISOString(),
    isWishlisted: false,
  };
};

// Helper function to convert enrollment data to Course format
// const convertEnrollmentToAppCourse = (enrollment: EnrollmentCourse): Course => {
//   // Use section counts if available (after backend redeploy), otherwise calculate from items
//   const totalSections = enrollment.total_sections || 0;
//   const completedSections = enrollment.completed_sections || 0;
  
//   // Calculate from video/quiz data for accurate item-level tracking
//   const totalVideos = parseInt(enrollment.total_videos) || 0;
//   const completedVideos = parseInt(enrollment.completed_videos) || 0;
//   const totalQuizzes = parseInt(enrollment.total_quizzes) || 0;
//   const passedQuizzes = parseInt(enrollment.passed_quizzes) || 0;
  
//   const totalItems = totalVideos + totalQuizzes;
//   const completedItems = completedVideos + passedQuizzes;
  
//   // Calculate progress percentage from actual completion data
//   // Don't trust the API's progress_percentage as it may be stale
//   const calculatedPercentage = totalItems > 0 
//     ? Math.round((completedItems / totalItems) * 100) 
//     : 0;
  
//   // For display counts, use section counts if available, otherwise use item counts
//   const progressTotal = totalSections > 0 ? totalSections : totalItems;
//   const progressCompleted = totalSections > 0 ? completedSections : completedItems;
  
//   // Generate avatar from instructor name
//   const generateAvatar = (name: string): string => {
//     if (!name) return 'https://via.placeholder.com/50x50';
//     return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=50&background=3B82F6&color=fff`;
//   };

//   // Map level to lowercase format
//   const mapLevel = (level: string): 'beginner' | 'intermediate' | 'advanced' => {
//     const levelLower = level?.toLowerCase();
//     switch (levelLower) {
//       case 'intermediate': return 'intermediate';
//       case 'advanced': return 'advanced';
//       default: return 'beginner';
//     }
//   };

//   return {
//     id: enrollment.course_id,
//     title: enrollment.title,
//     description: enrollment.description,
//     instructor: {
//       id: `instructor-${enrollment.instructor_name.replace(/\s+/g, '-').toLowerCase()}`,
//       name: enrollment.instructor_name,
//       avatar: enrollment.instructor_avatar || generateAvatar(enrollment.instructor_name),
//       category: enrollment.category_name,
//       rating: parseFloat(enrollment.instructor_rating),
//       bio: `Expert ${enrollment.category_name} instructor`,
//     },
//     progress: {
//       completed: progressCompleted,
//       total: progressTotal,
//       percentage: calculatedPercentage,
//       lastAccessed: enrollment.last_accessed,
//     },
//     duration: `${enrollment.duration_hours}h`,
//     rating: parseFloat(enrollment.rating),
//     image: enrollment.thumbnail_url,
//     category: enrollment.category_name,
//     level: mapLevel(enrollment.level),
//     modules: progressTotal,
//     tags: enrollment.tags || [],
//     prerequisites: [],
//     outcomes: [],
//     createdAt: enrollment.enrollment_date,
//     updatedAt: enrollment.last_accessed,
//     isWishlisted: Boolean(enrollment.is_in_wishlist),
//   };
// };

// Helper function to convert enrollment data to Course format
const convertEnrollmentToAppCourse = (enrollment: EnrollmentCourse): Course => {
  // Primary: Use section counts if available (preferred method)
  const totalSections = enrollment.total_sections || 0;
  const completedSections = enrollment.completed_sections || 0;
  
  // Fallback: Calculate from video/quiz data if sections aren't available
  const totalVideos = parseInt(enrollment.total_videos) || 0;
  const completedVideos = parseInt(enrollment.completed_videos) || 0;
  const totalQuizzes = parseInt(enrollment.total_quizzes) || 0;
  const passedQuizzes = parseInt(enrollment.passed_quizzes) || 0;
  
  const totalItems = totalVideos + totalQuizzes;
  const completedItems = completedVideos + passedQuizzes;
  
  // Determine which data to use
  const hasSectionData = totalSections > 0;
  const progressTotal = hasSectionData ? totalSections : totalItems;
  const progressCompleted = hasSectionData ? completedSections : completedItems;
  
  // Calculate progress percentage
  const calculatedPercentage = progressTotal > 0 
    ? Math.round((progressCompleted / progressTotal) * 100) 
    : 0;
  
  console.log(`[courseService] Converting enrollment for "${enrollment.title}":`, {
    hasSectionData,
    totalSections,
    completedSections,
    totalItems,
    completedItems,
    progressTotal,
    progressCompleted,
    calculatedPercentage,
  });
  
  // Generate avatar from instructor name
  const generateAvatar = (name: string): string => {
    if (!name) return 'https://ui-avatars.com/api/?name=Unknown&size=50&background=3B82F6&color=fff';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=50&background=3B82F6&color=fff`;
  };

  // Map level to lowercase format
  const mapLevel = (level: string): 'beginner' | 'intermediate' | 'advanced' => {
    const levelLower = level?.toLowerCase();
    switch (levelLower) {
      case 'intermediate': return 'intermediate';
      case 'advanced': return 'advanced';
      default: return 'beginner';
    }
  };

  return {
    id: enrollment.course_id,
    title: enrollment.title,
    description: enrollment.description,
    instructor: {
      id: `instructor-${enrollment.instructor_name.replace(/\s+/g, '-').toLowerCase()}`,
      name: enrollment.instructor_name,
      avatar: enrollment.instructor_avatar || generateAvatar(enrollment.instructor_name),
      category: enrollment.category_name,
      rating: parseFloat(enrollment.instructor_rating),
      bio: `Expert ${enrollment.category_name} instructor`,
    },
    progress: {
      completed: progressCompleted,
      total: progressTotal,
      percentage: calculatedPercentage,
      lastAccessed: enrollment.last_accessed,
    },
    duration: `${enrollment.duration_hours}h`,
    rating: parseFloat(enrollment.rating),
    image: enrollment.thumbnail_url,
    category: enrollment.category_name,
    level: mapLevel(enrollment.level),
    modules: progressTotal,
    tags: enrollment.tags || [],
    prerequisites: [],
    outcomes: [],
    createdAt: enrollment.enrollment_date,
    updatedAt: enrollment.last_accessed,
    isWishlisted: Boolean(enrollment.is_in_wishlist),
  };
};

class CourseService {
  /**
   * Get all courses from AWS API Gateway
   */
  async getCourses(params?: CourseListParams): Promise<Course[]> {
    try {
      // Check cache first
      const cacheKey = `${CACHE_CONFIG.COURSES_KEY}_${JSON.stringify(params || {})}`;
      const cachedCourses = await CacheManager.get<Course[]>(cacheKey);
      if (cachedCourses) {
        return cachedCourses;
      }

      // Build query parameters
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

      // Safety check: ensure response exists
      if (!response) {
        throw new Error('No response received from API');
      }

      // The API response structure is: { success: true, data: [...], pagination: {...} }
      // Where data is the array of courses directly
      let coursesArray;
      if (Array.isArray(response.data)) {
        // Format: { success: true, data: [...] }
        coursesArray = response.data;
      } else if (response.data && response.data.courses && Array.isArray(response.data.courses)) {
        // Nested format: { success: true, data: { courses: [...] } }
        coursesArray = response.data.courses;
      } else if (response.courses && Array.isArray(response.courses)) {
        // Direct format: { courses: [...] }
        coursesArray = response.courses;
      } else if (Array.isArray(response)) {
        // Array format: [...]
        coursesArray = response;
      } else {
        console.error('Invalid API response structure:', JSON.stringify(response).slice(0, 500));
        throw new Error('Invalid API response: courses array not found');
      }

      // Convert AWS course format to our app format
      const courses = coursesArray.map(convertAWSCourseToAppCourse);

      // Cache the response
      await CacheManager.set(cacheKey, courses);

      return courses;
    } catch (error) {
      console.error('Error fetching courses:', error);
      throw error;
    }
  }

  /**
   * Get user's enrolled courses from the enrollment endpoint
   */
  async getUserEnrollments(userId: string): Promise<Course[]> {
    try {
      userId = userId || DEFAULT_USER_ID;
      
      // For testing, skip cache and always fetch fresh data
      const cacheKey = `${CACHE_CONFIG.COURSES_KEY}_enrollments_${userId}`;
      await CacheManager.clear(cacheKey);
      
      // Check cache first
      const cachedEnrollments = await CacheManager.get<Course[]>(cacheKey);
      if (cachedEnrollments) {
        return cachedEnrollments;
      }
      
      const response = await apiService.get<any>(ENDPOINTS.USER_ENROLLMENTS(userId));
      const payload = unwrap<EnrollmentResponse | { enrollments: EnrollmentCourse[] }>(response);

      // Support both shapes: { data: { enrollments: [...] } } OR { enrollments: [...] }
      const enrollmentsData =
        (payload as EnrollmentResponse)?.data?.enrollments ??
        (payload as any)?.enrollments ??
        [];  
      
      if (!Array.isArray(enrollmentsData)) {
        console.error('getUserEnrollments - Invalid enrollment response structure:', response);
        throw new Error('Invalid enrollment response: enrollments array not found');
      }

      // Convert enrollment format to our app Course format
      const courses = enrollmentsData.map(convertEnrollmentToAppCourse);

      // Cache the response
      await CacheManager.set(cacheKey, courses);

      return courses;
    } catch (error) {
      console.error('Error fetching user enrollments:', error);
      throw error;
    }
  }

  /**
   * Get user's enrolled courses (filter courses with progress > 0)
   * For now, returns first 2 courses as demo enrolled courses
   */
  async getMyCourses(): Promise<Course[]> {
    try {
      // Check cache first
      const cachedCourses = await CacheManager.get<Course[]>(`${CACHE_CONFIG.COURSES_KEY}_my`);
      if (cachedCourses) {
        return cachedCourses;
      }

      // Get all courses and return first 2 as "my courses" for demo
      const allCourses = await this.getCourses();
      if (!allCourses || allCourses.length === 0) {
        return [];
      }

      // For demo: take first 2 courses as enrolled courses and add progress
      const myCourses = allCourses.slice(0, 2).map((course, index) => ({
        ...course,
        progress: {
          completed: index === 0 ? 3 : 7, // Different progress for variety
          total: course.modules || 10,
          percentage: index === 0 ? 30 : 70, // 30% and 70% progress
          lastAccessed: new Date().toISOString(),
        }
      }));

      // Cache the filtered courses
      await CacheManager.set(`${CACHE_CONFIG.COURSES_KEY}_my`, myCourses);

      return myCourses;
    } catch (error) {
      console.error('Error fetching my courses:', error);
      throw error;
    }
  }

  /**
   * Get recommended courses (remaining courses after enrolled ones)
   */
  async getRecommendedCourses(userId?: string): Promise<Course[]> {
    try {
      const uid = userId || '550e8400-e29b-41d4-a716-446655440101';
      const cacheKey = `${CACHE_CONFIG.COURSES_KEY}_recommended_${uid}`;

      const resp = await apiService.get<any>(ENDPOINTS.RECOMMENDATIONS, {
        userId: uid,
        limit: '8',
      });

      const recs =
        (Array.isArray(resp?.data) ? resp?.data : null) ??
        resp?.data?.data?.recommendations ??
        resp?.data?.recommendations ??
        resp?.recommendations ??
        [];

      const sorted = Array.isArray(recs)
        ? [...recs].sort((a, b) => {
            const sa = Number(a.score ?? a.recommendation_score ?? 0);
            const sb = Number(b.score ?? b.recommendation_score ?? 0);
            if (sb !== sa) return sb - sa;
            const ra = Number(a.rank ?? a.recommendation_rank ?? Infinity);
            const rb = Number(b.rank ?? b.recommendation_rank ?? Infinity);
            return ra - rb;
          })
        : [];

      const courses = sorted
        .map((item: any, idx: number) => {
          let coursePayload: any = item.course || item;
          if (typeof coursePayload === 'string') {
            try {
              coursePayload = JSON.parse(coursePayload);
            } catch {
              coursePayload = null;
            }
          }
          if (!coursePayload || typeof coursePayload !== 'object') {
            return null;
          }
          try {
            const course = convertAWSCourseToAppCourse(coursePayload);
            return {
              ...course,
              recommendationReason: item.reason || coursePayload.recommendation_reason,
              recommendationScore: item.score || coursePayload.recommendation_score,
              recommendationRank: item.rank ?? item.recommendation_rank ?? idx + 1,
            };
          } catch (err) {
            console.warn('Failed to map recommendation item', err);
            return null;
          }
        })
        .filter(Boolean) as Course[];

      await CacheManager.set(cacheKey, courses);
      return courses;
    } catch (error) {
      console.warn('Error fetching recommended courses, falling back to empty list:', error);
      return [];
    }
  }

async getWishlist(userId: string): Promise<Course[]> {
  if (!userId) userId = DEFAULT_USER_ID;
  const cacheKey = `${CACHE_CONFIG.COURSES_KEY}_wishlist_${userId}`;
  const cached = await CacheManager.get<Course[]>(cacheKey);
  if (cached) return cached;
  // remove later - temporary override for testing

  const resp = await apiService.get<any>(WISHLIST.BASE(userId), { userId });
  const array = resp?.courses ?? resp?.data?.courses ?? [];
  const courses = array.map(convertAWSCourseToAppCourse);
  await CacheManager.set(cacheKey, courses);
  return courses;
}

async addToWishlist(userId: string, courseId: string): Promise<void> {
  if (!userId) userId = DEFAULT_USER_ID;
  if (!courseId) throw new Error('Missing courseId');
  await apiService.post(WISHLIST.ITEM(userId , courseId), { userId, courseId });
  await CacheManager.clear(`${CACHE_CONFIG.COURSES_KEY}_wishlist_${userId}`);
}

async removeFromWishlist(userId: string, courseId: string): Promise<void> {
  if (!userId) userId = DEFAULT_USER_ID;
  if (!courseId) throw new Error('Missing courseId');
  await apiService.delete(WISHLIST.ITEM(userId, courseId));
  await CacheManager.clear(`${CACHE_CONFIG.COURSES_KEY}_wishlist_${userId}`);
}

  /**
   * Get detailed information for a specific course
   */
  async getCourseById(courseId: string): Promise<Course | null> {
    try {
      const allCourses = await this.getCourses();
      return allCourses.find(course => course.id === courseId) || null;
    } catch (error) {
      console.error(`Error fetching course ${courseId}:`, error);
      throw error;
    }
  }

  /**
   * Search courses by title or description
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
   * Get courses by category
   */
  async getCoursesByCategory(category: string): Promise<Course[]> {
    try {
      return await this.getCourses({ category });
    } catch (error) {
      console.error(`Error fetching courses for category ${category}:`, error);
      throw error;
    }
  }

  /**
   * Refresh all cached data
   */
  async refreshCache(): Promise<void> {
    try {
      await Promise.all([
        CacheManager.clear(CACHE_CONFIG.COURSES_KEY),
        CacheManager.clear(`${CACHE_CONFIG.COURSES_KEY}_my`),
        CacheManager.clear(`${CACHE_CONFIG.COURSES_KEY}_recommended`),
      ]);
      
      // Pre-load essential data
      await Promise.all([
        this.getCourses(),
        this.getMyCourses(),
        this.getRecommendedCourses(),
      ]);
    } catch (error) {
      console.error('Error refreshing cache:', error);
    }
  }

  /**
   * Get cache status
   */
  async getCacheStatus(): Promise<{
    courses: boolean;
    myCourses: boolean;
    recommendedCourses: boolean;
  }> {
    const [courses, myCourses, recommendedCourses] = await Promise.all([
      CacheManager.get(CACHE_CONFIG.COURSES_KEY),
      CacheManager.get(`${CACHE_CONFIG.COURSES_KEY}_my`),
      CacheManager.get(`${CACHE_CONFIG.COURSES_KEY}_recommended`),
    ]);

    return {
      courses: courses !== null,
      myCourses: myCourses !== null,
      recommendedCourses: recommendedCourses !== null,
    };
  }

  /**
   * Check if a given user is enrolled in a given course.
   * Uses your existing GET /courses/enrollment/:userId and searches client-side.
   * Caches via getUserEnrollments() cache key.
   */
  async isUserEnrolledInCourse(userId: string, courseId: string): Promise<boolean> {
    // if (!userId || !courseId) throw new Error('Missing userId/courseId');

    // Reuse the enrollments fetch (it already maps to Course[])
    const uid = userId || DEFAULT_USER_ID;
    const enrolledCourses = await this.getUserEnrollments(uid);
    return enrolledCourses.some(c => String(c.id) === String(courseId));
  }

  /**
   * Enroll user in course (free courses).
   * POST /postUserEnrollment with { userId, courseId }
   * Maps to postUserEnrollment.mjs Lambda function
   * Expects idempotent server (409 if already enrolled).
   */
  async enrollInCourse(userId: string, courseId: string): Promise<{ firstModuleId?: string }> {
    // if (!userId || !courseId) throw new Error('Missing userId/courseId');
    const uid = userId || DEFAULT_USER_ID;

    const url = ENDPOINTS.POST_ENROLLMENT(uid);
    const resp = await apiService.post<any>(url, {
      userId: uid,
      courseId,
      // optional fields supported by the edge function
      initialProgress: 0,
      isCompleted: false,
      totalWatchTimeMinutes: 0,
    });

    await Promise.all([
      CacheManager.clear(`${CACHE_CONFIG.COURSES_KEY}_enrollments_${uid}`),
      CacheManager.clear(`${CACHE_CONFIG.COURSES_KEY}_my`),
    ]);

    // Normalize API value to undefined (no nulls)
    const apiFirst: string | undefined =
      (resp?.data?.firstModuleId ?? resp?.firstModuleId) || undefined;

    if (apiFirst) return { firstModuleId: apiFirst };

    try {
      const detail =
        await (await import('./courseDetailService'))
          .courseDetailService.getCourseDetail(courseId);

      const derived: string | undefined = detail?.modules?.[0]?.id || undefined;
      return derived ? { firstModuleId: derived } : {};
    } catch {
      return {}; // no nulls; caller handles absence
    }
  }

  async getUserReview(courseId: string, userId: string): Promise<CourseReview | null> {
    try {
      const resp = await apiService.get<any>(
        `${ENDPOINTS.COURSE_REVIEWS(courseId)}`,
        { userId }
      );
      const data = resp?.data ?? resp;
      return data ?? null;
    } catch {
      return null;
    }
  }


    /**
     * Post a new review for a course
     * POST /courses/:courseId/reviews
     */
    async postCourseReview(
      courseId: string,
      payload: AddReviewPayload
    ): Promise<CourseReview> {
      if (!courseId) throw new Error('Missing courseId');
      if (!Number.isInteger(payload.rating) || payload.rating < 1 || payload.rating > 5) {
        throw new Error('rating must be an integer 1–5');
      }
      if (!payload.review?.trim()) throw new Error('review text is required');

      // TEMP override — mirror your other methods
      const userId = '550e8400-e29b-41d4-a716-446655440101';

      const url = ENDPOINTS.COURSE_REVIEWS(courseId);
      const resp = await apiService.post<AddReviewApiResponse>(url, {
        userId,
        rating: payload.rating,
        review: payload.review.trim(),
        isAnonymous: !!payload.isAnonymous,
      });

      const data = (resp as any)?.data ?? (resp as any);
      const review: CourseReview | undefined = data?.data ?? data;
      if (!review) throw new Error('Invalid API response when posting review');
      return review;
    }

  async updateCourseReview(courseId: string, payload: UpdateReviewPayload) {
    const userId = '550e8400-e29b-41d4-a716-446655440101'; // same as postCourseReview override
    const url = ENDPOINTS.COURSE_REVIEWS(courseId);
    const resp = await apiService.put<AddReviewApiResponse>(url, {
      userId,
      rating: payload.rating,
      review: payload.review.trim(),
      isAnonymous: !!payload.isAnonymous,
    });
    const data: any = (resp as any)?.data ?? (resp as any);
    return data?.data ?? data;
  }

  async recordRecommendationEvent(payload: {
    userId?: string;
    courseId?: string;
    eventType: 'impression' | 'view' | 'click' | 'start' | 'complete' | 'dismiss' | 'save';
    context?: Record<string, any>;
    requestId?: string;
  }): Promise<void> {
    const body = {
      userId: payload.userId || '550e8400-e29b-41d4-a716-446655440101',
      courseId: payload.courseId ?? null,
      eventType: payload.eventType,
      context: payload.context || {},
      requestId: payload.requestId,
    };

    try {
      await apiService.post(ENDPOINTS.RECOMMENDATION_EVENT, body);
      console.info('rec_event_ok', {
        eventType: body.eventType,
        courseId: body.courseId,
        placement: body.context?.placement,
      });
    } catch (err) {
      console.warn('rec_event_fail', {
        eventType: body.eventType,
        courseId: body.courseId,
        placement: body.context?.placement,
        error: (err as any)?.message || err,
      });
      throw err;
    }
  }

}

// Export singleton instance
export const courseService = new CourseService();
export default courseService;
