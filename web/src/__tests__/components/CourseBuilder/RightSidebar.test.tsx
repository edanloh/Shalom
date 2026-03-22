import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { RightSidebar } from '../../../components/CourseBuilder/RightSidebar';

const mockUseCourseBuilder = vi.fn();

vi.mock('./useCourseBuilder', () => ({
  useCourseBuilder: () => mockUseCourseBuilder(),
}));

vi.mock('../../hooks/useCategories', () => ({
  useCategories: () => ({
    categories: [{ id: 'general-id', name: 'General', color: '#ec4899' }],
    loading: false,
    error: null,
  }),
}));

vi.mock('@/services/categoryService', () => ({
  default: {
    getAffectedCourses: vi.fn().mockResolvedValue([]),
  },
}));

describe('RightSidebar', () => {
  const setCourseName = vi.fn();
  const setCourseDescription = vi.fn();
  const setCourseOutcomes = vi.fn();
  const setCourseCategory = vi.fn();
  const setCourseThumbnailUrl = vi.fn();
  const setCourseStatus = vi.fn();
  const setHasUnsavedChanges = vi.fn();
  const setIsResizing = vi.fn();
  const setRightSidebarWidth = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseCourseBuilder.mockReturnValue({
      rightSidebarWidth: 30,
      setRightSidebarWidth,
      isResizing: null,
      setIsResizing,
      modules: [{ id: 'm1', lessons: [], quizzes: [] }],
      courseName: 'My Course',
      setCourseName,
      courseDescription: 'My Description',
      setCourseDescription,
      courseOutcomes: [],
      setCourseOutcomes,
      showValidationErrors: false,
      courseCategory: 'general-id',
      setCourseCategory,
      courseThumbnailUrl: '',
      setCourseThumbnailUrl,
      courseStatus: 'draft',
      setCourseStatus,
      setHasUnsavedChanges,
      pendingCategoryChanges: { created: [], updated: [], deleted: [] },
      setPendingCategoryChanges: vi.fn(),
      revertCategoryChanges: vi.fn(),
      originalCourseCategory: 'general-id',
      localCategories: [
        { id: 'general-id', name: 'General', color: '#ec4899' },
      ],
      setLocalCategories: vi.fn(),
    });
  });

  it('renders course info fields', () => {
    render(<RightSidebar />);

    expect(screen.getByText('Course Info')).toBeInTheDocument();
    expect(screen.getByText('Course Title')).toBeInTheDocument();
    expect(screen.getByDisplayValue('My Course')).toBeInTheDocument();
  });

  it('updates course title and marks unsaved changes', () => {
    render(<RightSidebar />);

    fireEvent.change(screen.getByDisplayValue('My Course'), {
      target: { value: 'Updated Course' },
    });

    expect(setCourseName).toHaveBeenCalledWith('Updated Course');
    expect(setHasUnsavedChanges).toHaveBeenCalledWith(true);
  });

  it('toggles publication status card', () => {
    render(<RightSidebar />);

    fireEvent.click(screen.getByText('Hidden from students'));

    expect(setCourseStatus).toHaveBeenCalledWith('published');
    expect(setHasUnsavedChanges).toHaveBeenCalledWith(true);
  });

  it('opens add category modal', () => {
    render(<RightSidebar />);

    fireEvent.click(screen.getByRole('button', { name: 'New' }));

    expect(screen.getByText('New Category')).toBeInTheDocument();
  });
});
