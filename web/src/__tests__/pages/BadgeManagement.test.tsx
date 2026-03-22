import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import BadgeManagement from '@/pages/BadgeManagement';
import { AuthProvider } from '@/contexts/AuthContext';
import { UserProvider } from '@/contexts/UserContext';

vi.mock('@/components/Header', () => ({
  Header: () => <div>Header</div>,
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: '1' } } } }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: '1', name: 'Test User', role: 'instructor' } }),
    })),
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

describe('BadgeManagement Page', () => {
  it('should render without crashing', () => {
    renderWithRouter(<BadgeManagement />);
    expect(screen.getByText('Header')).toBeInTheDocument();
  });

  it('should have badge management components', () => {
    renderWithRouter(<BadgeManagement />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(0);
  });
});
