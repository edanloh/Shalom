/**
 * Services Index - Central export for all API services
 */

export { apiService, ApiError, NetworkError, TimeoutError } from "./apiService";
export { courseService } from "./courseService";
export { courseDetailService } from "./courseDetailService";
export { videoService } from "./videoService";
export { pdfService } from "./pdfService";
export { quizService } from "./quizService";
export { moduleService } from "./moduleService";

// Re-export types
export type {
  CourseListParams,
  EnrollmentCourse,
  EnrollmentResponse,
} from "./courseService";
export type {
  CourseDetailResponse,
  CourseModule,
  ProcessedCourseDetail,
} from "./courseDetailService";
export type {
  VideoDetailResponse,
  UpdateVideoProgressRequest,
  UpdateVideoProgressResponse,
} from "./videoService";
export type {
  PDFDetailResponse,
  MarkPDFCompletedRequest,
  MarkPDFCompletedResponse,
} from "./pdfService";
export type {
  QuizOption,
  QuizQuestion,
  QuizDetailResponse,
  SubmitQuizRequest,
  SubmitQuizResponse,
} from "./quizService";
export type {
  ModuleItem,
  CourseSection,
  UserProgress,
  ModuleDetailResponse,
} from "./moduleService";
