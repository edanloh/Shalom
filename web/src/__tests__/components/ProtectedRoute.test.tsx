import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../../components/ProtectedRoute';

const mockUseAuth = vi.fn();
const mockUseUser = vi.fn();

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/contexts/useUser', () => ({
  useUser: () => mockUseUser(),
}));

const TestComponent = () => <div>Protected Content</div>;

const renderWithRouter = () =>
  render(
    <BrowserRouter>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<TestComponent />} />
        </Route>
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>
    </BrowserRouter>,
  );

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseUser.mockReturnValue({
      user: { id: 'user-123', name: 'Test User' },
      isLoading: false,
    });
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    });
  });

  it('renders protected content when authenticated', async () => {
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });

  it('shows loading spinner while authenticating', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: true,
    });

    const { container } = renderWithRouter();
    const spinner = container.querySelector('[class*="animate-spin"]');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('h-12', 'w-12', 'border-b-2', 'border-primary');
  });

  it('redirects to login when not authenticated', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
    });

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });
  });
});
