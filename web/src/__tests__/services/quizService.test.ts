import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { quizService } from '@/services/quizService';
import { apiService } from '@/services/apiService';

// Mock the apiService
vi.mock('@/services/apiService', () => ({
  apiService: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('quizService', () => {
  const mockApiService = apiService as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getPendingGrading', () => {
    const mockInstructorId = 'instructor-123';
    const mockPendingGradingData = [
      {
        attemptId: 'attempt-1',
        attemptNumber: 1,
        studentId: 'student-1',
        studentName: 'John Doe',
        studentEmail: 'john@example.com',
        quizId: 'quiz-1',
        quizTitle: 'Quiz 1',
        courseId: 'course-1',
        courseTitle: 'Course 1',
        moduleId: 'module-1',
        moduleTitle: 'Module 1',
        questionId: 'question-1',
        questionText: 'What is React?',
        maxPoints: 10,
        sampleAnswer: 'React is a JavaScript library',
        studentAnswer: 'React is a library for building UIs',
        submittedAt: '2024-01-01T10:00:00Z',
        totalScore: 85,
        isPassed: true,
      },
    ];

    it('should fetch pending grading without filters', async () => {
      mockApiService.get.mockResolvedValue({
        success: true,
        data: mockPendingGradingData,
      });

      const result = await quizService.getPendingGrading(mockInstructorId);

      expect(mockApiService.get).toHaveBeenCalledWith(
        `/getPendingGrading/${mockInstructorId}`
      );
      expect(result).toEqual(mockPendingGradingData);
    });

    it('should fetch pending grading with courseId filter', async () => {
      mockApiService.get.mockResolvedValue({
        success: true,
        data: mockPendingGradingData,
      });

      await quizService.getPendingGrading(mockInstructorId, 'course-1');

      expect(mockApiService.get).toHaveBeenCalledWith(
        `/getPendingGrading/${mockInstructorId}?courseId=course-1`
      );
    });

    it('should fetch pending grading with courseId and moduleId filters', async () => {
      mockApiService.get.mockResolvedValue({
        success: true,
        data: mockPendingGradingData,
      });

      await quizService.getPendingGrading(
        mockInstructorId,
        'course-1',
        'module-1'
      );

      expect(mockApiService.get).toHaveBeenCalledWith(
        `/getPendingGrading/${mockInstructorId}?courseId=course-1&moduleId=module-1`
      );
    });

    it('should return empty array when no data', async () => {
      mockApiService.get.mockResolvedValue({
        success: true,
        data: null,
      });

      const result = await quizService.getPendingGrading(mockInstructorId);

      expect(result).toEqual([]);
    });

    it('should throw error when API call fails', async () => {
      mockApiService.get.mockResolvedValue({
        success: false,
        message: 'API Error',
      });

      await expect(
        quizService.getPendingGrading(mockInstructorId)
      ).rejects.toThrow('API Error');
    });

    it('should handle network errors', async () => {
      mockApiService.get.mockRejectedValue(new Error('Network error'));

      await expect(
        quizService.getPendingGrading(mockInstructorId)
      ).rejects.toThrow('Network error');
    });
  });

  describe('getPendingGradingByQuestion', () => {
    const mockInstructorId = 'instructor-123';
    const mockQuestionGradingData = [
      {
        questionId: 'question-1',
        questionText: 'What is React?',
        questionImageUrl: null,
        questionExplanation: null,
        maxPoints: 10,
        sampleAnswer: 'React is a JavaScript library',
        quizId: 'quiz-1',
        quizTitle: 'React Basics Quiz',
        courseId: 'course-1',
        courseTitle: 'Web Development',
        moduleId: 'module-1',
        moduleTitle: 'Module 1',
        totalPendingCount: 5,
        variations: [
          {
            variationId: 'var-1',
            answerText: 'React is a library',
            studentCount: 3,
            isGraded: false,
            gradedPoints: null,
            gradedFeedback: null,
            students: [],
          },
        ],
      },
    ];

    it('should fetch pending grading grouped by question', async () => {
      mockApiService.get.mockResolvedValue({
        success: true,
        data: mockQuestionGradingData,
      });

      const result = await quizService.getPendingGradingByQuestion(
        mockInstructorId
      );

      expect(mockApiService.get).toHaveBeenCalledWith(
        `/getPendingGradingByQuestion/${mockInstructorId}`
      );
      expect(result).toEqual(mockQuestionGradingData);
    });

    it('should fetch with courseId filter', async () => {
      mockApiService.get.mockResolvedValue({
        success: true,
        data: mockQuestionGradingData,
      });

      await quizService.getPendingGradingByQuestion(
        mockInstructorId,
        'course-1'
      );

      expect(mockApiService.get).toHaveBeenCalledWith(
        `/getPendingGradingByQuestion/${mockInstructorId}?courseId=course-1`
      );
    });

    it('should fetch with all filters', async () => {
      mockApiService.get.mockResolvedValue({
        success: true,
        data: mockQuestionGradingData,
      });

      await quizService.getPendingGradingByQuestion(
        mockInstructorId,
        'course-1',
        'module-1',
        'quiz-1'
      );

      expect(mockApiService.get).toHaveBeenCalledWith(
        `/getPendingGradingByQuestion/${mockInstructorId}?courseId=course-1&moduleId=module-1&quizId=quiz-1`
      );
    });

    it('should return empty array when no data', async () => {
      mockApiService.get.mockResolvedValue({
        success: true,
        data: null,
      });

      const result = await quizService.getPendingGradingByQuestion(
        mockInstructorId
      );

      expect(result).toEqual([]);
    });

    it('should throw error when API call fails', async () => {
      mockApiService.get.mockResolvedValue({
        success: false,
        message: 'Failed to fetch pending grading by question',
      });

      await expect(
        quizService.getPendingGradingByQuestion(mockInstructorId)
      ).rejects.toThrow('Failed to fetch pending grading by question');
    });
  });

  describe('gradeShortAnswer', () => {
    const mockGradeData = {
      attemptId: 'attempt-1',
      questionId: 'question-1',
      pointsAwarded: 8,
      feedback: 'Good answer',
      releaseGrades: true,
    };

    const mockGradeResponse = {
      success: true,
      message: 'Grade submitted successfully',
      data: {
        attemptId: 'attempt-1',
        questionId: 'question-1',
        pointsAwarded: 8,
        maxPoints: 10,
        newScore: 88,
        isPassed: true,
      },
    };

    it('should submit grade successfully', async () => {
      mockApiService.post.mockResolvedValue(mockGradeResponse);

      const result = await quizService.gradeShortAnswer(mockGradeData);

      expect(mockApiService.post).toHaveBeenCalledWith(
        '/gradeShortAnswer',
        mockGradeData
      );
      expect(result).toEqual(mockGradeResponse);
    });

    it('should submit grade without feedback', async () => {
      const gradeDataWithoutFeedback = {
        attemptId: 'attempt-1',
        questionId: 'question-1',
        pointsAwarded: 10,
      };

      mockApiService.post.mockResolvedValue(mockGradeResponse);

      await quizService.gradeShortAnswer(gradeDataWithoutFeedback);

      expect(mockApiService.post).toHaveBeenCalledWith(
        '/gradeShortAnswer',
        gradeDataWithoutFeedback
      );
    });

    it('should submit grade with zero points', async () => {
      const zeroPointsGrade = {
        ...mockGradeData,
        pointsAwarded: 0,
        feedback: 'Incorrect answer',
      };

      mockApiService.post.mockResolvedValue({
        ...mockGradeResponse,
        data: { ...mockGradeResponse.data, pointsAwarded: 0, isPassed: false },
      });

      const result = await quizService.gradeShortAnswer(zeroPointsGrade);

      expect(result.data.pointsAwarded).toBe(0);
      expect(result.data.isPassed).toBe(false);
    });

    it('should throw error when submission fails', async () => {
      mockApiService.post.mockResolvedValue({
        success: false,
        message: 'Failed to submit grade',
      });

      await expect(
        quizService.gradeShortAnswer(mockGradeData)
      ).rejects.toThrow('Failed to submit grade');
    });

    it('should handle network errors', async () => {
      mockApiService.post.mockRejectedValue(new Error('Network error'));

      await expect(
        quizService.gradeShortAnswer(mockGradeData)
      ).rejects.toThrow('Network error');
    });
  });

  describe('gradeAnswerVariation', () => {
    const mockVariationGradeData = {
      attemptIds: ['attempt-1', 'attempt-2', 'attempt-3'],
      questionId: 'question-1',
      pointsAwarded: 9,
      feedback: 'Excellent answer',
      releaseGrades: false,
    };

    const mockVariationGradeResponse = {
      success: true,
      message: 'Graded 3 students successfully',
      data: {
        gradedCount: 3,
        failedAttempts: [],
      },
    };

    it('should grade multiple students with same answer', async () => {
      mockApiService.post.mockResolvedValue(mockVariationGradeResponse);

      const result = await quizService.gradeAnswerVariation(
        mockVariationGradeData
      );

      expect(mockApiService.post).toHaveBeenCalledWith(
        '/gradeAnswerVariation',
        mockVariationGradeData
      );
      expect(result).toEqual(mockVariationGradeResponse);
    });

    it('should grade single student variation', async () => {
      const singleStudentData = {
        ...mockVariationGradeData,
        attemptIds: ['attempt-1'],
      };

      mockApiService.post.mockResolvedValue({
        ...mockVariationGradeResponse,
        data: { gradedCount: 1, failedAttempts: [] },
      });

      const result = await quizService.gradeAnswerVariation(singleStudentData);

      expect(result.data.gradedCount).toBe(1);
    });

    it('should handle partial success with failed attempts', async () => {
      mockApiService.post.mockResolvedValue({
        success: true,
        message: 'Graded 2 out of 3 students',
        data: {
          gradedCount: 2,
          failedAttempts: ['attempt-3'],
        },
      });

      const result = await quizService.gradeAnswerVariation(
        mockVariationGradeData
      );

      expect(result.data.gradedCount).toBe(2);
      expect(result.data.failedAttempts).toContain('attempt-3');
    });

    it('should throw error when grading fails', async () => {
      mockApiService.post.mockResolvedValue({
        success: false,
        message: 'Failed to grade variation',
      });

      await expect(
        quizService.gradeAnswerVariation(mockVariationGradeData)
      ).rejects.toThrow('Failed to grade variation');
    });
  });

  describe('getQuizResults', () => {
    const mockQuizId = 'quiz-123';
    const mockQuizResults = {
      quizId: 'quiz-123',
      quizTitle: 'React Basics Quiz',
      courseTitle: 'Web Development',
      totalQuestions: 10,
      overallStats: {
        avgScore: 75.5,
        passRate: 80,
        totalAttempts: 25,
        highScore: 100,
        lowScore: 40,
      },
      scoreDistribution: [
        { range: '90-100', count: 5 },
        { range: '80-89', count: 8 },
        { range: '70-79', count: 7 },
        { range: '60-69', count: 3 },
        { range: '0-59', count: 2 },
      ],
      studentScores: [],
      questionBreakdown: [],
      attemptHistory: [],
    };

    it('should fetch quiz results successfully', async () => {
      mockApiService.get.mockResolvedValue({
        success: true,
        data: mockQuizResults,
      });

      const result = await quizService.getQuizResults(mockQuizId);

      expect(mockApiService.get).toHaveBeenCalledWith(
        `/getQuizResults/${mockQuizId}`
      );
      expect(result).toEqual(mockQuizResults);
    });

    it('should include student scores in results', async () => {
      const resultsWithStudents = {
        ...mockQuizResults,
        studentScores: [
          {
            studentId: 'student-1',
            studentName: 'John Doe',
            studentEmail: 'john@example.com',
            score: 95,
            status: 'Passed' as const,
            attempts: 1,
            lastAttemptDate: '2024-01-01',
            lastAttemptId: 'attempt-1',
            allAttempts: [],
          },
        ],
      };

      mockApiService.get.mockResolvedValue({
        success: true,
        data: resultsWithStudents,
      });

      const result = await quizService.getQuizResults(mockQuizId);

      expect(result.studentScores).toHaveLength(1);
      expect(result.studentScores[0].status).toBe('Passed');
    });

    it('should include question breakdown', async () => {
      const resultsWithQuestions = {
        ...mockQuizResults,
        questionBreakdown: [
          {
            questionId: 'q1',
            questionNumber: 1,
            questionText: 'What is React?',
            questionType: 'multiple-choice',
            correctPercentage: 85,
            avgPoints: 8.5,
          },
        ],
      };

      mockApiService.get.mockResolvedValue({
        success: true,
        data: resultsWithQuestions,
      });

      const result = await quizService.getQuizResults(mockQuizId);

      expect(result.questionBreakdown).toHaveLength(1);
      expect(result.questionBreakdown[0].correctPercentage).toBe(85);
    });

    it('should throw error when fetching fails', async () => {
      mockApiService.get.mockResolvedValue({
        success: false,
        message: 'Quiz not found',
      });

      await expect(quizService.getQuizResults(mockQuizId)).rejects.toThrow(
        'Quiz not found'
      );
    });

    it('should handle empty quiz results', async () => {
      const emptyResults = {
        ...mockQuizResults,
        overallStats: {
          avgScore: 0,
          passRate: 0,
          totalAttempts: 0,
          highScore: 0,
          lowScore: 0,
        },
        studentScores: [],
      };

      mockApiService.get.mockResolvedValue({
        success: true,
        data: emptyResults,
      });

      const result = await quizService.getQuizResults(mockQuizId);

      expect(result.overallStats.totalAttempts).toBe(0);
      expect(result.studentScores).toEqual([]);
    });
  });

  describe('getStudentAttemptDetails', () => {
    const mockAttemptId = 'attempt-123';
    const mockAttemptDetails = {
      attemptId: 'attempt-123',
      quizId: 'quiz-1',
      quizTitle: 'React Basics Quiz',
      courseTitle: 'Web Development',
      studentId: 'student-1',
      studentName: 'John Doe',
      studentEmail: 'john@example.com',
      score: 85,
      isPassed: true,
      submittedAt: '2024-01-01T10:00:00Z',
      totalPointsEarned: 85,
      totalMaxPoints: 100,
      questionAttempts: [
        {
          questionId: 'q1',
          questionNumber: 1,
          questionText: 'What is React?',
          questionType: 'multiple-choice',
          studentAnswer: 'A JavaScript library',
          correctAnswer: 'A JavaScript library',
          pointsEarned: 10,
          maxPoints: 10,
          feedback: null,
          isCorrect: true,
          options: ['A JavaScript library', 'A framework', 'A database'],
        },
      ],
    };

    it('should fetch student attempt details', async () => {
      mockApiService.get.mockResolvedValue(mockAttemptDetails);

      const result = await quizService.getStudentAttemptDetails(mockAttemptId);

      expect(mockApiService.get).toHaveBeenCalledWith(
        `/getStudentAttemptDetails/${mockAttemptId}`
      );
      expect(result).toEqual(mockAttemptDetails);
    });

    it('should handle attempt with multiple questions', async () => {
      const multiQuestionAttempt = {
        ...mockAttemptDetails,
        questionAttempts: [
          mockAttemptDetails.questionAttempts[0],
          {
            questionId: 'q2',
            questionNumber: 2,
            questionText: 'What is JSX?',
            questionType: 'short-answer',
            studentAnswer: 'JSX is JavaScript XML',
            correctAnswer: null,
            pointsEarned: 8,
            maxPoints: 10,
            feedback: 'Good answer',
            isCorrect: null,
          },
        ],
      };

      mockApiService.get.mockResolvedValue(multiQuestionAttempt);

      const result = await quizService.getStudentAttemptDetails(mockAttemptId);

      expect(result.questionAttempts).toHaveLength(2);
      expect(result.questionAttempts[1].questionType).toBe('short-answer');
    });

    it('should handle failed attempt', async () => {
      const failedAttempt = {
        ...mockAttemptDetails,
        score: 45,
        isPassed: false,
        totalPointsEarned: 45,
      };

      mockApiService.get.mockResolvedValue(failedAttempt);

      const result = await quizService.getStudentAttemptDetails(mockAttemptId);

      expect(result.isPassed).toBe(false);
      expect(result.score).toBe(45);
    });

    it('should handle incorrect answers', async () => {
      const incorrectAttempt = {
        ...mockAttemptDetails,
        questionAttempts: [
          {
            ...mockAttemptDetails.questionAttempts[0],
            studentAnswer: 'A framework',
            pointsEarned: 0,
            isCorrect: false,
          },
        ],
      };

      mockApiService.get.mockResolvedValue(incorrectAttempt);

      const result = await quizService.getStudentAttemptDetails(mockAttemptId);

      expect(result.questionAttempts[0].isCorrect).toBe(false);
      expect(result.questionAttempts[0].pointsEarned).toBe(0);
    });

    it('should throw error when fetching fails', async () => {
      mockApiService.get.mockRejectedValue(new Error('Attempt not found'));

      await expect(
        quizService.getStudentAttemptDetails(mockAttemptId)
      ).rejects.toThrow('Attempt not found');
    });
  });

  describe('getStudentLatestAttempt', () => {
    const mockQuizId = 'quiz-123';
    const mockUserId = 'user-456';
    const mockLatestAttempt = {
      attemptId: 'attempt-789',
    };

    it('should fetch latest attempt ID', async () => {
      mockApiService.get.mockResolvedValue(mockLatestAttempt);

      const result = await quizService.getStudentLatestAttempt(
        mockQuizId,
        mockUserId
      );

      expect(mockApiService.get).toHaveBeenCalledWith(
        `/getStudentLatestAttempt?quizId=${mockQuizId}&userId=${mockUserId}`
      );
      expect(result).toEqual(mockLatestAttempt);
    });

    it('should handle no attempt found', async () => {
      mockApiService.get.mockResolvedValue({ attemptId: null });

      const result = await quizService.getStudentLatestAttempt(
        mockQuizId,
        mockUserId
      );

      expect(result.attemptId).toBeNull();
    });

    it('should throw error when fetching fails', async () => {
      mockApiService.get.mockRejectedValue(new Error('Database error'));

      await expect(
        quizService.getStudentLatestAttempt(mockQuizId, mockUserId)
      ).rejects.toThrow('Database error');
    });
  });
});
