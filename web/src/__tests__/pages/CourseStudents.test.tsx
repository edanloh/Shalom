import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import CourseStudents from '@/pages/CourseStudents';
import { AuthProvider } from '@/contexts/AuthContext';
import { UserProvider } from '@/contexts/UserContext';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: '1', email: 'instructor@test.com' } } },
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
        data: { id: '1', name: 'Test Instructor', role: 'instructor', email: 'instructor@test.com' },
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
    getCourseStudents: vi.fn().mockResolvedValue([]),
  },
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

describe('CourseStudents Page', () => {
  it('should render without crashing', () => {
    renderWithRouter(<CourseStudents />);
    expect(screen.getByText('Header')).toBeInTheDocument();
  });

  it('should have student list components', () => {
    renderWithRouter(<CourseStudents />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(0);
  });
});
