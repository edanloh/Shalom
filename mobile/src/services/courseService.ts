/**
 * Course Service - Handles all course-related API calls
 * Updated to work with AWS API Gateway endpoint
 */

import { Course, AWSApiResponse, AWSCoursesResponse, AWSCourse } from '../types';
import apiService from './apiService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Cache configuration
const CACHE_CONFIG = {
  COURSES_KEY: 'cached_courses',
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes in milliseconds
};

// Course service endpoints
const ENDPOINTS = {
  COURSES: '/courses',
  USER_ENROLLMENTS: '/courses/enrollment',
};

// Wishlist endpoints
const WISHLIST = {
  BASE: (uid: string) => `/users/${encodeURIComponent(uid)}/wishlist`,
  ITEM: (uid: string, courseId: string) =>
    `/users/${encodeURIComponent(uid)}/wishlist/${encodeURIComponent(courseId)}`,
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

// Cache utility functions
class CacheManager {
  static async get<T>(key: string): Promise<T | null> {
    try {
      const cachedData = await AsyncStorage.getItem(key);
      if (!cachedData) return null;

      const { data, timestamp } = JSON.parse(cachedData);
      const now = Date.now();

      // Check if cache is still valid
      if (now - timestamp > CACHE_CONFIG.CACHE_DURATION) {
        await AsyncStorage.removeItem(key);
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
      await AsyncStorage.setItem(key, JSON.stringify(cacheData));
    } catch (error) {
      console.warn(`Cache write error for key ${key}:`, error);
    }
  }

  static async clear(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
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
    image: awsCourse.thumbnail_url || 'https://via.placeholder.com/400x250',
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
const convertEnrollmentToAppCourse = (enrollment: EnrollmentCourse): Course => {
  // Generate avatar from instructor name
  const generateAvatar = (name: string): string => {
    if (!name) return 'https://via.placeholder.com/50x50';
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

  // Calculate modules from duration
  const totalModules = Math.floor(enrollment.duration_hours / 2) || 10;
  const completedModules = Math.floor((totalModules * parseFloat(enrollment.progress_percentage)) / 100);

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
      completed: completedModules,
      total: totalModules,
      percentage: Math.round(parseFloat(enrollment.progress_percentage)),
      lastAccessed: enrollment.last_accessed,
    },
    duration: `${enrollment.duration_hours}h`,
    rating: parseFloat(enrollment.rating),
    image: enrollment.thumbnail_url,
    category: enrollment.category_name,
    level: mapLevel(enrollment.level),
    modules: totalModules,
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
        console.log('Returning cached courses');
        return cachedCourses;
      }

      console.log('Fetching courses from API...');
      
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

      console.log('API Response:', response);

      // Safety check: ensure response exists
      if (!response) {
        throw new Error('No response received from API');
      }

      // The response structure is: { courses: [...], pagination: {...}, filters: {...}, meta: {...} }
      // Check if courses array exists directly on response (parsed by apiService from data)
      let coursesArray;
      if (response.courses && Array.isArray(response.courses)) {
        coursesArray = response.courses;
      } else if (response.data && response.data.courses && Array.isArray(response.data.courses)) {
        coursesArray = response.data.courses;
      } else {
        console.error('Invalid API response structure:', response);
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
      // REMOVE LATER - Temporary override for testing
      userId = '550e8400-e29b-41d4-a716-446655440101'; // Temporary override for testing
      console.log('getUserEnrollments - Starting fetch for user ID:', userId);
      
      // For testing, skip cache and always fetch fresh data
      const cacheKey = `${CACHE_CONFIG.COURSES_KEY}_enrollments_${userId}`;
      await CacheManager.clear(cacheKey);
      
      /*
      // Check cache first
      const cachedEnrollments = await CacheManager.get<Course[]>(cacheKey);
      if (cachedEnrollments) {
        console.log('getUserEnrollments - Returning cached user enrollments:', cachedEnrollments.length);
        return cachedEnrollments;
      }
      */
      
      const response = await apiService.get<EnrollmentResponse>(
        `${ENDPOINTS.USER_ENROLLMENTS}/${userId}`
      );

      // Extract enrollments from response
      const enrollmentsData = response.data?.enrollments || [];
      
      if (!Array.isArray(enrollmentsData)) {
        console.error('getUserEnrollments - Invalid enrollment response structure:', response);
        throw new Error('Invalid enrollment response: enrollments array not found');
      }

      // Convert enrollment format to our app Course format
      const courses = enrollmentsData.map(convertEnrollmentToAppCourse);
      console.log('getUserEnrollments - Course titles:', courses.map(c => c.title));

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
   * Get suggested courses (remaining courses after enrolled ones)
   */
  async getSuggestedCourses(): Promise<Course[]> {
    try {
      // Check cache first
      const cachedCourses = await CacheManager.get<Course[]>(`${CACHE_CONFIG.COURSES_KEY}_suggested`);
      if (cachedCourses) {
        return cachedCourses;
      }

      // Get all courses and return remaining as suggested
      const allCourses = await this.getCourses();
      if (!allCourses || allCourses.length === 0) {
        return [];
      }

      // For demo: return courses starting from index 2
      const suggestedCourses = allCourses.slice(2);

      // Cache the filtered courses
      await CacheManager.set(`${CACHE_CONFIG.COURSES_KEY}_suggested`, suggestedCourses);

      return suggestedCourses;
    } catch (error) {
      console.error('Error fetching suggested courses:', error);
      throw error;
    }
  }

async getWishlist(userId: string): Promise<Course[]> {
  if (!userId) throw new Error('Missing userId');
  const cacheKey = `${CACHE_CONFIG.COURSES_KEY}_wishlist_${userId}`;
  const cached = await CacheManager.get<Course[]>(cacheKey);
  if (cached) return cached;

  const resp = await apiService.get<any>(WISHLIST.BASE(userId));
  const array = resp?.courses ?? resp?.data?.courses ?? [];
  const courses = array.map(convertAWSCourseToAppCourse);
  await CacheManager.set(cacheKey, courses);
  return courses;
}

async addToWishlist(userId: string, courseId: string): Promise<void> {
  if (!userId || !courseId) throw new Error('Missing userId/courseId');
  await apiService.post(WISHLIST.BASE(userId), { courseId });
  await CacheManager.clear(`${CACHE_CONFIG.COURSES_KEY}_wishlist_${userId}`);
}

async removeFromWishlist(userId: string, courseId: string): Promise<void> {
  if (!userId || !courseId) throw new Error('Missing userId/courseId');
  await apiService.delete(WISHLIST.ITEM(userId, courseId));
  await CacheManager.clear(`${CACHE_CONFIG.COURSES_KEY}_wishlist_${userId}`);
}

  /**
   * Get detailed information for a specific course
   */
  async getCourseById(courseId: string): Promise<Course | null> {
    console.log('Fetching course by ID:', courseId);
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
        CacheManager.clear(`${CACHE_CONFIG.COURSES_KEY}_suggested`),
      ]);
      
      // Pre-load essential data
      await Promise.all([
        this.getCourses(),
        this.getMyCourses(),
        this.getSuggestedCourses(),
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
    suggestedCourses: boolean;
  }> {
    const [courses, myCourses, suggestedCourses] = await Promise.all([
      CacheManager.get(CACHE_CONFIG.COURSES_KEY),
      CacheManager.get(`${CACHE_CONFIG.COURSES_KEY}_my`),
      CacheManager.get(`${CACHE_CONFIG.COURSES_KEY}_suggested`),
    ]);

    return {
      courses: courses !== null,
      myCourses: myCourses !== null,
      suggestedCourses: suggestedCourses !== null,
    };
  }
}

// Export singleton instance
export const courseService = new CourseService();
export default courseService;