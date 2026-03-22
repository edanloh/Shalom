import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { OptionsEditor } from '../../../../components/CourseBuilder/Quiz/OptionsEditor';

describe('OptionsEditor', () => {
  const updateQuestion = vi.fn();
  const addOption = vi.fn();
  const removeOption = vi.fn();

  it('returns null for unsupported question type', () => {
    const { container } = render(
      <OptionsEditor
        currentQuestion={{ id: 'q1', type: 'short-answer' }}
        showValidationErrors={false}
        updateQuestion={updateQuestion}
        addOption={addOption}
        removeOption={removeOption}
        moduleId="m1"
        quizId="quiz1"
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it('updates correct answer in true-false mode', () => {
    render(
      <OptionsEditor
        currentQuestion={{ id: 'q1', type: 'true-false', correctAnswer: null }}
        showValidationErrors={false}
        updateQuestion={updateQuestion}
        addOption={addOption}
        removeOption={removeOption}
        moduleId="m1"
        quizId="quiz1"
      />,
    );

    fireEvent.click(screen.getByText('True'));

    expect(updateQuestion).toHaveBeenCalledWith(
      'm1',
      'quiz1',
      'q1',
      'correctAnswer',
      0,
    );
  });

  it('calls addOption button for multiple-choice', () => {
    render(
      <OptionsEditor
        currentQuestion={{
          id: 'q1',
          type: 'multiple-choice',
          options: ['A', 'B'],
          correctAnswer: 0,
        }}
        showValidationErrors={false}
        updateQuestion={updateQuestion}
        addOption={addOption}
        removeOption={removeOption}
        moduleId="m1"
        quizId="quiz1"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '+ Add Option' }));

    expect(addOption).toHaveBeenCalledWith('m1', 'quiz1', 'q1');
  });
});
