/**
 * Custom React Hooks for Course Management
 * Updated to work with AWS API Gateway
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Course } from '../types';
import courseService, { CourseListParams } from '../services/courseService';
import { ApiError, NetworkError, TimeoutError } from '../services/apiService';
import { useAuth } from '../contexts/AuthContext';

// Hook return types
export interface UseCoursesReturn {
  courses: Course[];
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  refresh: () => Promise<void>;
  retry: () => Promise<void>;
}

export interface UseMyCOursesReturn {
  courses: Course[];
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  refresh: () => Promise<void>;
  retry: () => Promise<void>;
}

export interface UseCourseDetailReturn {
  course: Course | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  retry: () => Promise<void>;
}

// Error message helper
const getErrorMessage = (error: any): string => {
  if (error instanceof NetworkError) {
    return 'Network connection failed. Please check your internet connection.';
  }
  if (error instanceof TimeoutError) {
    return 'Request timed out. Please try again.';
  }
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'UNAUTHORIZED':
        return 'Please log in to continue.';
      case 'FORBIDDEN':
        return 'You don\'t have permission to access this content.';
      case 'NOT_FOUND':
        return 'The requested content was not found.';
      case 'RATE_LIMIT':
        return 'Too many requests. Please wait a moment and try again.';
      case 'SERVER_ERROR':
        return 'Server error. Please try again later.';
      default:
        return error.message || 'An unexpected error occurred.';
    }
  }
  return error?.message || 'An unexpected error occurred.';
};

/**
 * Hook for fetching and managing courses list
 */
export const useCourses = (params?: CourseListParams): UseCoursesReturn => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const paramsRef = useRef(params);
  const isMountedRef = useRef(true);

  // Update params ref when params change
  useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchCourses = useCallback(async () => {
    try {
      console.log('Fetching courses with params:', paramsRef.current);
      const coursesData = await courseService.getCourses(paramsRef.current);
      
      if (!isMountedRef.current) return;

      console.log('Fetched courses:', coursesData.length);
      setCourses(coursesData);
      setError(null);
    } catch (err) {
      if (!isMountedRef.current) return;
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      console.error('Error fetching courses:', err);
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await fetchCourses();
    setRefreshing(false);
  }, [fetchCourses]);

  const retry = useCallback(async () => {
    setError(null);
    await refresh();
  }, [refresh]);

  // Initial load
  useEffect(() => {
    setLoading(true);
    fetchCourses().finally(() => setLoading(false));
  }, [fetchCourses]);

  return {
    courses,
    loading,
    error,
    refreshing,
    refresh,
    retry,
  };
};

/**
 * Hook for fetching and managing user's enrolled courses
 */
export const useMyCourses = (): UseMyCOursesReturn => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchMyCourses = useCallback(async () => {
    console.log('useMyCourses - fetchMyCourses called, user:', user);
    
    if (!user?.id) {
      console.log('useMyCourses - No user ID available, skipping enrollment fetch');
      return;
    }

    console.log('useMyCourses - Fetching enrollments for user ID:', user.id);

    try {
      console.log('useMyCourses - Calling courseService.getUserEnrollments...');
      // Use the new enrollment endpoint with user ID
      const coursesData = await courseService.getUserEnrollments(user.id);
      
      if (!isMountedRef.current) return;
      
      console.log('useMyCourses - Received courses data:', coursesData.length);
      console.log('useMyCourses - Course titles:', coursesData.map(c => c.title));
      setCourses(coursesData);
      setError(null);
    } catch (err) {
      if (!isMountedRef.current) return;
      const errorMessage = getErrorMessage(err);
      console.error('useMyCourses - Error fetching courses:', err);
      setError(errorMessage);
    }
  }, [user?.id]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMyCourses();
    setRefreshing(false);
  }, [fetchMyCourses]);

  const retry = useCallback(async () => {
    setError(null);
    await refresh();
  }, [refresh]);

  // Initial load
  useEffect(() => {
    setLoading(true);
    fetchMyCourses().finally(() => setLoading(false));
  }, [fetchMyCourses]);

  return {
    courses,
    loading,
    error,
    refreshing,
    refresh,
    retry,
  };
};

/**
 * Hook for fetching suggested courses
 */
export const useSuggestedCourses = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchSuggestedCourses = useCallback(async () => {
    try {
      console.log('Fetching suggested courses...');
      const coursesData = await courseService.getSuggestedCourses();
      
      if (!isMountedRef.current) return;
      
      console.log('Fetched suggested courses:', coursesData.length);
      setCourses(coursesData);
      setError(null);
    } catch (err) {
      if (!isMountedRef.current) return;
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      console.error('Error fetching suggested courses:', err);
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchSuggestedCourses();
    setLoading(false);
  }, [fetchSuggestedCourses]);

  // Initial load
  useEffect(() => {
    setLoading(true);
    fetchSuggestedCourses().finally(() => setLoading(false));
  }, [fetchSuggestedCourses]);

  return {
    courses,
    loading,
    error,
    refresh,
  };
};

/**
 * Hook for course detail
 */
export const useCourseDetail = (courseId: string): UseCourseDetailReturn => {
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchCourseDetail = useCallback(async () => {
    if (!courseId) return;
    
    try {
      console.log('Fetching course detail for:', courseId);
      const courseData = await courseService.getCourseById(courseId);
      
      if (!isMountedRef.current) return;
      
      setCourse(courseData);
      setError(null);
    } catch (err) {
      if (!isMountedRef.current) return;
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      console.error('Error fetching course detail:', err);
    }
  }, [courseId]);

  const refresh = useCallback(async () => {
    setError(null);
    await fetchCourseDetail();
  }, [fetchCourseDetail]);

  const retry = useCallback(async () => {
    await refresh();
  }, [refresh]);

  // Initial load
  useEffect(() => {
    setLoading(true);
    fetchCourseDetail().finally(() => setLoading(false));
  }, [fetchCourseDetail]);

  return {
    course,
    loading,
    error,
    refresh,
    retry,
  };
};

/**
 * Hook for searching courses
 */
export const useSearchCourses = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const search = useCallback(async (query: string) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Searching courses with query:', query);
      const coursesData = await courseService.searchCourses(query);
      setCourses(coursesData);
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      console.error('Error searching courses:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearSearch = useCallback(() => {
    setCourses([]);
    setError(null);
  }, []);

  return {
    courses,
    loading,
    error,
    search,
    clearSearch,
  };
};
