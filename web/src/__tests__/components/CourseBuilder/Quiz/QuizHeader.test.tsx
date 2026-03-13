import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuizHeader } from '@/components/CourseBuilder/Quiz/QuizHeader';

describe('QuizHeader', () => {
  const mockUpdateQuiz = vi.fn();
  const mockModuleId = 'module-1';

  const defaultQuiz = {
    id: 'quiz-1',
    baseTitle: 'Quiz 1',
    passingScore: 70,
    maxAttempts: 3,
  };

  const defaultQuestions = [
    {
      id: 'q1',
      text: 'What is React?',
      type: 'multiple-choice',
      points: 10,
    },
    {
      id: 'q2',
      text: 'What is JSX?',
      type: 'true-false',
      points: 5,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Quiz Title Input', () => {
    it('should render quiz title input with correct value', () => {
      render(
        <QuizHeader
          quiz={defaultQuiz}
          questions={defaultQuestions}
          showValidationErrors={false}
          quizTitleEmpty={false}
          passingScoreInvalid={false}
          maxAttemptsInvalid={false}
          updateQuiz={mockUpdateQuiz}
          moduleId={mockModuleId}
        />
      );

      const titleInput = screen.getByPlaceholderText(
        /Enter quiz title/i
      ) as HTMLInputElement;
      expect(titleInput.value).toBe('Quiz 1');
    });

    it('should update quiz title when changed', () => {
      render(
        <QuizHeader
          quiz={defaultQuiz}
          questions={defaultQuestions}
          showValidationErrors={false}
          quizTitleEmpty={false}
          passingScoreInvalid={false}
          maxAttemptsInvalid={false}
          updateQuiz={mockUpdateQuiz}
          moduleId={mockModuleId}
        />
      );

      const titleInput = screen.getByPlaceholderText(/Enter quiz title/i);
      fireEvent.change(titleInput, { target: { value: 'Updated Quiz Title' } });

      expect(mockUpdateQuiz).toHaveBeenCalledWith(mockModuleId, 'quiz-1', {
        baseTitle: 'Updated Quiz Title',
      });
    });

    it('should show validation error when title is empty', () => {
      render(
        <QuizHeader
          quiz={defaultQuiz}
          questions={defaultQuestions}
          showValidationErrors={true}
          quizTitleEmpty={true}
          passingScoreInvalid={false}
          maxAttemptsInvalid={false}
          updateQuiz={mockUpdateQuiz}
          moduleId={mockModuleId}
        />
      );

      expect(screen.getByText('Quiz title is required.')).toBeInTheDocument();
    });

    it('should not show validation error when title is valid', () => {
      render(
        <QuizHeader
          quiz={defaultQuiz}
          questions={defaultQuestions}
          showValidationErrors={true}
          quizTitleEmpty={false}
          passingScoreInvalid={false}
          maxAttemptsInvalid={false}
          updateQuiz={mockUpdateQuiz}
          moduleId={mockModuleId}
        />
      );

      expect(
        screen.queryByText('Quiz title is required.')
      ).not.toBeInTheDocument();
    });

    it('should handle empty baseTitle', () => {
      const quizWithoutTitle = { ...defaultQuiz, baseTitle: '' };
      render(
        <QuizHeader
          quiz={quizWithoutTitle}
          questions={defaultQuestions}
          showValidationErrors={false}
          quizTitleEmpty={false}
          passingScoreInvalid={false}
          maxAttemptsInvalid={false}
          updateQuiz={mockUpdateQuiz}
          moduleId={mockModuleId}
        />
      );

      const titleInput = screen.getByPlaceholderText(
        /Enter quiz title/i
      ) as HTMLInputElement;
      expect(titleInput.value).toBe('');
    });
  });

  describe('Passing Score Input', () => {
    it('should render passing score input with correct value', () => {
      render(
        <QuizHeader
          quiz={defaultQuiz}
          questions={defaultQuestions}
          showValidationErrors={false}
          quizTitleEmpty={false}
          passingScoreInvalid={false}
          maxAttemptsInvalid={false}
          updateQuiz={mockUpdateQuiz}
          moduleId={mockModuleId}
        />
      );

      const passingScoreInput = screen.getByDisplayValue('70');
      expect(passingScoreInput).toBeInTheDocument();
    });

    it('should update passing score when changed', () => {
      render(
        <QuizHeader
          quiz={defaultQuiz}
          questions={defaultQuestions}
          showValidationErrors={false}
          quizTitleEmpty={false}
          passingScoreInvalid={false}
          maxAttemptsInvalid={false}
          updateQuiz={mockUpdateQuiz}
          moduleId={mockModuleId}
        />
      );

      const passingScoreInput = screen.getByDisplayValue('70');
      fireEvent.change(passingScoreInput, { target: { value: '85' } });

      expect(mockUpdateQuiz).toHaveBeenCalledWith(mockModuleId, 'quiz-1', {
        passingScore: 85,
      });
    });

    it('should handle invalid passing score input', () => {
      render(
        <QuizHeader
          quiz={defaultQuiz}
          questions={defaultQuestions}
          showValidationErrors={false}
          quizTitleEmpty={false}
          passingScoreInvalid={false}
          maxAttemptsInvalid={false}
          updateQuiz={mockUpdateQuiz}
          moduleId={mockModuleId}
        />
      );

      const passingScoreInput = screen.getByDisplayValue('70');
      fireEvent.change(passingScoreInput, { target: { value: 'invalid' } });

      expect(mockUpdateQuiz).toHaveBeenCalledWith(mockModuleId, 'quiz-1', {
        passingScore: 70,
      });
    });

    it('should default to 70 when passingScore is undefined', () => {
      const quizWithoutScore = { ...defaultQuiz, passingScore: undefined };
      render(
        <QuizHeader
          quiz={quizWithoutScore}
          questions={defaultQuestions}
          showValidationErrors={false}
          quizTitleEmpty={false}
          passingScoreInvalid={false}
          maxAttemptsInvalid={false}
          updateQuiz={mockUpdateQuiz}
          moduleId={mockModuleId}
        />
      );

      const passingScoreInput = screen.getByDisplayValue('70');
      expect(passingScoreInput).toBeInTheDocument();
    });

    it('should show validation error when passing score is invalid', () => {
      render(
        <QuizHeader
          quiz={defaultQuiz}
          questions={defaultQuestions}
          showValidationErrors={true}
          quizTitleEmpty={false}
          passingScoreInvalid={true}
          maxAttemptsInvalid={false}
          updateQuiz={mockUpdateQuiz}
          moduleId={mockModuleId}
        />
      );

      expect(
        screen.getByText('Passing score is required.')
      ).toBeInTheDocument();
    });
  });

  describe('Max Attempts Input', () => {
    it('should render max attempts input with correct value', () => {
      render(
        <QuizHeader
          quiz={defaultQuiz}
          questions={defaultQuestions}
          showValidationErrors={false}
          quizTitleEmpty={false}
          passingScoreInvalid={false}
          maxAttemptsInvalid={false}
          updateQuiz={mockUpdateQuiz}
          moduleId={mockModuleId}
        />
      );

      const maxAttemptsInput = screen.getByDisplayValue('3');
      expect(maxAttemptsInput).toBeInTheDocument();
    });

    it('should update max attempts when changed', () => {
      render(
        <QuizHeader
          quiz={defaultQuiz}
          questions={defaultQuestions}
          showValidationErrors={false}
          quizTitleEmpty={false}
          passingScoreInvalid={false}
          maxAttemptsInvalid={false}
          updateQuiz={mockUpdateQuiz}
          moduleId={mockModuleId}
        />
      );

      const maxAttemptsInput = screen.getByDisplayValue('3');
      fireEvent.change(maxAttemptsInput, { target: { value: '5' } });

      expect(mockUpdateQuiz).toHaveBeenCalledWith(mockModuleId, 'quiz-1', {
        maxAttempts: 5,
      });
    });

    it('should enforce minimum value of 1', () => {
      render(
        <QuizHeader
          quiz={defaultQuiz}
          questions={defaultQuestions}
          showValidationErrors={false}
          quizTitleEmpty={false}
          passingScoreInvalid={false}
          maxAttemptsInvalid={false}
          updateQuiz={mockUpdateQuiz}
          moduleId={mockModuleId}
        />
      );

      const maxAttemptsInput = screen.getByDisplayValue('3');
      fireEvent.change(maxAttemptsInput, { target: { value: '0' } });

      expect(mockUpdateQuiz).toHaveBeenCalledWith(mockModuleId, 'quiz-1', {
        maxAttempts: 1,
      });
    });

    it('should handle invalid max attempts input', () => {
      render(
        <QuizHeader
          quiz={defaultQuiz}
          questions={defaultQuestions}
          showValidationErrors={false}
          quizTitleEmpty={false}
          passingScoreInvalid={false}
          maxAttemptsInvalid={false}
          updateQuiz={mockUpdateQuiz}
          moduleId={mockModuleId}
        />
      );

      const maxAttemptsInput = screen.getByDisplayValue('3');
      fireEvent.change(maxAttemptsInput, { target: { value: 'invalid' } });

      expect(mockUpdateQuiz).toHaveBeenCalledWith(mockModuleId, 'quiz-1', {
        maxAttempts: 1,
      });
    });

    it('should toggle unlimited attempts checkbox', () => {
      render(
        <QuizHeader
          quiz={defaultQuiz}
          questions={defaultQuestions}
          showValidationErrors={false}
          quizTitleEmpty={false}
          passingScoreInvalid={false}
          maxAttemptsInvalid={false}
          updateQuiz={mockUpdateQuiz}
          moduleId={mockModuleId}
        />
      );

      const unlimitedCheckbox = screen.getByRole('checkbox', {
        name: /Unlimited attempts/i,
      });
      fireEvent.click(unlimitedCheckbox);

      expect(mockUpdateQuiz).toHaveBeenCalledWith(mockModuleId, 'quiz-1', {
        maxAttempts: null,
      });
    });

    it('should show "-" when unlimited attempts is enabled', () => {
      const quizWithUnlimited = { ...defaultQuiz, maxAttempts: null };
      render(
        <QuizHeader
          quiz={quizWithUnlimited}
          questions={defaultQuestions}
          showValidationErrors={false}
          quizTitleEmpty={false}
          passingScoreInvalid={false}
          maxAttemptsInvalid={false}
          updateQuiz={mockUpdateQuiz}
          moduleId={mockModuleId}
        />
      );

      const maxAttemptsInput = screen.getByDisplayValue('-');
      expect(maxAttemptsInput).toBeInTheDocument();
      expect(maxAttemptsInput).toHaveAttribute('readOnly');
    });

    it('should uncheck unlimited when setting back to number', () => {
      const quizWithUnlimited = { ...defaultQuiz, maxAttempts: null };
      render(
        <QuizHeader
          quiz={quizWithUnlimited}
          questions={defaultQuestions}
          showValidationErrors={false}
          quizTitleEmpty={false}
          passingScoreInvalid={false}
          maxAttemptsInvalid={false}
          updateQuiz={mockUpdateQuiz}
          moduleId={mockModuleId}
        />
      );

      const unlimitedCheckbox = screen.getByRole('checkbox', {
        name: /Unlimited attempts/i,
      });
      fireEvent.click(unlimitedCheckbox);

      expect(mockUpdateQuiz).toHaveBeenCalledWith(mockModuleId, 'quiz-1', {
        maxAttempts: 1,
      });
    });

    it('should show validation error when max attempts is invalid', () => {
      render(
        <QuizHeader
          quiz={defaultQuiz}
          questions={defaultQuestions}
          showValidationErrors={true}
          quizTitleEmpty={false}
          passingScoreInvalid={false}
          maxAttemptsInvalid={true}
          updateQuiz={mockUpdateQuiz}
          moduleId={mockModuleId}
        />
      );

      expect(
        screen.getByText('Must be at least 1 or set to unlimited.')
      ).toBeInTheDocument();
    });
  });

  describe('Total Points Display', () => {
    it('should calculate and display total points correctly', () => {
      render(
        <QuizHeader
          quiz={defaultQuiz}
          questions={defaultQuestions}
          showValidationErrors={false}
          quizTitleEmpty={false}
          passingScoreInvalid={false}
          maxAttemptsInvalid={false}
          updateQuiz={mockUpdateQuiz}
          moduleId={mockModuleId}
        />
      );

      expect(screen.getByText('15 points')).toBeInTheDocument();
    });

    it('should show 0 points when no questions', () => {
      render(
        <QuizHeader
          quiz={defaultQuiz}
          questions={[]}
          showValidationErrors={false}
          quizTitleEmpty={false}
          passingScoreInvalid={false}
          maxAttemptsInvalid={false}
          updateQuiz={mockUpdateQuiz}
          moduleId={mockModuleId}
        />
      );

      expect(screen.getByText('0 points')).toBeInTheDocument();
    });

    it('should handle questions without points', () => {
      const questionsWithoutPoints = [
        { id: 'q1', text: 'Question 1', type: 'multiple-choice' },
        { id: 'q2', text: 'Question 2', type: 'true-false', points: 5 },
      ];

      render(
        <QuizHeader
          quiz={defaultQuiz}
          questions={questionsWithoutPoints}
          showValidationErrors={false}
          quizTitleEmpty={false}
          passingScoreInvalid={false}
          maxAttemptsInvalid={false}
          updateQuiz={mockUpdateQuiz}
          moduleId={mockModuleId}
        />
      );

      expect(screen.getByText('5 points')).toBeInTheDocument();
    });
  });

  describe('Short Answer Quiz Notice', () => {
    it('should show manual grading notice when quiz has short-answer questions', () => {
      const questionsWithShortAnswer = [
        ...defaultQuestions,
        {
          id: 'q3',
          text: 'Explain React hooks',
          type: 'short-answer',
          points: 20,
        },
      ];

      render(
        <QuizHeader
          quiz={defaultQuiz}
          questions={questionsWithShortAnswer}
          showValidationErrors={false}
          quizTitleEmpty={false}
          passingScoreInvalid={false}
          maxAttemptsInvalid={false}
          updateQuiz={mockUpdateQuiz}
          moduleId={mockModuleId}
        />
      );

      expect(screen.getByText('Manual Grading Required')).toBeInTheDocument();
      expect(
        screen.getByText(/This quiz contains short-answer questions/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/1 attempt/i)).toBeInTheDocument();
    });

    it('should not show notice when no short-answer questions', () => {
      render(
        <QuizHeader
          quiz={defaultQuiz}
          questions={defaultQuestions}
          showValidationErrors={false}
          quizTitleEmpty={false}
          passingScoreInvalid={false}
          maxAttemptsInvalid={false}
          updateQuiz={mockUpdateQuiz}
          moduleId={mockModuleId}
        />
      );

      expect(
        screen.queryByText('Manual Grading Required')
      ).not.toBeInTheDocument();
    });

    it('should show notice with multiple short-answer questions', () => {
      const questionsWithMultipleShortAnswer = [
        {
          id: 'q1',
          text: 'Explain React',
          type: 'short-answer',
          points: 10,
        },
        {
          id: 'q2',
          text: 'Explain hooks',
          type: 'short-answer',
          points: 10,
        },
      ];

      render(
        <QuizHeader
          quiz={defaultQuiz}
          questions={questionsWithMultipleShortAnswer}
          showValidationErrors={false}
          quizTitleEmpty={false}
          passingScoreInvalid={false}
          maxAttemptsInvalid={false}
          updateQuiz={mockUpdateQuiz}
          moduleId={mockModuleId}
        />
      );

      expect(screen.getByText('Manual Grading Required')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have required field indicators', () => {
      render(
        <QuizHeader
          quiz={defaultQuiz}
          questions={defaultQuestions}
          showValidationErrors={false}
          quizTitleEmpty={false}
          passingScoreInvalid={false}
          maxAttemptsInvalid={false}
          updateQuiz={mockUpdateQuiz}
          moduleId={mockModuleId}
        />
      );

      const requiredLabels = screen.getAllByText('*');
      expect(requiredLabels.length).toBeGreaterThan(0);
    });

    it('should have proper label associations', () => {
      render(
        <QuizHeader
          quiz={defaultQuiz}
          questions={defaultQuestions}
          showValidationErrors={false}
          quizTitleEmpty={false}
          passingScoreInvalid={false}
          maxAttemptsInvalid={false}
          updateQuiz={mockUpdateQuiz}
          moduleId={mockModuleId}
        />
      );

      expect(screen.getByText(/Quiz Title/i)).toBeInTheDocument();
      expect(screen.getByText(/Passing Score/i)).toBeInTheDocument();
      expect(screen.getByText(/Max Attempts/i)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null quiz object', () => {
      render(
        <QuizHeader
          quiz={null as any}
          questions={defaultQuestions}
          showValidationErrors={false}
          quizTitleEmpty={false}
          passingScoreInvalid={false}
          maxAttemptsInvalid={false}
          updateQuiz={mockUpdateQuiz}
          moduleId={mockModuleId}
        />
      );

      const titleInput = screen.getByPlaceholderText(
        /Enter quiz title/i
      ) as HTMLInputElement;
      expect(titleInput.value).toBe('');
    });

    it('should handle empty questions array', () => {
      render(
        <QuizHeader
          quiz={defaultQuiz}
          questions={[]}
          showValidationErrors={false}
          quizTitleEmpty={false}
          passingScoreInvalid={false}
          maxAttemptsInvalid={false}
          updateQuiz={mockUpdateQuiz}
          moduleId={mockModuleId}
        />
      );

      expect(screen.getByText('0 points')).toBeInTheDocument();
    });

    it('should handle very large point values', () => {
      const questionsWithLargePoints = [
        { id: 'q1', text: 'Question 1', type: 'multiple-choice', points: 9999 },
        { id: 'q2', text: 'Question 2', type: 'true-false', points: 9999 },
      ];

      render(
        <QuizHeader
          quiz={defaultQuiz}
          questions={questionsWithLargePoints}
          showValidationErrors={false}
          quizTitleEmpty={false}
          passingScoreInvalid={false}
          maxAttemptsInvalid={false}
          updateQuiz={mockUpdateQuiz}
          moduleId={mockModuleId}
        />
      );

      expect(screen.getByText('19998 points')).toBeInTheDocument();
    });

    it('should defaultMaxAttempts to 1 when undefined', () => {
      const quizWithoutAttempts = { ...defaultQuiz, maxAttempts: undefined };
      render(
        <QuizHeader
          quiz={quizWithoutAttempts}
          questions={defaultQuestions}
          showValidationErrors={false}
          quizTitleEmpty={false}
          passingScoreInvalid={false}
          maxAttemptsInvalid={false}
          updateQuiz={mockUpdateQuiz}
          moduleId={mockModuleId}
        />
      );

      const maxAttemptsInput = screen.getByDisplayValue('1');
      expect(maxAttemptsInput).toBeInTheDocument();
    });
  });
});

import { fireEvent, render, screen } from '@testing-library/react';
import { QuizHeader } from '@/components/CourseBuilder/Quiz/QuizHeader';

describe('QuizHeader', () => {
  const updateQuiz = vi.fn();

  const quiz = {
    id: 'quiz1',
    baseTitle: 'Quiz Title',
    passingScore: 70,
    maxAttempts: 1,
  };

  it('renders fields and total points', () => {
    render(
      <QuizHeader
        quiz={quiz}
        questions={[{ points: 3 }, { points: 2 }]}
        showValidationErrors={false}
        quizTitleEmpty={false}
        passingScoreInvalid={false}
        maxAttemptsInvalid={false}
        updateQuiz={updateQuiz}
        moduleId="m1"
      />,
    );

    expect(screen.getByDisplayValue('Quiz Title')).toBeInTheDocument();
    expect(screen.getByText('5 points')).toBeInTheDocument();
  });

  it('updates title and passing score', () => {
    render(
      <QuizHeader
        quiz={quiz}
        questions={[]}
        showValidationErrors={false}
        quizTitleEmpty={false}
        passingScoreInvalid={false}
        maxAttemptsInvalid={false}
        updateQuiz={updateQuiz}
        moduleId="m1"
      />,
    );

    fireEvent.change(screen.getByDisplayValue('Quiz Title'), {
      target: { value: 'New title' },
    });
    expect(updateQuiz).toHaveBeenCalledWith('m1', 'quiz1', {
      baseTitle: 'New title',
    });

    fireEvent.change(screen.getByDisplayValue('70'), {
      target: { value: '85' },
    });
    expect(updateQuiz).toHaveBeenCalledWith('m1', 'quiz1', {
      passingScore: 85,
    });
  });
});
