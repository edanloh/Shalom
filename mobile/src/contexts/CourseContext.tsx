import React, { createContext, useContext, useState, useEffect } from 'react';
import { Course } from '../types';
import courseService from '../services/courseService';
import { useUser } from './UserContext';
import { showToast } from '@/components/common/Toast';

interface CourseContextType {
  // All courses
  courses: Course[];
  loading: boolean;
  error: string | null;
  refreshCourses: () => Promise<void>;
  
  // My courses (enrolled)
  myCourses: Course[];
  myCoursesLoading: boolean;
  myCoursesError: string | null;
  refreshMyCourses: () => Promise<void>;
  
  // Recommended courses
  recommendedCourses: Course[];
  recommendedLoading: boolean;
  recommendedError: string | null;
  refreshRecommended: () => Promise<void>;
  
  // Search and filter functions
  searchCourses: (query: string) => Course[];
  getCoursesByCategory: (category: string) => Course[];
  getCourse: (courseId: string) => Course | undefined;

  // Wishlist
  wishlist: Course[];
  wishlistLoading: boolean;
  wishlistError: string | null;
  refreshWishlist: () => Promise<void>;
  toggleWishlist: (course: Course) => Promise<void>;
  isWishlisted: (courseId: string) => boolean;
}

const CourseContext = createContext<CourseContextType | undefined>(undefined);

