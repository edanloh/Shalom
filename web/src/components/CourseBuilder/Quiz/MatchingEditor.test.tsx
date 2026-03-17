import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MatchingEditor } from './MatchingEditor';

describe('MatchingEditor', () => {
  const updateQuestion = vi.fn();

  const currentQuestion = {
    id: 'q1',
    matchingPairs: [{ left: 'A', right: '1' }],
  };

  it('renders matching fields', () => {
    render(
      <MatchingEditor
        currentQuestion={currentQuestion}
        showValidationErrors={false}
        updateQuestion={updateQuestion}
        moduleId="m1"
        quizId="quiz1"
      />,
    );

    expect(screen.getByDisplayValue('A')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1')).toBeInTheDocument();
  });

  it('adds a matching pair', () => {
    render(
      <MatchingEditor
        currentQuestion={currentQuestion}
        showValidationErrors={false}
        updateQuestion={updateQuestion}
        moduleId="m1"
        quizId="quiz1"
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: '+ Add Matching Pair' }),
    );

    expect(updateQuestion).toHaveBeenCalledWith(
      'm1',
      'quiz1',
      'q1',
      'matchingPairs',
      [
        { left: 'A', right: '1' },
        { left: '', right: '' },
      ],
    );
  });
});
