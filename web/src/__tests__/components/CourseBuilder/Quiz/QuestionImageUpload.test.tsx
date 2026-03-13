import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QuestionImageUpload } from '@/components/CourseBuilder/Quiz/QuestionImageUpload';

const mockUseCourseBuilder = vi.fn();

vi.mock('@/components/CourseBuilder/useCourseBuilder', () => ({
  useCourseBuilder: () => mockUseCourseBuilder(),
}));

vi.mock('@/services/storageService', () => ({
  StorageService: {
    uploadQuestionImage: vi
      .fn()
      .mockResolvedValue({ url: 'https://bucket/image.jpg', error: null }),
  },
}));

describe('QuestionImageUpload', () => {
  const updateQuestion = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCourseBuilder.mockReturnValue({ currentCourseId: 'course1' });
    (globalThis as any).fetch = vi.fn();
    (window as any).__questionImageCache = new Map();
  });

  it('renders URL mode controls by default', () => {
    render(
      <QuestionImageUpload
        currentQuestion={{ id: 'q1', imageUrl: '' }}
        updateQuestion={updateQuestion}
        moduleId="m1"
        quizId="quiz1"
        questionImagePreviewUrl=""
      />,
    );

    expect(screen.getByRole('button', { name: 'URL' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Upload File' }),
    ).toBeInTheDocument();
  });

  it('shows invalid URL error', async () => {
    render(
      <QuestionImageUpload
        currentQuestion={{ id: 'q1', imageUrl: '' }}
        updateQuestion={updateQuestion}
        moduleId="m1"
        quizId="quiz1"
        questionImagePreviewUrl=""
      />,
    );

    fireEvent.change(
      screen.getByPlaceholderText('https://example.com/image.jpg'),
      {
        target: { value: 'not-a-url' },
      },
    );

    await waitFor(() => {
      expect(screen.getByText('Invalid URL format')).toBeInTheDocument();
    });
  });
});
