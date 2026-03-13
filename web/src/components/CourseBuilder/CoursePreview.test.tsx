import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { CoursePreview } from './CoursePreview';

const mockUseCourseBuilder = vi.fn();

vi.mock('./useCourseBuilder', () => ({
  useCourseBuilder: () => mockUseCourseBuilder(),
}));

describe('CoursePreview', () => {
  const setPreviewMode = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCourseBuilder.mockReturnValue({
      courseName: 'Preview Course',
      courseDescription: 'Preview description',
      courseThumbnailUrl: '',
      setPreviewMode,
      modules: [
        {
          id: 'm1',
          title: 'Module 1',
          lessons: [
            {
              id: 'l1',
              type: 'video',
              title: 'Lesson 1.1: Intro',
              durationSeconds: 120,
            },
          ],
          quizzes: [
            { id: 'q1', title: 'Quiz 1.1: Basics', questions: [{ id: 'qq1' }] },
          ],
        },
      ],
      courseCategory: '',
      localCategories: [],
      courseOutcomes: ['Outcome A'],
    });
  });

  it('renders preview header and stats', () => {
    render(<CoursePreview />);

    expect(screen.getByText('Course Preview')).toBeInTheDocument();
    expect(
      screen.getByText('1 modules • 1 lessons • 1 quizzes'),
    ).toBeInTheDocument();
  });

  it('goes back to editor when back button is clicked', () => {
    render(<CoursePreview />);

    fireEvent.click(screen.getByRole('button', { name: 'Back to Editor' }));

    expect(setPreviewMode).toHaveBeenCalledWith(false);
  });

  it('expands module content on click', () => {
    render(<CoursePreview />);

    fireEvent.click(screen.getByText('Module 1'));

    expect(screen.getByText('Intro')).toBeInTheDocument();
  });
});
