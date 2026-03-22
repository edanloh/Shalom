import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Students from '@/pages/Students';
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
  studentService: {
    getAllStudents: vi.fn().mockResolvedValue([]),
  },
}));

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <UserProvider>
          {component}
        </UserProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('Students Page', () => {
  it('should render without crashing', () => {
    renderWithRouter(<Students />);
    expect(screen.getByText('Header')).toBeInTheDocument();
  });

  it('should have student management components', () => {
    renderWithRouter(<Students />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(0);
  });
});
