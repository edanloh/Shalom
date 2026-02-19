/**
 * Quiz Service - Handles all quiz-related API calls
 * Integrates with Supabase backend for quiz taking and submission
 */

import { apiService } from './apiService';

// Quiz Option Structure (for frontend use)
export interface QuizOption {
  id: string;
  option_text: string;
}

// Backend Question Structure (what API returns)
interface BackendQuizQuestion {
  id: string;
  question_text: string;
  question_type: string;
  options: string[]; // Backend returns array of strings
  correct_answer: string;
  explanation: string;
  points: number;
  order_index: number;
  image_url?: string; // Optional question image
}

// Frontend Question Structure (after transformation)
export interface QuizQuestion {
  id: string;
  question_text: string;
  question_type: 'multiple-choice' | 'multiple-correct' | 'true-false' | 'short-answer' | 'matching';
  order_index: number;
  options: QuizOption[];
  explanation?: string;
  points: number;
  correct_answer?: string;
  image_url?: string; // Optional question image
  matching_pairs?: Array<{ left: string; right: string }>; // For matching type
}

// Backend Quiz Detail Response
interface BackendQuizDetailResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    title: string;
    description: string;
    passing_score: number;
    time_limit_minutes: number | null;
    max_attempts: number | null;
    course: {
      id: string;
      title: string;
    };
    section: {
      id: string;
      title: string;
    };
    questions: BackendQuizQuestion[];
    userAttempts: Array<{
      attempt_number: number;
      score: number;
      total_questions?: number;
      correct_answers?: number;
      time_taken_minutes?: number | null;
      is_passed: boolean;
      answers?: Record<string, string> | null;
      completed_at: string;
    }>;
  };
}

// Quiz Detail Response (after transformation)
export interface QuizDetailResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    title: string;
    description: string;
    passing_score: number;
    time_limit_minutes: number | null;
    max_attempts: number | null;
    course: {
      id: string;
      title: string;
    };
    section: {
      id: string;
      title: string;
    };
    questions: QuizQuestion[];
    userAttempts: Array<{
      attempt_number: number;
      score: number;
      total_questions?: number;
      correct_answers?: number;
      time_taken_minutes?: number | null;
      is_passed: boolean;
      answers?: Record<string, string> | null;
      completed_at: string;
    }>;
  };
}

// Submit Quiz Request Body
export interface SubmitQuizRequest {
  userId: string;
  quizId: string;
  answers: Array<{
    questionId: string;
    answer: string; // The actual answer text selected by user
  }>;
  timeTakenMinutes?: number | null;
}

// Submit Quiz Response from submitQuiz Lambda
export interface SubmitQuizResponse {
  success: boolean;
  message: string;
  data: {
    score: number;
    totalQuestions: number;
    correctAnswers: number;
    isPassed: boolean;
    attemptNumber: number;
    attemptsRemaining: number | null;
    answers: Array<{
      questionId: string;
      isCorrect: boolean;
      correctAnswer: string;
    }>;
  };
}

class QuizService {
  /**
   * Transform backend question format to frontend format
   * Converts string array options to QuizOption objects
   */
  private transformQuestion(backendQuestion: BackendQuizQuestion): QuizQuestion {
    // Map question types properly
    let questionType: 'multiple-choice' | 'multiple-correct' | 'true-false' | 'short-answer' | 'matching';
    
    switch (backendQuestion.question_type) {
      case 'true-false':
        questionType = 'true-false';
        break;
      case 'multiple-correct':
        questionType = 'multiple-correct';
        break;
      case 'short-answer':
      case 'text':
        questionType = 'short-answer';
        break;
      case 'matching':
        questionType = 'matching';
        break;
      default:
        questionType = 'multiple-choice';
    }

    const transformed: QuizQuestion = {
      id: backendQuestion.id,
      question_text: backendQuestion.question_text,
      question_type: questionType,
      order_index: backendQuestion.order_index,
      options: (backendQuestion.options || []).map((optionText, index) => ({
        id: `${backendQuestion.id}-option-${index}`,
        option_text: optionText,
      })),
      explanation: backendQuestion.explanation,
      points: backendQuestion.points,
      correct_answer: backendQuestion.correct_answer,
      image_url: backendQuestion.image_url,
    };

    // For matching questions, parse the correct_answer JSON
    if (questionType === 'matching') {
      try {
        transformed.matching_pairs = JSON.parse(backendQuestion.correct_answer || '[]');
      } catch {
        transformed.matching_pairs = [];
      }
    }

    return transformed;
  }

