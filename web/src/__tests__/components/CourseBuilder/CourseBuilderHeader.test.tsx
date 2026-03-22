import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CourseBuilderHeader } from '../../../components/CourseBuilder/CourseBuilderHeader';

const mockUseCourseBuilder = vi.fn();
const mockNavigate = vi.fn();

vi.mock('./useCourseBuilder', () => ({
  useCourseBuilder: () => mockUseCourseBuilder(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('CourseBuilderHeader', () => {
  const setPreviewMode = vi.fn();
  const saveCourse = vi.fn();
  const showModal = vi.fn();

  const modules = [
    {
      id: 'm1',
      lessons: [{ id: 'l1' }, { id: 'l2' }],
      quizzes: [
        {
          id: 'q1',
          questions: [
            { id: 'qu1', points: 10 },
            { id: 'qu2', points: 5 },
          ],
        },
      ],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    saveCourse.mockResolvedValue({ success: true, courseId: 'course-1' });

    mockUseCourseBuilder.mockReturnValue({
      courseName: 'React Basics',
      previewMode: false,
      setPreviewMode,
      modules,
      saveCourse,
      isSaving: false,
      showModal,
      hasUnsavedChanges: true,
      pendingCategoryChanges: {
        created: [],
        updated: [],
        deleted: [],
      },
    });
  });

  it('renders course name and computed stats', () => {
    render(<CourseBuilderHeader />);

    expect(screen.getByText('React Basics')).toBeInTheDocument();
    expect(screen.getByText('1 modules')).toBeInTheDocument();
    expect(screen.getByText('2 lessons')).toBeInTheDocument();
    expect(screen.getByText('1 quizzes')).toBeInTheDocument();
    expect(screen.getByText('Total: 15 points')).toBeInTheDocument();
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
  });

  it('navigates back when go back button is clicked', () => {
    render(<CourseBuilderHeader />);

    fireEvent.click(screen.getByRole('button', { name: 'Go back' }));

    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it('toggles preview mode', () => {
    render(<CourseBuilderHeader />);

    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));

    expect(setPreviewMode).toHaveBeenCalledWith(true);
  });

  it('disables save button while saving', () => {
    mockUseCourseBuilder.mockReturnValue({
      courseName: 'React Basics',
      previewMode: false,
      setPreviewMode,
      modules,
      saveCourse,
      isSaving: true,
      showModal,
      hasUnsavedChanges: false,
      pendingCategoryChanges: {
        created: [],
        updated: [],
        deleted: [],
      },
    });

    render(<CourseBuilderHeader />);

    const button = screen.getByRole('button', { name: 'Saving...' });
    expect(button).toBeDisabled();
  });

  it('opens save confirmation modal when Save is clicked', () => {
    render(<CourseBuilderHeader />);

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(showModal).toHaveBeenCalledTimes(1);
    expect(showModal.mock.calls[0][0]).toMatchObject({
      title: 'Save Course?',
      type: 'warning',
      confirmText: 'Save Changes',
      showCancel: true,
    });
    expect(showModal.mock.calls[0][0].onConfirm).toBeTypeOf('function');
  });

  it('shows success modal after successful save', async () => {
    render(<CourseBuilderHeader />);

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    const firstModalConfig = showModal.mock.calls[0][0];
    await firstModalConfig.onConfirm();

    await waitFor(() => {
      expect(showModal).toHaveBeenCalledTimes(2);
    });

    expect(showModal.mock.calls[1][0]).toMatchObject({
      title: 'Success!',
      type: 'success',
      message: 'Course saved successfully!',
    });
  });

  it('shows validation error modal when save returns validation errors', async () => {
    saveCourse.mockResolvedValue({
      success: false,
      validationErrors: ['Course title is required'],
    });

    render(<CourseBuilderHeader />);

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    const firstModalConfig = showModal.mock.calls[0][0];
    await firstModalConfig.onConfirm();

    await waitFor(() => {
      expect(showModal).toHaveBeenCalledTimes(2);
    });

    expect(showModal.mock.calls[1][0]).toMatchObject({
      title: 'Save Failed',
      type: 'error',
      confirmText: 'OK',
    });
  });
});
