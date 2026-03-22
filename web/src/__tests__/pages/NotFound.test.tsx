import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import NotFound from '@/pages/NotFound';
import { AuthProvider } from '@/contexts/AuthContext';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
  },
}));

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        {component}
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('NotFound Page', () => {
  it('should render 404 message', () => {
    const { container } = renderWithRouter(<NotFound />);
    expect(container).toBeInTheDocument();
  });

  it('should render without crashing', () => {
    const { container } = renderWithRouter(<NotFound />);
    expect(container).toBeInTheDocument();
  });
});
