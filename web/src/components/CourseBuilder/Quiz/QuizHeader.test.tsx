import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QuizHeader } from './QuizHeader';

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
