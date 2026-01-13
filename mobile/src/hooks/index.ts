/**
 * Hooks Index
 * Export all custom hooks for easy importing
 * 
 * Note: For general course management, use useCourses from '../contexts/CourseContext'
 * These hooks are for specialized functionality not covered by the context
 */

export {
  useCourseDetail,
  useSearchCourses,
  type UseCourseDetailReturn,
  // Legacy exports (deprecated - use CourseContext instead)
  useCourses,
  useMyCourses,
  useSuggestedCourses,
  type UseCoursesReturn,
  type UseMyCOursesReturn,
} from './useCourses';

export {
  useCourseNavigation,
  type NavigationItem,
} from './useCourseNavigation';
