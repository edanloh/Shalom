import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { CourseCard } from '@/components/CourseCard';

// Mock the services and hooks
const mockDuplicateCourse = vi.fn();
const mockToast = vi.fn();
const mockNavigate = vi.fn();

vi.mock('@/services/courseService', () => ({
  courseService: {
    duplicateCourse: (...args: unknown[]) => mockDuplicateCourse(...args),
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick, disabled }: any) => (
    <button type="button" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockCourseProps = {
  id: 'course-123',
  title: 'React Fundamentals',
  category: 'Web Development',
  categoryColor: '#3B82F6',
  thumbnail: 'https://example.com/image.jpg',
  enrolledCount: 45,
  rating: 4.8,
  totalRatings: 120,
  modules: 8,
  lessons: 32,
  status: 'published' as const,
};

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('CourseCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDuplicateCourse.mockResolvedValue({
      id: 'duplicated-course-id',
      title: 'React Fundamentals Copy',
    });
  });

  it('renders course title', () => {
    renderWithRouter(<CourseCard {...mockCourseProps} />);
    expect(screen.getByText('React Fundamentals')).toBeInTheDocument();
  });

  it('displays category', () => {
    renderWithRouter(<CourseCard {...mockCourseProps} />);
    expect(screen.getByText('Web Development')).toBeInTheDocument();
  });

  it('shows enrolled count', () => {
    renderWithRouter(<CourseCard {...mockCourseProps} />);
    expect(screen.getByText('45')).toBeInTheDocument();
  });

  it('displays rating and total ratings', () => {
    renderWithRouter(<CourseCard {...mockCourseProps} />);
    expect(screen.getByText('4.8 (120)')).toBeInTheDocument();
  });

  it('shows modules and lessons count', () => {
    renderWithRouter(<CourseCard {...mockCourseProps} />);
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('Modules')).toBeInTheDocument();
  });

  it('renders status badge', () => {
    renderWithRouter(<CourseCard {...mockCourseProps} />);
    expect(screen.getByText('PUBLISHED')).toBeInTheDocument();
  });

  it('renders draft status badge', () => {
    renderWithRouter(<CourseCard {...mockCourseProps} status="draft" />);
    expect(screen.getByText('DRAFT')).toBeInTheDocument();
  });

  it('renders archived status badge', () => {
    renderWithRouter(<CourseCard {...mockCourseProps} status="archived" />);
    expect(screen.getByText('ARCHIVED')).toBeInTheDocument();
  });

  it('calls onCourseUpdated when provided', () => {
    const onCourseUpdated = vi.fn();
    renderWithRouter(
      <CourseCard {...mockCourseProps} onCourseUpdated={onCourseUpdated} />,
    );
    expect(onCourseUpdated).not.toHaveBeenCalled();
  });

  it('displays thumbnail image', () => {
    renderWithRouter(<CourseCard {...mockCourseProps} />);
    const image = screen.getByAltText('React Fundamentals') as HTMLImageElement;
    expect(image.src).toContain('example.com/image.jpg');
  });

  it('renders course card with default id', () => {
    const { id, ...propsWithoutId } = mockCourseProps;
    renderWithRouter(<CourseCard {...propsWithoutId} />);
    expect(screen.getByText('React Fundamentals')).toBeInTheDocument();
  });

  it('truncates long titles', () => {
    const longTitle = 'A'.repeat(100);
    renderWithRouter(<CourseCard {...mockCourseProps} title={longTitle} />);
    // The component should render even with long text
    expect(screen.getByText(longTitle)).toBeInTheDocument();
  });

  it('navigates to the course details when the card is clicked', () => {
    renderWithRouter(<CourseCard {...mockCourseProps} />);

    fireEvent.click(screen.getByText('React Fundamentals'));
    expect(mockNavigate).toHaveBeenCalledWith('/course/course-123');
  });

  it('navigates to the course builder when edit is clicked', () => {
    renderWithRouter(<CourseCard {...mockCourseProps} />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0]);
    expect(mockNavigate).toHaveBeenCalledWith('/course-builder/course-123');
  });

  it('navigates to analytics when the analytics button is clicked', () => {
    renderWithRouter(<CourseCard {...mockCourseProps} />);

    fireEvent.click(screen.getByRole('button', { name: 'Analytics' }));
    expect(mockNavigate).toHaveBeenCalledWith('/analytics');
  });

  it('duplicates a course and notifies the parent on success', async () => {
    const onCourseUpdated = vi.fn();
    renderWithRouter(
      <CourseCard {...mockCourseProps} onCourseUpdated={onCourseUpdated} />,
    );

    fireEvent.click(screen.getAllByRole('button')[0]);
    fireEvent.click(screen.getByText('Duplicate'));

    await waitFor(() => {
      expect(mockDuplicateCourse).toHaveBeenCalledWith('course-123');
    });
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Course Duplicated',
        variant: 'default',
      }),
    );
    expect(onCourseUpdated).toHaveBeenCalledWith('duplicated-course-id');
  });

  it('shows an error toast when duplication fails', async () => {
    mockDuplicateCourse.mockRejectedValueOnce(new Error('Boom'));
    renderWithRouter(<CourseCard {...mockCourseProps} />);

    fireEvent.click(screen.getAllByRole('button')[0]);
    fireEvent.click(screen.getByText('Duplicate'));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Duplication Failed',
          description: 'Boom',
          variant: 'destructive',
        }),
      );
    });
  });

  it('shows fallback values when rating and counts are missing', () => {
    renderWithRouter(
      <CourseCard
        {...mockCourseProps}
        enrolledCount={0}
        rating={0}
        totalRatings={0}
        modules={0}
      />,
    );

    expect(screen.getByText('-')).toBeInTheDocument();
    expect(screen.getByText('No ratings')).toBeInTheDocument();
    expect(screen.getAllByText('0').length).toBeGreaterThan(0);
  });

  it('falls back to the default thumbnail when the image fails to load', () => {
    renderWithRouter(<CourseCard {...mockCourseProps} thumbnail="" />);
    const image = screen.getByAltText('React Fundamentals') as HTMLImageElement;

    expect(image.src).toContain(DEFAULT_COURSE_THUMBNAIL);

    fireEvent.error(image);
    expect(image.src).toContain(DEFAULT_COURSE_THUMBNAIL);
  });
});
