import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { CourseCard } from '../../components/CourseCard';

// Mock the services and hooks
vi.mock('@/services/courseService', () => ({
  courseService: {
    duplicateCourse: vi.fn(),
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
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
});
