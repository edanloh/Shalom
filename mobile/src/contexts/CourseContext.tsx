import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Course } from '../types';
import courseService from '../services/courseService';
import { useUser } from './UserContext';
import { showToast } from '@/components/common/Toast';

export const PREFERRED_CATEGORIES_KEY = 'preferred_categories';

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

  // Recommendation event tracking
  // Call this whenever the user clicks, dismisses, or starts a recommended course.
  // It automatically attaches the score_breakdown so evaluate.py can use real data.
  recordRecommendationEvent: (
    courseId: string,
    eventType: 'click' | 'dismiss' | 'start' | 'enroll' | 'complete' | 'wishlist' | 'save' | 'impression' | 'view',
    placement?: string,
  ) => Promise<void>;
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

  // Stores score_breakdown + requestId + rank keyed by course_id.
  // Using a ref (not state) because it doesn't affect rendering.
  const recommendationMetaRef = useRef<Map<string, { score_breakdown: Record<string, number>; requestId: string | null; modelVersion: string | null; rank: number | null }>>(new Map());

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
    await courseService.clearRecommendationCache(dbUserId);
    
    setRecommendedLoading(true);
    setRecommendedError(null);
    
    try {
      // Read preferred categories saved during onboarding interest selection.
      // Passed to the backend to seed cold-start affinity when the user has no history.
      let preferredCategories: string[] = [];
      if (dbUserId) {
        try {
          const raw = await AsyncStorage.getItem(`${PREFERRED_CATEGORIES_KEY}_${dbUserId}`);
          if (raw) preferredCategories = JSON.parse(raw);
        } catch {}
      }

      // getRecommendedCourses now returns { courses, meta } — see courseService patch
      const result = await courseService.getRecommendedCourses(dbUserId, preferredCategories.length ? preferredCategories : undefined);
      const coursesData: Course[] = Array.isArray(result) ? result : result.courses ?? [];
      const meta = Array.isArray(result) ? null : result.meta;

      setRecommendedCourses(coursesData);

      // ── Populate the score_breakdown lookup map ──────────────────────────
      // Key the map off course.id from coursesData, NOT off raw API rec objects.
      // courseService.getRecommendedCourses already attaches score_breakdown to
      // each Course using the same ID produced by convertAWSCourseToAppCourse,
      // so lookups in recordRecommendationEvent will always match.
      //
      // Previous approach keyed off rec.course?.id / rec.id (raw API fields).
      // That caused silent mismatches when the API returns `courseid` instead of
      // `id`, leaving every event with score_breakdown: null in Supabase.
      const requestId = meta?.request_id ?? null;
      const modelVersion = meta?.model_version ?? null;
      const newMap = new Map<string, {
        score_breakdown: Record<string, number>;
        requestId: string | null;
        modelVersion: string | null;
        rank: number | null;
      }>();
      for (const course of coursesData) {
        const breakdown = (course as any).score_breakdown as Record<string, number> | null;
        if (course.id && breakdown) {
          // Prefer meta-level requestId/modelVersion (same for all courses in one request).
          // Fall back to per-course fields that courseService attaches from the raw rec object
          // in case meta is missing or the response came from a cached/partial path.
          const courseAny = course as any;
          newMap.set(course.id, {
            score_breakdown: breakdown,
            requestId: requestId ?? courseAny.recommendationRequestId ?? null,
            modelVersion: modelVersion ?? courseAny.recommendationModelVersion ?? null,
            // rank: position in the recommendation list — logged with impression events
            // so train_reranker.py can apply inverse propensity scoring (IPS).
            rank: typeof courseAny.recommendationRank === 'number' ? courseAny.recommendationRank : null,
          });
        }
      }
      if (__DEV__) {
        const missing = coursesData.filter(c => !(c as any).score_breakdown).length;
        if (missing > 0) {
          console.warn(
            `CourseContext: ${missing}/${coursesData.length} recommended courses have no score_breakdown.` +
            ` Impression events for those courses will log null breakdown.` +
            ` Check that getRecommendations returns score_breakdown on every candidate.`
          );
        }
      }
      recommendationMetaRef.current = newMap;

      // ── Post impression events ───────────────────────────────────────────
      if (dbUserId && coursesData.length > 0) {
        const impressionPromises = coursesData.map(course => {
          const recMeta = recommendationMetaRef.current.get(course.id);
          return courseService.postRecommendationEvent({
            userId: dbUserId,
            courseId: course.id,
            eventType: 'impression',
            placement: 'home',
            context: {
              requestId: recMeta?.requestId ?? null,
              modelVersion: recMeta?.modelVersion ?? null,
              score_breakdown: recMeta?.score_breakdown ?? null,
              // rank is required by train_reranker.py for position-bias correction (IPS).
              // Without it, IPS falls back to uniform weights silently.
              rank: recMeta?.rank ?? null,
            },
          }).catch(() => {});
        });
        await Promise.allSettled(impressionPromises);
      }
    } catch (err) {
      console.error('CourseContext: Error loading recommended courses:', err);
      setRecommendedError(err instanceof Error ? err.message : 'Failed to load recommended courses');
    } finally {
      setRecommendedLoading(false);
    }
  };

  const refreshCourses = async () => {
    await courseService.clearCoursesCache();
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
    const id = course?.id;
    if (!id) {
      setWishlistError('Course ID is missing');
      showToast({
        type: 'error',
        title: 'Wishlist update failed',
        message: 'This course is missing an ID.',
        durationMs: 2200,
      });
      return;
    }
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
          notificationType: 'wishlist',
        });
      } else {
        await courseService.addToWishlist(dbUserId, id);
        showToast({
          type: 'success',
          title: 'Added to wishlist',
          message: course.title || 'Course saved',
          durationMs: 1800,
          notificationType: 'wishlist',
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

  // Posts any recommendation event with score_breakdown automatically attached.
  // Use this everywhere instead of calling postRecommendationEvent directly.
  const recordRecommendationEvent = async (
    courseId: string,
    eventType: 'click' | 'dismiss' | 'start' | 'enroll' | 'complete' | 'wishlist' | 'save' | 'impression' | 'view',
    placement = 'home',
  ) => {
    if (!dbUserId) return;
    const recMeta = recommendationMetaRef.current.get(courseId);
    await courseService.postRecommendationEvent({
      userId: dbUserId,
      courseId,
      eventType,
      placement,
      context: {
        requestId: recMeta?.requestId ?? null,
        modelVersion: recMeta?.modelVersion ?? null,
        score_breakdown: recMeta?.score_breakdown ?? null,
        rank: recMeta?.rank ?? null,
      },
    }).catch(() => {}); // silent — don't break user flow over a tracking call
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
      recordRecommendationEvent,

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
