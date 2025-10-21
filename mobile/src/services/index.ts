/**
 * Services Index - Central export for all API services
 */

export { apiService, ApiError, NetworkError, TimeoutError } from './apiService';
export { courseService } from './courseService';
export { courseDetailService } from './courseDetailService';
export { videoService } from './videoService';
export { quizService } from './quizService';
export { moduleService } from './moduleService';

// Re-export types
export type { CourseListParams, EnrollmentCourse, EnrollmentResponse } from './courseService';
export type { CourseDetailResponse, CourseModule, ProcessedCourseDetail } from './courseDetailService';
export type { 
  VideoDetailResponse, 
  UpdateVideoProgressRequest, 
  UpdateVideoProgressResponse 
} from './videoService';
export type { 
  QuizOption,
  QuizQuestion,
  QuizDetailResponse, 
  SubmitQuizRequest, 
  SubmitQuizResponse 
} from './quizService';
export type {
  ModuleItem,
  CourseSection,
  UserProgress,
  ModuleDetailResponse
} from './moduleService';
