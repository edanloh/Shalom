import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QuestionCardHeader } from '@/components/CourseBuilder/Quiz/QuestionCardHeader';

describe('QuestionCardHeader', () => {
  it('renders header and error badge/list', () => {
    render(
      <QuestionCardHeader
        currentIndex={1}
        currentQuestion={{ id: 'q2' }}
        showValidationErrors
        questionErrorsMap={
          new Map([['q2', ['Missing text', 'Missing answer']]])
        }
        onDeleteQuestion={vi.fn()}
      />,
    );

    expect(screen.getByText('Question 2')).toBeInTheDocument();
    expect(screen.getByText('2 errors')).toBeInTheDocument();
    expect(screen.getByText('• Missing text')).toBeInTheDocument();
  });

  it('calls delete handler', () => {
    const onDeleteQuestion = vi.fn();

    render(
      <QuestionCardHeader
        currentIndex={0}
        currentQuestion={{ id: 'q1' }}
        showValidationErrors={false}
        questionErrorsMap={new Map()}
        onDeleteQuestion={onDeleteQuestion}
      />,
    );

    fireEvent.click(screen.getByRole('button'));
    expect(onDeleteQuestion).toHaveBeenCalledTimes(1);
  });
});
