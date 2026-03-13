import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ErrorBanner } from './ErrorBanner';

describe('ErrorBanner', () => {
  it('does not render when validation is off', () => {
    const { container } = render(
      <ErrorBanner
        showValidationErrors={false}
        totalErrorCount={1}
        questionErrorsMap={new Map([['q1', ['Missing text']]])}
        questions={[{ id: 'q1' }]}
        onNavigateToQuestion={vi.fn()}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders errors and supports navigation', () => {
    const onNavigateToQuestion = vi.fn();

    render(
      <ErrorBanner
        showValidationErrors
        totalErrorCount={2}
        questionErrorsMap={
          new Map([['q1', ['Missing text', 'Missing answer']]])
        }
        questions={[{ id: 'q1' }]}
        onNavigateToQuestion={onNavigateToQuestion}
      />,
    );

    expect(screen.getByText('2 errors found in questions')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Question 1' }));
    expect(onNavigateToQuestion).toHaveBeenCalledWith(0);
  });
});
