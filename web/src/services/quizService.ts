/**
 * Quiz Service - Handles all quiz-related API calls for web
 * Integrates with Supabase backend for quiz grading and management
 */

import { apiService } from './apiService';

export interface PendingGradingItem {
  attemptId: string;
  attemptNumber: number;
  studentId: string;
  studentName: string;
  studentEmail: string;
  quizId: string;
  quizTitle: string;
  courseId: string;
  courseTitle: string;
  moduleId: string | null;
  moduleTitle: string | null;
  questionId: string;
  questionText: string;
  questionImageUrl?: string;
  maxPoints: number;
  sampleAnswer: string;
  studentAnswer: string;
  submittedAt: string;
  totalScore: number;
  isPassed: boolean;
}

export interface StudentAnswer {
  attemptId: string;
  attemptNumber: number;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentAnswer: string;
  submittedAt: string;
  totalScore: number;
  isPassed: boolean;
  gradesReleased?: boolean;
}

export interface AnswerVariation {
  variationId: string;
  answerText: string;
  studentCount: number;
  isGraded: boolean;
  gradedPoints: number | null;
  gradedFeedback: string | null;
  students: StudentAnswer[];
}

export interface QuestionGrading {
  questionId: string;
  questionText: string;
  questionImageUrl: string | null;
  questionExplanation: string | null;
  maxPoints: number;
  sampleAnswer: string;
  quizId: string;
  quizTitle: string;
  courseId: string;
  courseTitle: string;
  moduleId: string | null;
  moduleTitle: string | null;
  totalPendingCount: number;
  variations: AnswerVariation[];
}

export interface GradeSubmission {
  attemptId: string;
  questionId: string;
  pointsAwarded: number;
  feedback?: string;
  releaseGrades?: boolean;
}

export interface VariationGradeSubmission {
  attemptIds: string[];
  questionId: string;
  pointsAwarded: number;
  feedback?: string;
  releaseGrades?: boolean;
}

export interface GradeResponse {
  success: boolean;
  message: string;
  data: {
    attemptId: string;
    questionId: string;
    pointsAwarded: number;
    maxPoints: number;
    newScore: number;
    isPassed: boolean;
  };
}

export interface QuizResultsStats {
  quizId: string;
  quizTitle: string;
  courseTitle: string;
  totalQuestions: number;
  overallStats: {
    avgScore: number;
    passRate: number;
    totalAttempts: number;
    highScore: number;
    lowScore: number;
  };
  scoreDistribution: {
    range: string;
    count: number;
  }[];
  studentScores: {
    studentId: string;
    studentName: string;
    studentEmail: string;
    score: number;
    status: 'Passed' | 'Failed';
    attempts: number;
    lastAttemptDate: string;
    lastAttemptId: string;
    allAttempts: {
      attemptId: string;
      attemptNumber: number;
      score: number;
      status: 'Passed' | 'Failed';
      completedAt: string;
      completedAtRaw: string;
    }[];
  }[];
  questionBreakdown: {
    questionId: string;
    questionNumber: number;
    questionText: string;
    questionType: string;
    correctPercentage: number;
    avgPoints: number | null;
  }[];
  attemptHistory: {
    date: string;
    attemptCount: number;
    avgScore: number;
  }[];
}

export interface QuestionAttemptDetail {
  questionId: string;
  questionNumber: number;
  questionText: string;
  questionType: string;
  studentAnswer: any;
  correctAnswer: any;
  pointsEarned: number;
  maxPoints: number;
  feedback: string | null;
  isCorrect: boolean | null;
  options?: any[];
}

export interface StudentAttemptDetails {
  attemptId: string;
  quizId: string;
  quizTitle: string;
  courseTitle: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  score: number;
  isPassed: boolean;
  submittedAt: string;
  totalPointsEarned: number;
  totalMaxPoints: number;
  questionAttempts: QuestionAttemptDetail[];
}

/**
 * Get pending short-answer questions grouped by question with answer variations
 */
