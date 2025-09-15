import React, { createContext, useContext, useState, useEffect } from 'react';
import { Course } from '../types';
import courseService, { CourseListParams } from '../services/courseService';
import { useAuth } from './AuthContext';

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
  
  // Suggested courses
  suggestedCourses: Course[];
  suggestedLoading: boolean;
  suggestedError: string | null;
  refreshSuggested: () => Promise<void>;
  
  // Search and filter functions
  searchCourses: (query: string) => Course[];
  getCoursesByCategory: (category: string) => Course[];
  getCourse: (courseId: string) => Course | undefined;
}

const CourseContext = createContext<CourseContextType | undefined>(undefined);

export const CourseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [myCourses, setMyCourses] = useState<Course[]>([]);
  const [myCoursesLoading, setMyCoursesLoading] = useState(false);
  const [myCoursesError, setMyCoursesError] = useState<string | null>(null);

  const [suggestedCourses, setSuggestedCourses] = useState<Course[]>([]);
  const [suggestedLoading, setSuggestedLoading] = useState(false);
  const [suggestedError, setSuggestedError] = useState<string | null>(null);

  const { user } = useAuth();

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    if (user?.id) {
      loadMyCourses();
      loadSuggestedCourses();
    }
  }, [user?.id]);

  const loadCourses = async () => {
    if (loading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const coursesData = await courseService.getCourses();
      console.log('CourseContext: Loaded', coursesData.length, 'courses');
      setCourses(coursesData);
    } catch (err) {
      console.error('CourseContext: Error loading courses:', err);
      setError(err instanceof Error ? err.message : 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const loadMyCourses = async () => {
    if (!user?.id || myCoursesLoading) return;
    
    setMyCoursesLoading(true);
    setMyCoursesError(null);
    
    try {
      const myCoursesData = await courseService.getUserEnrollments(user.id);
      console.log('CourseContext: Loaded', myCoursesData.length, 'my courses');
      setMyCourses(myCoursesData);
    } catch (err) {
      console.error('CourseContext: Error loading my courses:', err);
      setMyCoursesError(err instanceof Error ? err.message : 'Failed to load my courses');
    } finally {
      setMyCoursesLoading(false);
    }
  };

  const loadSuggestedCourses = async () => {
    if (suggestedLoading) return;
    
    setSuggestedLoading(true);
    setSuggestedError(null);
    
    try {
      console.log('CourseContext: Loading suggested courses...');
      const suggestedData = await courseService.getSuggestedCourses();
      setSuggestedCourses(suggestedData);
    } catch (err) {
      console.error('CourseContext: Error loading suggested courses:', err);
      setSuggestedError(err instanceof Error ? err.message : 'Failed to load suggested courses');
    } finally {
      setSuggestedLoading(false);
    }
  };

  const refreshCourses = async () => {
    await loadCourses();
  };

  const refreshMyCourses = async () => {
    await loadMyCourses();
  };

  const refreshSuggested = async () => {
    await loadSuggestedCourses();
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
      
      suggestedCourses,
      suggestedLoading,
      suggestedError,
      refreshSuggested,
      
      searchCourses,
      getCoursesByCategory,
      getCourse,
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