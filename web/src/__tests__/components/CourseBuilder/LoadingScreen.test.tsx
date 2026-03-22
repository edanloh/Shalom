import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingScreen } from '@/components/CourseBuilder/LoadingScreen';
import { Colors } from '@/constants/Colors';

describe('LoadingScreen', () => {
  it('renders loading title and message', () => {
    render(<LoadingScreen />);

    expect(screen.getByText('Loading Course...')).toBeInTheDocument();
    expect(
      screen.getByText('Please wait while we fetch your course content'),
    ).toBeInTheDocument();
  });

  it('applies expected background color style', () => {
    const { container } = render(<LoadingScreen />);
    const root = container.firstChild as HTMLElement;

    expect(root).toHaveStyle({ backgroundColor: Colors.primary });
  });
});