export const getPendingGradingByQuestion = async (
  instructorId: string,
  courseId?: string,
  moduleId?: string,
  quizId?: string
): Promise<QuestionGrading[]> => {
  try {
    const params = new URLSearchParams();
    if (courseId) params.append('courseId', courseId);
    if (moduleId) params.append('moduleId', moduleId);
    if (quizId) params.append('quizId', quizId);

    const queryString = params.toString();
    const endpoint = `/getPendingGradingByQuestion/${instructorId}${queryString ? `?${queryString}` : ''}`;

    const response = await apiService.get(endpoint);
    
    if (response.success) {
      return response.data || [];
    } else {
      throw new Error(response.message || 'Failed to fetch pending grading by question');
    }
  } catch (error: any) {
    console.error('[quizService] Error fetching pending grading by question:', error);
    throw error;
  }
};

/**
 * Get pending short-answer questions that need manual grading (legacy, individual view)
 */
export const getPendingGrading = async (
  instructorId: string,
  courseId?: string,
  moduleId?: string
): Promise<PendingGradingItem[]> => {
  try {
    const params = new URLSearchParams();
    if (courseId) params.append('courseId', courseId);
    if (moduleId) params.append('moduleId', moduleId);

    const queryString = params.toString();
    const endpoint = `/getPendingGrading/${instructorId}${queryString ? `?${queryString}` : ''}`;

    const response = await apiService.get(endpoint);
    
    if (response.success) {
      return response.data || [];
    } else {
      throw new Error(response.message || 'Failed to fetch pending grading');
    }
  } catch (error: any) {
    console.error('[quizService] Error fetching pending grading:', error);
    throw error;
  }
};

/**
 * Submit a grade for a short-answer question
 */
export const gradeShortAnswer = async (
  gradeData: GradeSubmission
): Promise<GradeResponse> => {
  try {
    const response = await apiService.post('/gradeShortAnswer', gradeData);
    
    if (response.success) {
      return response;
    } else {
      throw new Error(response.message || 'Failed to submit grade');
    }
  } catch (error: any) {
    console.error('[quizService] Error submitting grade:', error);
    throw error;
  }
};

/**
 * Grade multiple students with the same answer variation
 */
export const gradeAnswerVariation = async (
  gradeData: VariationGradeSubmission
): Promise<any> => {
  try {
    const response = await apiService.post('/gradeAnswerVariation', gradeData);
    
    if (response.success) {
      return response;
    } else {
      throw new Error(response.message || 'Failed to grade variation');
    }
  } catch (error: any) {
    console.error('[quizService] Error grading variation:', error);
    throw error;
  }
};

/**
 * Get comprehensive quiz results and statistics
 */
export const getQuizResults = async (quizId: string): Promise<QuizResultsStats> => {
  try {
    const response = await apiService.get(`/getQuizResults/${quizId}`);
    
    if (response.success) {
      return response.data;
    } else {
      throw new Error(response.message || 'Failed to fetch quiz results');
    }
  } catch (error: any) {
    console.error('[quizService] Error fetching quiz results:', error);
    throw error;
  }
};

/**
 * Get detailed student attempt information including all questions and answers
 */
export const getStudentAttemptDetails = async (attemptId: string): Promise<StudentAttemptDetails> => {
  try {
    const response = await apiService.get(`/getStudentAttemptDetails/${attemptId}`) as StudentAttemptDetails;
    return response;
  } catch (error: any) {
    console.error('[quizService] Error fetching student attempt details:', error);
    throw error;
  }
};

/**
 * Get the latest attempt ID for a student on a specific quiz (fallback method)
 */
export const getStudentLatestAttempt = async (quizId: string, userId: string): Promise<{ attemptId: string }> => {
  try {
    const response = await apiService.get(`/getStudentLatestAttempt?quizId=${quizId}&userId=${userId}`) as { attemptId: string };
    return response;
  } catch (error: any) {
    console.error('[quizService] Error fetching student latest attempt:', error);
    throw error;
  }
};

export const quizService = {
  getPendingGrading,
  getPendingGradingByQuestion,
  gradeShortAnswer,
  gradeAnswerVariation,
  getQuizResults,
  getStudentAttemptDetails,
  getStudentLatestAttempt,
};