  /**
   * Get quiz details with questions and user's previous attempts
   * Endpoint: GET /getQuizDetail/{quizId}?userId={userId}&courseId={courseId}
   * Maps to getQuizDetail.mjs Lambda function
   */
  async getQuizDetail(courseId: string, quizId: string, userId?: string): Promise<QuizDetailResponse['data']> {
    try {      
      const params: Record<string, string> = {
        courseId: courseId,
      };
      if (userId) {
        params.userId = userId;
      }

      const backendResponse = await apiService.get<BackendQuizDetailResponse>(
        `/getQuizDetail/${quizId}`,
        params
      );

      if (!backendResponse.success || !backendResponse.data) {
        throw new Error(backendResponse.message || 'Failed to fetch quiz details');
      }

      // Transform backend response to frontend format
      const transformedData: QuizDetailResponse['data'] = {
        ...backendResponse.data,
        questions: backendResponse.data.questions.map(q => this.transformQuestion(q)),
      };

      return transformedData;
    } catch (error) {
      console.error('Error fetching quiz details:', error);
      throw error;
    }
  }

  /**
   * Submit quiz answers and get results
   * Endpoint: POST /submitQuiz/{quizId}
   * Maps to submitQuiz Supabase Edge Function
   */
  async submitQuiz(courseId: string, quizId: string, request: SubmitQuizRequest): Promise<SubmitQuizResponse['data']> {
    try {
      const response = await apiService.post<SubmitQuizResponse>(
        `/submitQuiz/${quizId}`,
        { 
          userId: request.userId,
          answers: request.answers,
          timeTakenMinutes: request.timeTakenMinutes
        }
      );

      if (!response.success || !response.data) {
        throw new Error(response.message || 'Failed to submit quiz');
      }

      return response.data;
    } catch (error) {
      console.error('Error submitting quiz:', error);
      throw error;
    }
  }

  /**
   * Calculate time remaining in seconds
   */
  calculateTimeRemaining(startTime: Date, timeLimitMinutes: number): number {
    const now = new Date();
    const elapsed = (now.getTime() - startTime.getTime()) / 1000; // seconds
    const totalTime = timeLimitMinutes * 60; // convert to seconds
    return Math.max(0, totalTime - elapsed);
  }

  /**
   * Format time in MM:SS format
   */
  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Get latest attempt from user attempts array
   */
  getLatestAttempt(userAttempts: QuizDetailResponse['data']['userAttempts']) {
    if (!userAttempts || userAttempts.length === 0) return null;
    return userAttempts.reduce((latest, attempt) => 
      attempt.attempt_number > latest.attempt_number ? attempt : latest
    );
  }

  /**
   * Check if user can retry quiz
   */
  canRetryQuiz(
    userAttempts: QuizDetailResponse['data']['userAttempts'],
    maxAttempts: number | null
  ): boolean {
    if (maxAttempts === null) return true;
    if (!userAttempts) return true;
    return userAttempts.length < maxAttempts;
  }

  /**
   * Calculate attempts remaining
   */
  getAttemptsRemaining(
    userAttempts: QuizDetailResponse['data']['userAttempts'],
    maxAttempts: number | null
  ): number | null {
    if (maxAttempts === null) return null;
    if (!userAttempts) return maxAttempts;
    return Math.max(0, maxAttempts - userAttempts.length);
  }

  /**
   * Check if quiz is passed (any attempt with is_passed = true)
   */
  isQuizPassed(userAttempts: QuizDetailResponse['data']['userAttempts']): boolean {
    if (!userAttempts || userAttempts.length === 0) return false;
    return userAttempts.some(attempt => attempt.is_passed);
  }

  /**
   * Get best score from all attempts
   */
  getBestScore(userAttempts: QuizDetailResponse['data']['userAttempts']): number {
    if (!userAttempts || userAttempts.length === 0) return 0;
    return Math.max(...userAttempts.map(attempt => attempt.score));
  }

  /**
   * Validate that all questions are answered
   * For multiple-correct, ensure at least one option is selected
   */
  validateAnswers(answers: Map<string, string | string[]>, totalQuestions: number): boolean {
    if (answers.size !== totalQuestions) {
      return false;
    }
    
    // Check that all answers have content (including non-empty arrays for multiple-correct)
    for (const answer of answers.values()) {
      if (Array.isArray(answer) && answer.length === 0) {
        return false;
      }
      if (!Array.isArray(answer) && !answer) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Convert Map to array format for API
   * Maps question IDs to the selected option text
   * For multiple-correct questions, the answer is an array that gets stringified
   */
  convertAnswersToArray(answers: Map<string, string | string[]>): Array<{ questionId: string; answer: string }> {
    return Array.from(answers.entries()).map(([questionId, answerText]) => ({
      questionId,
      answer: Array.isArray(answerText) ? JSON.stringify(answerText) : answerText,
    }));
  }
}

// Export singleton instance
export const quizService = new QuizService();
export default quizService;