export default function CourseProvider({ children }: { children: React.ReactNode }) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [myCourses, setMyCourses] = useState<Course[]>([]);
  const [myCoursesLoading, setMyCoursesLoading] = useState(false);
  const [myCoursesError, setMyCoursesError] = useState<string | null>(null);

  const [recommendedCourses, setRecommendedCourses] = useState<Course[]>([]);
  const [recommendedLoading, setRecommendedLoading] = useState(false);
  const [recommendedError, setRecommendedError] = useState<string | null>(null);

  const [wishlist, setWishlist] = useState<Course[]>([]);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [wishlistError, setWishlistError] = useState<string | null>(null);

  const { user: profileUser } = useUser();
  const dbUserId = profileUser?.uuid;

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    if (dbUserId) {
      loadMyCourses();
      loadRecommendedCourses();
    }
  }, [dbUserId]);

  useEffect(() => {
    if (dbUserId) refreshWishlist();
  }, [dbUserId]);

  const loadCourses = async () => {
    if (loading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const coursesData = await courseService.getCourses();
      setCourses(coursesData);
    } catch (err) {
      console.error('CourseContext: Error loading courses:', err);
      setError(err instanceof Error ? err.message : 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const loadMyCourses = async () => {
    if (!dbUserId || myCoursesLoading) return;
    
    setMyCoursesLoading(true);
    setMyCoursesError(null);
    
    try {
      const myCoursesData = await courseService.getUserEnrollments(dbUserId);
      console.log('CourseContext: Loaded', myCoursesData.length, 'my courses');
      setMyCourses(myCoursesData);
    } catch (err) {
      console.error('CourseContext: Error loading my courses:', err);
      setMyCoursesError(err instanceof Error ? err.message : 'Failed to load my courses');
    } finally {
      setMyCoursesLoading(false);
    }
  };

  const loadRecommendedCourses = async () => {
    if (recommendedLoading) return;
    
    setRecommendedLoading(true);
    setRecommendedError(null);
    
    try {
      console.log('CourseContext: Loading recommended courses...');
      const recommendedData = await courseService.getRecommendedCourses(dbUserId);
      setRecommendedCourses(recommendedData);
    } catch (err) {
      console.error('CourseContext: Error loading recommended courses:', err);
      setRecommendedError(err instanceof Error ? err.message : 'Failed to load recommended courses');
    } finally {
      setRecommendedLoading(false);
    }
  };

  const refreshCourses = async () => {
    await loadCourses();
  };

  const refreshMyCourses = async () => {
    await loadMyCourses();
  };

  const refreshRecommended = async () => {
    await loadRecommendedCourses();
  };

  const searchCourses = (query: string): Course[] => {
    if (!query.trim()) return courses;
    
    const queryLower = query.toLowerCase();
    return courses.filter(course => 
      course.title.toLowerCase().includes(queryLower) ||
      course.description.toLowerCase().includes(queryLower) ||
      course.category.toLowerCase().includes(queryLower) ||
      course.instructor.name.toLowerCase().includes(queryLower)
    );
  };

  const getCoursesByCategory = (category: string): Course[] => {
    return courses.filter(course => 
      course.category.toLowerCase() === category.toLowerCase()
    );
  };

  const getCourse = (courseId: string): Course | undefined => {
    return courses.find(course => course.id === courseId);
  };
  
  const refreshWishlist = async () => {
    if (!dbUserId) return;
    try {
      setWishlistLoading(true);
      setWishlistError(null);
      const items = await courseService.getWishlist(dbUserId);
      setWishlist(items);
    } catch (e: any) {
      setWishlistError(e?.message ?? 'Failed to load wishlist');
    } finally {
      setWishlistLoading(false);
    }
  };

  const isWishlisted = (courseId: string) =>
    wishlist.some(c => c.id === courseId);

  // keep UI consistent across lists
  const setFlagInLists = (courseId: string, flag: boolean) => {
    setCourses(prev => prev.map(c => c.id === courseId ? { ...c, isWishlisted: flag } : c));
    setMyCourses(prev => prev.map(c => c.id === courseId ? { ...c, isWishlisted: flag } : c));
    setRecommendedCourses(prev => prev.map(c => c.id === courseId ? { ...c, isWishlisted: flag } : c));
  };

  const toggleWishlist = async (course: Course) => {
    if (!dbUserId) return;
    const id = course.id;
    const currently = isWishlisted(id);

    // optimistic UI
    if (currently) {
      setWishlist(prev => prev.filter(c => c.id !== id));
      setFlagInLists(id, false);
    } else {
      setWishlist(prev => [{ ...course, isWishlisted: true }, ...prev]);
      setFlagInLists(id, true);
    }

    try {
      if (currently) {
        await courseService.removeFromWishlist(dbUserId, id);
        showToast({
          type: 'success',
          title: 'Removed from wishlist',
          message: course.title || 'Course removed',
          durationMs: 1800,
        });
      } else {
        await courseService.addToWishlist(dbUserId, id);
        showToast({
          type: 'success',
          title: 'Added to wishlist',
          message: course.title || 'Course saved',
          durationMs: 1800,
        });
      }
    } catch (e) {
      // rollback on failure
      if (currently) {
        setWishlist(prev => [{ ...course, isWishlisted: true }, ...prev]);
        setFlagInLists(id, true);
      } else {
        setWishlist(prev => prev.filter(c => c.id !== id));
        setFlagInLists(id, false);
      }
      setWishlistError((e as Error)?.message ?? 'Failed to update wishlist');
      showToast({
        type: 'error',
        title: 'Wishlist update failed',
        message: (e as Error)?.message ?? 'Please try again.',
        durationMs: 2200,
      });
    }
  };

  return (
    <CourseContext.Provider value={{
      courses,
      loading,
      error,
      refreshCourses,
      
      myCourses,
      myCoursesLoading,
      myCoursesError,
      refreshMyCourses,
      
      recommendedCourses,
      recommendedLoading,
      recommendedError,
      refreshRecommended,
      
      searchCourses,
      getCoursesByCategory,
      getCourse,

      wishlist,
      wishlistLoading,
      wishlistError,
      refreshWishlist,
      toggleWishlist,
      isWishlisted,

    }}>
      {children}
    </CourseContext.Provider>
  );
};

export const useCourses = () => {
  const context = useContext(CourseContext);
  if (!context) {
    throw new Error('useCourses must be used within a CourseProvider');
  }
  return context;
};
