import React, { createContext, useContext, useState } from 'react';

export interface Course {
  id: string;
  title: string;
  description: string;
  instructor: string;
  instructorId: string;
  category: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  duration: string;
  price: number;
  originalPrice?: number;
  rating: number;
  students: number;
  thumbnail: string;
  videos: Video[];
  quizzes: Quiz[];
  published: boolean;
  createdAt: Date;
}

export interface Video {
  id: string;
  title: string;
  duration: number;
  url: string;
  order: number;
}

export interface Quiz {
  id: string;
  title: string;
  questions: Question[];
  order: number;
}

export interface Question {
  id: string;
  question: string;
  type: 'multiple-choice' | 'true-false' | 'text';
  options?: string[];
  correctAnswer: string;
  explanation?: string;
}

interface CourseContextType {
  courses: Course[];
  createCourse: (course: Omit<Course, 'id' | 'createdAt'>) => string;
  updateCourse: (courseId: string, updates: Partial<Course>) => void;
  deleteCourse: (courseId: string) => void;
  getCourse: (courseId: string) => Course | undefined;
  searchCourses: (query: string) => Course[];
  getCoursesByCategory: (category: string) => Course[];
  getCoursesByInstructor: (instructorId: string) => Course[];
  addVideoToCourse: (courseId: string, video: Omit<Video, 'id'>) => void;
  addQuizToCourse: (courseId: string, quiz: Omit<Quiz, 'id'>) => void;
}

const CourseContext = createContext<CourseContextType | undefined>(undefined);

export const CourseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [courses, setCourses] = useState<Course[]>([
    {
      id: '1',
      title: 'Complete Web Development Bootcamp 2024',
      description: 'Learn HTML, CSS, JavaScript, React, Node.js, and more in this comprehensive bootcamp.',
      instructor: 'Sarah Chen',
      instructorId: 'instructor-1',
      category: 'Web Development',
      level: 'Beginner',
      duration: '40h',
      price: 89,
      originalPrice: 199,
      rating: 4.9,
      students: 45000,
      thumbnail: 'https://via.placeholder.com/400x250',
      videos: [
        { id: 'v1', title: 'Introduction to Web Development', duration: 900, url: 'mock-video-url', order: 1 },
        { id: 'v2', title: 'HTML Fundamentals', duration: 1200, url: 'mock-video-url', order: 2 },
      ],
      quizzes: [
        {
          id: 'q1',
          title: 'HTML Basics Quiz',
          order: 1,
          questions: [
            {
              id: 'q1-1',
              question: 'What does HTML stand for?',
              type: 'multiple-choice',
              options: ['HyperText Markup Language', 'High Tech Modern Language', 'Home Tool Markup Language'],
              correctAnswer: 'HyperText Markup Language',
              explanation: 'HTML stands for HyperText Markup Language.'
            }
          ]
        }
      ],
      published: true,
      createdAt: new Date()
    },
    {
      id: '2',
      title: 'Machine Learning Fundamentals with Python',
      description: 'Master the basics of machine learning with hands-on Python projects.',
      instructor: 'Dr. James Wilson',
      instructorId: 'instructor-2',
      category: 'Data Science',
      level: 'Intermediate',
      duration: '35h',
      price: 119,
      originalPrice: 249,
      rating: 4.8,
      students: 32000,
      thumbnail: 'https://via.placeholder.com/400x250',
      videos: [],
      quizzes: [],
      published: true,
      createdAt: new Date()
    }
  ]);

  const createCourse = (courseData: Omit<Course, 'id' | 'createdAt'>): string => {
    const newCourse: Course = {
      ...courseData,
      id: Date.now().toString(),
      createdAt: new Date()
    };
    setCourses([...courses, newCourse]);
    return newCourse.id;
  };

  const updateCourse = (courseId: string, updates: Partial<Course>) => {
    setCourses(courses.map(course => 
      course.id === courseId ? { ...course, ...updates } : course
    ));
  };

  const deleteCourse = (courseId: string) => {
    setCourses(courses.filter(course => course.id !== courseId));
  };

  const getCourse = (courseId: string) => {
    return courses.find(course => course.id === courseId);
  };

  const searchCourses = (query: string) => {
    return courses.filter(course => 
      course.title.toLowerCase().includes(query.toLowerCase()) ||
      course.description.toLowerCase().includes(query.toLowerCase()) ||
      course.category.toLowerCase().includes(query.toLowerCase()) ||
      course.instructor.toLowerCase().includes(query.toLowerCase())
    );
  };

  const getCoursesByCategory = (category: string) => {
    return courses.filter(course => course.category === category);
  };

  const getCoursesByInstructor = (instructorId: string) => {
    return courses.filter(course => course.instructorId === instructorId);
  };

  const addVideoToCourse = (courseId: string, videoData: Omit<Video, 'id'>) => {
    const video: Video = {
      ...videoData,
      id: Date.now().toString()
    };
    
    setCourses(courses.map(course => 
      course.id === courseId 
        ? { ...course, videos: [...course.videos, video] }
        : course
    ));
  };

  const addQuizToCourse = (courseId: string, quizData: Omit<Quiz, 'id'>) => {
    const quiz: Quiz = {
      ...quizData,
      id: Date.now().toString()
    };
    
    setCourses(courses.map(course => 
      course.id === courseId 
        ? { ...course, quizzes: [...course.quizzes, quiz] }
        : course
    ));
  };

  return (
    <CourseContext.Provider value={{
      courses,
      createCourse,
      updateCourse,
      deleteCourse,
      getCourse,
      searchCourses,
      getCoursesByCategory,
      getCoursesByInstructor,
      addVideoToCourse,
      addQuizToCourse
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