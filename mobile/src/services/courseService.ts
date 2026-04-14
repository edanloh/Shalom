/**
 * Course Service - Handles all course-related API calls
 * Updated to work with Supabase endpoints
 */

import { Colors } from '@/constants';
import { Course } from '../types';
import apiService from './apiService';
import * as SecureStore from 'expo-secure-store';

function unwrap<T = any>(r: any): T {
  return (r && typeof r === 'object' && 'data' in r ? r.data : r) as T;
}

const DEFAULT_USER_ID = process.env.EXPO_PUBLIC_DEFAULT_USER_ID || '';

// Cache configuration
const CACHE_CONFIG = {
  COURSES_KEY: 'cached_courses',
  CATEGORIES_KEY: 'cached_categories',
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes in milliseconds
};

// Course service endpoints - Supabase Edge Functions
const ENDPOINTS = {
  COURSES: '/getAllPublishedCourse', 
  USER_ENROLLMENTS: (uid: string) => `/getUserEnrollment/${encodeURIComponent(uid)}?includeDetails=true&sortBy=last_activity_at&sortOrder=desc`, 
  COURSE_DETAILS: (courseId: string) => `/getModuleDetail/${encodeURIComponent(courseId)}`, 
  COURSE_REVIEWS: (courseId: string) => `/courseReviewHandler/${encodeURIComponent(courseId)}`, 
  POST_ENROLLMENT: (uid: string) => `/postUserEnrollment/${encodeURIComponent(uid)}`, 
  CATEGORIES: '/categoryHandler',
  RECOMMENDATIONS: '/getRecommendations',
  ML_RECOMMENDATIONS: '/getMLRecommendations',
  RECOMMENDATION_EVENT: '/postRecommendationEvent',
};

// ── ML traffic routing ────────────────────────────────────────────────────────
// Set EXPO_PUBLIC_ML_SPLIT=20 to send 20 % of users to the ML re-ranker.
// Uses the same deterministic hash-bucket approach as the edge function so
// assignment is sticky per userId (same user always gets the same path).
const ML_SPLIT = Number(process.env.EXPO_PUBLIC_ML_SPLIT ?? '0');

const hashToBucket100 = (uid: string): number => {
  // djb2-style hash, matches hashToBucket100 in getRecommendations.ts
  let hash = 2166136261;
  for (let i = 0; i < uid.length; i++) {
    hash ^= uid.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0) % 100;
};

const shouldUseML = (uid: string): boolean => {
  if (ML_SPLIT <= 0) return false;
  return hashToBucket100(uid) < ML_SPLIT;
};

const getRecommendationCacheKey = (userId: string): string =>
  `${CACHE_CONFIG.COURSES_KEY}_recommended_${userId}`;


// Wishlist endpoints - Supabase Edge Functions
const WISHLIST = {
  BASE: (uid: string) => `/wishlistHandler/${encodeURIComponent(uid)}`,
  ITEM: (uid: string, courseId: string) =>
    `/wishlistHandler/${encodeURIComponent(uid)}?courseId=${encodeURIComponent(courseId)}`,
};

