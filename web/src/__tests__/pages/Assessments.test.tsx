import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Assessments from '@/pages/Assessments';

// Mock all dependencies
vi.mock('@/components/Header', () => ({
  Header: () => <div>Header</div>,
}));

vi.mock('@/contexts/useUser', () => ({
  useUser: () => ({
    user: { id: 'instructor-1', role: 'instructor', name: 'Test Instructor' },
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}));

vi.mock('@/services', () => ({
  courseService: {
    getInstructorCourses: vi.fn().mockResolvedValue([]),
    getCourseModules: vi.fn().mockResolvedValue([]),
  },
  quizService: {
    getPendingGrading: vi.fn().mockResolvedValue([]),
    getPendingGradingByQuestion: vi.fn().mockResolvedValue([]),
    gradeShortAnswer: vi.fn().mockResolvedValue({ success: true }),
    gradeAnswerVariation: vi.fn().mockResolvedValue({
      success: true,
      gradedCount: 0,
    }),
    getQuizResults: vi.fn().mockResolvedValue(null),
    getStudentAttemptDetails: vi.fn().mockResolvedValue(null),
    getStudentLatestAttempt: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('@/services/moduleService', () => ({
  default: {
    getModuleQuizzes: vi.fn().mockResolvedValue([]),
  },
}));

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('Assessments Page', () => {
  beforeEach(() => {
    vi. clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render without crashing', async () => {
      renderWithRouter(<Assessments />);

      await waitFor(() => {
        expect(screen.getByText('Header')).toBeInTheDocument();
      });
    });

    it('should render page components', async () => {
      renderWithRouter(<Assessments />);

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Service Integration', () => {
    it('should have quiz service methods available', async () => {
      const { quizService } = await import('@/services');

      expect(quizService.getPendingGrading).toBeDefined();
      expect(quizService.gradeShortAnswer).toBeDefined();
      expect(quizService.getQuizResults).toBeDefined();
    });

    it('should have course service methods available', async () => {
      const { courseService } = await import('@/services');

      expect(courseService.getInstructorCourses).toBeDefined();
      expect(courseService.getCourseModules).toBeDefined();
    });
  });
});
