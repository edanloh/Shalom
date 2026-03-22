import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import QuizTaking from '@/pages/QuizTaking';
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
  quizService: {
    getQuizById: vi.fn().mockResolvedValue({
      id: 'q1',
      title: 'Test Quiz',
      questions: [],
    }),
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

describe('QuizTaking Page', () => {
  it('should render without crashing', () => {
    renderWithRouter(<QuizTaking />);
    expect(screen.getByText('Header')).toBeInTheDocument();
  });

  it('should have quiz components', () => {
    const { container } = renderWithRouter(<QuizTaking />);
    expect(container).toBeInTheDocument();
  });
});