export interface CourseListParams {
  limit?: number;
  category?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Types for enrollment response
export interface EnrollmentCourse {
  enrollment_id: string;
  enrollment_date: string;
  completion_date: string | null;
  progress_percentage: number;
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

export interface UpdateReviewPayload {
  userId: string;
  rating: number;
  review: string;
  isAnonymous?: boolean;
}

// Category types
export interface Category {
  id: string;
  name: string;
  color: string;
  course_count: number;
  created_at: string;
}

export interface CategoryApiResponse {
  success: boolean;
  data: Category[];
  meta: {
    timestamp: string;
    count: number;
  };
}

export interface PaginatedCoursesResult {
  courses: Course[];
  pagination: {
    limit: number;
    offset: number;
    totalCount: number;
    hasMore: boolean;
  };
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

const getCoursesCacheKey = (params?: CourseListParams): string => {
  const paramString = params ? JSON.stringify(params) : 'default';
  return `${CACHE_CONFIG.COURSES_KEY}_${paramString}`;
};

const extractCoursesResponse = (response: any): PaginatedCoursesResult => {
  if (!response) {
    throw new Error('No response received from API');
  }

  let coursesArray;
  if (Array.isArray(response.data)) {
    coursesArray = response.data;
  } else if (response.data && response.data.courses && Array.isArray(response.data.courses)) {
    coursesArray = response.data.courses;
  } else if (response.courses && Array.isArray(response.courses)) {
    coursesArray = response.courses;
  } else if (Array.isArray(response)) {
    coursesArray = response;
  } else {
    console.error('Invalid API response structure:', JSON.stringify(response).slice(0, 500));
    throw new Error('Invalid API response: courses array not found');
  }

  return {
    courses: coursesArray.map(convertAWSCourseToAppCourse),
    pagination: {
      limit: Number(response?.pagination?.limit ?? coursesArray.length ?? 0),
      offset: Number(response?.pagination?.offset ?? 0),
      totalCount: Number(response?.pagination?.totalCount ?? coursesArray.length ?? 0),
      hasMore: Boolean(response?.pagination?.hasMore),
    },
  };
};

// Helper function to convert AWS course format to our app format
const convertAWSCourseToAppCourse = (awsCourse: any): Course => {
  // Safety checks
  if (!awsCourse || typeof awsCourse !== 'object') {
    console.warn('Invalid course data:', awsCourse);
    throw new Error('Invalid course data received from API');
  }

  // Calculate duration string from hours
  const durationStr = awsCourse.duration_hours ? `${awsCourse.duration_hours}h` : '0h';
  
  // Generate avatar from instructor name
  const generateAvatar = (name: string): string => {
    if (!name) return 'https://via.placeholder.com/50x50';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=50&background=3B82F6&color=fff`;
  };

  const explicitModules =
    awsCourse.total_sections ??
    awsCourse.sections_count ??
    awsCourse.section_count ??
    awsCourse.modules ??
    awsCourse.module_count ??
    awsCourse.module_total;
  const explicitLessons =
    awsCourse.total_videos ??
    awsCourse.videos_count ??
    awsCourse.video_count ??
    awsCourse.lessons ??
    awsCourse.lesson_count ??
    awsCourse.lesson_total;

  const modulesFromExplicit = Number(explicitModules);
  const lessonsFromExplicit = Number(explicitLessons);
  const durationHours = Number(awsCourse.duration_hours ?? 0);
  const totalRatings = Number(awsCourse.total_ratings ?? awsCourse.totalRatings ?? 0);

  const resolvedModules = Number.isFinite(modulesFromExplicit) && modulesFromExplicit > 0
    ? modulesFromExplicit
    : (Number.isFinite(durationHours) && durationHours > 0 ? Math.floor(durationHours / 2) : 0);
  const resolvedLessons = Number.isFinite(lessonsFromExplicit) && lessonsFromExplicit > 0
    ? lessonsFromExplicit
    : 0;

  const parseRating = (value: unknown): number => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 0;
    if (parsed < 0) return 0;
    if (parsed > 5) return 5;
    return parsed;
  };
  const hasAnyReviewData =
    Number.isFinite(totalRatings) && totalRatings > 0;
  const parsedRating = parseRating(awsCourse.rating);
  const rating = hasAnyReviewData ? parsedRating : 0;

  return {
    id: String(awsCourse.courseid || awsCourse.id || 'unknown'),
    title: awsCourse.title || 'Untitled Course',
    description: awsCourse.description || 'No description available',
    instructor: {
      id: String(awsCourse.instructorid || awsCourse.instructor_id || 'unknown'),
      name: awsCourse.instructor_name || 'Unknown Instructor',
      avatar: generateAvatar(awsCourse.instructor_name || 'Unknown'),
      category: awsCourse.category_name || 'General',
      rating: parseRating(awsCourse.instructor_rating),
      bio: awsCourse.instructor_bio || 'No bio available',
    },
    progress_percentage: awsCourse.progress_percentage,
    // progress: {
    //   completed: 0, // Default values - would come from enrollment data
    //   total: Math.floor((awsCourse.duration_hours || 10) / 2) || 10,
    //   percentage: 0,
    //   lastAccessed: new Date().toISOString(),
    // },
    duration: durationStr,
    rating,
    image:
      awsCourse.thumbnail_url ||
      awsCourse.image ||
      'https://via.placeholder.com/400x250',
    category: awsCourse.category_name || 'General',
    categoryColor: awsCourse.category_color || Colors.categoryDefault,
    modules: resolvedModules,
    lessons: resolvedLessons,
    tags: Array.isArray(awsCourse.tags) ? awsCourse.tags : [],
    prerequisites: [],
    outcomes: [],
    createdAt: awsCourse.created_at || new Date().toISOString(),
    updatedAt: awsCourse.updated_at || new Date().toISOString(),
    isWishlisted: false,
  };
};


/**
 * Fetch all categories from the API
 * @returns Promise<Category[]> - Array of categories
 */
export const getAllCategories = async (): Promise<Category[]> => {
  try {
    // Check cache first
    const cached = await CacheManager.get<Category[]>(CACHE_CONFIG.CATEGORIES_KEY);
    if (cached) {
      return cached;
    }

    // Fetch from API
    const response = await apiService.get<CategoryApiResponse>(ENDPOINTS.CATEGORIES);
    const categories = unwrap<Category[]>(response);

    // Cache the results
    await CacheManager.set(CACHE_CONFIG.CATEGORIES_KEY, categories);

    return categories;
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
};

/**
 * Clear categories cache (useful after category updates)
 */
export const clearCategoriesCache = async (): Promise<void> => {
  await CacheManager.clear(CACHE_CONFIG.CATEGORIES_KEY);
};

// Helper function to convert enrollment data to Course format
const convertEnrollmentToAppCourse = (enrollment: EnrollmentCourse): Course => {
  const normalizedCategory = String(
    enrollment.category_name || (enrollment as any).category || "General",
  ).trim() || "General";

  const normalizedCategoryColor =
    enrollment.category_color ||
    (enrollment as any).categoryColor ||
    Colors.categoryDefault;

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
  
  // Determine which data to use.
  // Keep this module-first to match CourseDetailScreen progress semantics.
  const hasSectionData = totalSections > 0;
  const progressTotal = hasSectionData ? totalSections : totalItems;
  const progressCompleted = hasSectionData ? completedSections : completedItems;

  const numericEnrollmentPercentage = Number(enrollment.progress_percentage);
  const fallbackEnrollmentPercentage = Number.isFinite(numericEnrollmentPercentage)
    ? Math.max(0, Math.min(100, Math.round(numericEnrollmentPercentage)))
    : 0;

  const calculatedPercentage = progressTotal > 0
    ? Math.round((progressCompleted / progressTotal) * 100)
    : fallbackEnrollmentPercentage;

  // If backend marks completion explicitly, enforce 100% to prevent mixed UI states.
  const effectiveProgressPercentage = enrollment.is_completed
    ? 100
    : calculatedPercentage;
  
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

  return {
    id: enrollment.course_id,
    title: enrollment.title,
    description: enrollment.description,
    instructor: {
      id: `instructor-${enrollment.instructor_name.replace(/\s+/g, '-').toLowerCase()}`,
      name: enrollment.instructor_name,
      avatar: enrollment.instructor_avatar || generateAvatar(enrollment.instructor_name),
      category: normalizedCategory,
      rating: Number(enrollment.instructor_rating) || 0,
      bio: `Expert ${normalizedCategory} instructor`,
    },
    progress_percentage: effectiveProgressPercentage,
    duration: `${enrollment.duration_hours}h`,
    rating: Number(enrollment.rating) || 0,
    image: enrollment.thumbnail_url,
    category: normalizedCategory,
    categoryColor: normalizedCategoryColor,
    modules: progressTotal,
    tags: enrollment.tags || [],
    prerequisites: [],
    outcomes: [],
    createdAt: enrollment.enrollment_date,
    updatedAt: enrollment.last_activity_at || enrollment.last_accessed || enrollment.enrollment_date,
    isWishlisted: Boolean(enrollment.is_in_wishlist),
  };
};

class CourseService {
  /**
   * Get all courses
   */
  async getCourses(params?: CourseListParams): Promise<Course[]> {
    try {
      // Check cache first
      const cacheKey = getCoursesCacheKey(params);
      const cachedCourses = await CacheManager.get<Course[]>(cacheKey);
      if (cachedCourses) {
        return cachedCourses;
      }

      // Build query parameters
      const queryParams: Record<string, string> = {};
      queryParams.limit = String(params?.limit ?? 24);
      if (params?.category) queryParams.category = params.category;
      queryParams.sortBy = params?.sortBy ?? 'updated_at';
      queryParams.sortOrder = params?.sortOrder ?? 'desc';

      const response = await apiService.get<any>(
        ENDPOINTS.COURSES,
        queryParams
      );
      const { courses } = extractCoursesResponse(response);

      // Cache the response
      await CacheManager.set(cacheKey, courses);

      return courses;
    } catch (error) {
      console.error('Error fetching courses:', error);
      throw error;
    }
  }

  async getPublishedCoursesPage(
    params?: CourseListParams & { offset?: number }
  ): Promise<PaginatedCoursesResult> {
    const queryParams: Record<string, string> = {
      limit: String(params?.limit ?? 24),
      offset: String(params?.offset ?? 0),
      sortBy: params?.sortBy ?? 'updated_at',
      sortOrder: params?.sortOrder ?? 'desc',
    };

    if (params?.category) queryParams.category = params.category;

    const response = await apiService.get<any>(ENDPOINTS.COURSES, queryParams);
    return extractCoursesResponse(response);
  }

  async clearCoursesCache(params?: CourseListParams): Promise<void> {
    await CacheManager.clear(getCoursesCacheKey(params));
  }

  /**
   * Get user's enrolled courses from the enrollment endpoint
   */
  async getUserEnrollments(userId: string): Promise<Course[]> {
    try {
      userId = userId || DEFAULT_USER_ID;
      if (!userId) throw new Error('Missing userId');
      
      // Always clear cache to ensure fresh data
      const cacheKey = `${CACHE_CONFIG.COURSES_KEY}_enrollments_${userId}`;
      await CacheManager.clear(cacheKey);
      
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
      // Courses are already sorted by last_activity_at (descending) from the API
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
   * Get user's enrolled courses (uses getUserEnrollments for real data)
   * Returns properly sorted courses by last activity
   */
  async getMyCourses(): Promise<Course[]> {
    try {
      const cachedCourses = await CacheManager.get<Course[]>(`${CACHE_CONFIG.COURSES_KEY}_my`);
      if (cachedCourses) {
        return cachedCourses;
      }

      // Use the real enrolled courses from getUserEnrollments
      const uid = DEFAULT_USER_ID;
      if (!uid) throw new Error('Missing EXPO_PUBLIC_DEFAULT_USER_ID');
      const enrolledCourses = await this.getUserEnrollments(uid);

      // Cache the result
      await CacheManager.set(`${CACHE_CONFIG.COURSES_KEY}_my`, enrolledCourses);

      return enrolledCourses;
    } catch (error) {
      console.error('Error fetching my courses:', error);
      throw error;
    }
  }

  /**
   * Get recommended courses (remaining courses after enrolled ones)
   */
  async getRecommendedCourses(userId?: string, preferredCategories?: string[]): Promise<{
    courses: Course[];
    meta: any;
    recommendations: any[];
  }> {
    const uid = userId || DEFAULT_USER_ID;

    try {
      if (!uid) {
        return { courses: [], meta: {}, recommendations: [] };
      }
      const cacheKey = getRecommendationCacheKey(uid);
      const cached = await CacheManager.get<{
        courses: Course[];
        meta: any;
        recommendations: any[];
      }>(cacheKey);
      if (cached) {
        return cached;
      }

      const useML = shouldUseML(uid);
      const recoEndpoint = useML ? ENDPOINTS.ML_RECOMMENDATIONS : ENDPOINTS.RECOMMENDATIONS;

      const params: Record<string, string> = {
        userId: uid,
        limit: '8',
        placement: 'home',
        // Pass local time so context-factors (evening boost, weekend explore) work correctly
        localHour: String(new Date().getHours()),
        dayOfWeek: String(new Date().getDay()),
      };
      // Cold-start: seed category affinity from onboarding selections when the
      // user has no behavioral history yet. Ignored by the backend once real
      // events exist (categoryAffinityRaw will be non-empty from enrollment data).
      if (preferredCategories && preferredCategories.length > 0) {
        params.preferredCategories = preferredCategories.join(',');
      }

      const resp = await apiService.get<any>(recoEndpoint, params);

      const recommendations =
        resp?.data?.recommendations ??
        resp?.recommendations ??
        resp?.recommendations ??
        [];
      const meta = resp?.meta ??
        resp?.data?.data?.meta ??
        resp?.data?.meta ??
        resp?.meta ??
        {};
      const sorted = Array.isArray(recommendations)
        ? [...recommendations]
            .sort((a, b) => {
              const sa = Number(a.score ?? a.recommendation_score ?? 0);
              const sb = Number(b.score ?? b.recommendation_score ?? 0);
              if (sb !== sa) return sb - sa;
              const ra = Number(a.rank ?? a.recommendation_rank ?? Infinity);
              const rb = Number(b.rank ?? b.recommendation_rank ?? Infinity);
              return ra - rb;
            })
        : [];

      const courses = sorted.map((r: any) => {
        const coursePayload = r?.course || r;
        let course = coursePayload;
        if (typeof course === 'string') {
          try {
            course = JSON.parse(course);
          } catch {
            course = null;
          }
        }
        if (!course || typeof course !== 'object') {
          return null;
        }
        return {
          ...(convertAWSCourseToAppCourse(course) || course),
          primary_reason_tag: r.primary_reason_tag ?? null,
          recommendationPrimaryTag: r.primary_reason_tag ?? null,
          // ml_score is 0-1 probability — scale to 0-10 to match rule-based score display
          // fall back to r.score (rule-based 0-10) if ml_score not present
          recommendationScore: Number.isFinite(Number(r.ml_score))
            ? Number((r.ml_score * 10).toFixed(1))
            : Number.isFinite(Number(r.score))
              ? Number(Number(r.score).toFixed(1))
              : null,
          recommendationRank: Number.isFinite(Number(r.rank)) ? Number(r.rank) : null,
          recommendationRequestId: r.context?.requestId ?? meta?.request_id ?? null,
          recommendationModelVersion: r.context?.modelVersion ?? meta?.model_version ?? null,
          score_breakdown: r.score_breakdown ?? null,
        };
      }).filter(Boolean) as Course[];

      const result = { courses, meta, recommendations: sorted };
      await CacheManager.set(cacheKey, result);
      return result;
    } catch (error) {
      console.warn('Error fetching recommended courses, falling back to empty list:', error);
      const cacheKey = getRecommendationCacheKey(uid);
      const cached = await CacheManager.get<{
        courses: Course[];
        meta: any;
        recommendations: any[];
      }>(cacheKey);
      return cached ?? { courses: [], meta: {}, recommendations: [] };
    }
  }

  async clearRecommendationCache(userId?: string): Promise<void> {
    if (!userId) return;
    await CacheManager.clear(getRecommendationCacheKey(userId));
  }

async getWishlist(userId: string): Promise<Course[]> {
  if (!userId) userId = DEFAULT_USER_ID;
  if (!userId) throw new Error('Missing userId');
  const cacheKey = `${CACHE_CONFIG.COURSES_KEY}_wishlist_v2_${userId}`;
  const cached = await CacheManager.get<Course[]>(cacheKey);
  if (cached) return cached;

  const resp = await apiService.get<any>(WISHLIST.BASE(userId), { userId });
  const array = resp?.courses ?? resp?.data?.courses ?? [];
  const courses = array.map(convertAWSCourseToAppCourse);
  await CacheManager.set(cacheKey, courses);
  return courses;
}

async addToWishlist(userId: string, courseId: string): Promise<void> {
  if (!userId) userId = DEFAULT_USER_ID;
  if (!userId) throw new Error('Missing userId');
  if (!courseId) throw new Error('Missing courseId');
  await apiService.post(WISHLIST.ITEM(userId , courseId), { userId, courseId });
  await CacheManager.clear(`${CACHE_CONFIG.COURSES_KEY}_wishlist_v2_${userId}`);
}

async removeFromWishlist(userId: string, courseId: string): Promise<void> {
  if (!userId) userId = DEFAULT_USER_ID;
  if (!userId) throw new Error('Missing userId');
  if (!courseId) throw new Error('Missing courseId');
  await apiService.delete(WISHLIST.ITEM(userId, courseId));
  await CacheManager.clear(`${CACHE_CONFIG.COURSES_KEY}_wishlist_v2_${userId}`);
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
      const recommendationCacheKeys = [
        CACHE_CONFIG.COURSES_KEY,
        `${CACHE_CONFIG.COURSES_KEY}_my`,
        `${CACHE_CONFIG.COURSES_KEY}_recommended`,
      ];
      if (DEFAULT_USER_ID) {
        recommendationCacheKeys.push(
          getRecommendationCacheKey(DEFAULT_USER_ID)
        );
      }

      await Promise.all([
        ...recommendationCacheKeys.map((key) => CacheManager.clear(key)),
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
      CacheManager.get(
        getRecommendationCacheKey(DEFAULT_USER_ID || "")
      ),
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
    if (!uid) throw new Error('Missing userId');
    const enrolledCourses = await this.getUserEnrollments(uid);
    return enrolledCourses.some(c => String(c.id) === String(courseId));
  }

  /**
   * Enroll user in course (free courses).
   * POST /postUserEnrollment with { userId, courseId }
   * Maps to postUserEnrollment.mjs Lambda function
   * Expects idempotent server (409 if already enrolled).
   */
  async enrollInCourse(userId: string, courseId: string): Promise<{ firstModuleId?: string; creditsAwarded?: number }> {
    // if (!userId || !courseId) throw new Error('Missing userId/courseId');
    const uid = userId || DEFAULT_USER_ID;
    if (!uid) throw new Error('Missing userId');

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
    const creditsAwarded: number | undefined =
      resp?.data?.creditsAwarded ?? undefined;

    if (apiFirst) return { firstModuleId: apiFirst, creditsAwarded };

    try {
      const detail =
        await (await import('./courseDetailService'))
          .courseDetailService.getCourseDetail(courseId);

      const derived: string | undefined = detail?.modules?.[0]?.id || undefined;
      return derived ? { firstModuleId: derived, creditsAwarded } : { creditsAwarded };
    } catch {
      return { creditsAwarded };
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

      const userId = payload.userId || DEFAULT_USER_ID;
      if (!userId) throw new Error('Missing userId');

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
    const userId = payload.userId || DEFAULT_USER_ID;
    if (!userId) throw new Error('Missing userId');
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
    eventType: 'impression' | 'view' | 'click' | 'start' | 'complete' | 'dismiss' | 'save' | 'wishlist' | 'enroll';
    context?: Record<string, any>;
    requestId?: string;
  }): Promise<void> {
    const resolvedUserId = payload.userId || DEFAULT_USER_ID;
    if (!resolvedUserId) return;
    await this.postRecommendationEvent({
      userId: resolvedUserId,
      courseId: payload.courseId || '',
      eventType: payload.eventType,
      placement: 'home',
      context: {
        ...(payload.context || {}),
        ...(payload.requestId ? { requestId: payload.requestId } : {}),
      },
    });
  }

  async postRecommendationEvent(payload: {
    userId: string;
    courseId: string;
    eventType: string;
    placement?: string;
    context?: Record<string, unknown>;
  }): Promise<void> {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey || !payload.userId || !payload.courseId) {
      return;
    }

    const body = {
      userId: payload.userId,
      courseId: payload.courseId,
      eventType: payload.eventType,
      placement: payload.placement ?? 'home',
      context: payload.context ?? {},
    };

    try {
      await fetch(`${supabaseUrl}/functions/v1${ENDPOINTS.RECOMMENDATION_EVENT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
          'apikey': anonKey,
        },
        body: JSON.stringify(body),
      });
      if (payload.userId && payload.userId !== 'anon') {
        await CacheManager.clear(getRecommendationCacheKey(payload.userId));
      }
    } catch (err) {
      console.warn('rec_event_fail', {
        eventType: body.eventType,
        courseId: body.courseId,
        placement: body.placement,
        error: (err as any)?.message || err,
      });
      throw err;
    }
  }

}

// Export singleton instance
export const courseService = new CourseService();
export default courseService;
