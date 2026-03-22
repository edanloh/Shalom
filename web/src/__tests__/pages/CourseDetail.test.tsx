import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import CourseDetail from '@/pages/CourseDetail';
import { AuthProvider } from '@/contexts/AuthContext';
import { UserProvider } from '@/contexts/UserContext';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: '1', email: 'student@test.com' } } },
        error: null,
      }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: '1', name: 'Test Student', role: 'student', email: 'student@test.com' },
        error: null,
      }),
    })),
  },
}));

vi.mock('@/components/Header', () => ({
  Header: () => <div>Header</div>,
}));

vi.mock('@/services', () => ({
  courseService: {
    getCourseById: vi.fn().mockResolvedValue({
      id: '1',
      title: 'Test Course',
    }),
    getCourseModules: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <UserProvider>
          <Routes>
            <Route path="/" element={component} />
          </Routes>
        </UserProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('CourseDetail Page', () => {
  it('should render without crashing', () => {
    renderWithRouter(<CourseDetail />);
    expect(screen.getByText('Header')).toBeInTheDocument();
  });

  it('should have page content', () => {
    const { container } = renderWithRouter(<CourseDetail />);
    expect(container).toBeInTheDocument();
  });
});
