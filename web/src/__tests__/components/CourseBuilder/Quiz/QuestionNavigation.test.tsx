import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QuestionNavigation } from '../../../../components/CourseBuilder/Quiz/QuestionNavigation';

describe('QuestionNavigation', () => {
  it('disables previous at first question', () => {
    render(
      <QuestionNavigation
        currentIndex={0}
        questionsLength={3}
        handlePrev={vi.fn()}
        handleNext={vi.fn()}
        onAddQuestion={vi.fn()}
      />,
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toBeDisabled();
  });

  it('calls next and add handlers', () => {
    const handleNext = vi.fn();
    const onAddQuestion = vi.fn();

    render(
      <QuestionNavigation
        currentIndex={1}
        questionsLength={3}
        handlePrev={vi.fn()}
        handleNext={handleNext}
        onAddQuestion={onAddQuestion}
      />,
    );

    fireEvent.click(screen.getAllByRole('button')[1]);
    expect(handleNext).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Add Question' }));
    expect(onAddQuestion).toHaveBeenCalledTimes(1);
  });
});
