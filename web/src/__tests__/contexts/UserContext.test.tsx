import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { UserProvider } from '@/contexts/UserContext';
import { useUser } from '@/contexts/useUser';
import { AuthProvider } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import * as userService from '@/services/userService';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    auth: {
      getUser: vi.fn(),
      getSession: vi.fn(() =>
        Promise.resolve({
          data: {
            session: {
              user: { id: '1', email: 'test@example.com' },
              access_token: 'token',
            },
          },
          error: null,
        })
      ),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
  },
}));

vi.mock('@/services/userService', () => ({
  registerCheck: vi.fn(),
  fetchUserProfile: vi.fn(),
  updateUserProfile: vi.fn(),
  uploadProfilePic: vi.fn(),
}));

const TestComponent = () => {
  const { user, isLoading } = useUser();

  if (isLoading) return <div>Loading...</div>;
  if (!user) return <div>No user</div>;

  return <div>User: {user.email}</div>;
};

describe('UserContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should provide user context to children', async () => {
    const mockAuthUser = {
      id: '1',
      email: 'test@example.com',
      user_metadata: { full_name: 'Test User' },
      app_metadata: { provider: 'email' },
    };

    const mockProfile = {
      id: '1',
      email: 'test@example.com',
      role: 'instructor',
      name: 'Test User',
    };

    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockAuthUser },
      error: null,
    });

    vi.mocked(userService.registerCheck).mockResolvedValue({
      success: true,
      user: { id: '1', email: 'test@example.com', role: 'instructor' },
    });

    vi.mocked(userService.fetchUserProfile).mockResolvedValue(mockProfile as any);

    render(
      <AuthProvider>
        <UserProvider>
          <TestComponent />
        </UserProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/User:/)).toBeInTheDocument();
    });
  });

  it('should show no user when not authenticated', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: null,
    });

    render(
      <AuthProvider>
        <UserProvider>
          <TestComponent />
        </UserProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('No user')).toBeInTheDocument();
    });
  });

  it('should handle user fetch errors', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: { message: 'Auth error' },
    });

    render(
      <AuthProvider>
        <UserProvider>
          <TestComponent />
        </UserProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('No user')).toBeInTheDocument();
    });
  });

  it('should throw error when useUser is used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow();

    consoleSpy.mockRestore();
  });

  it('should listen to auth state changes', () => {
    const mockUnsubscribe = vi.fn();

    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsubscribe } },
    });

    const { unmount } = render(
      <AuthProvider>
        <UserProvider>
          <TestComponent />
        </UserProvider>
      </AuthProvider>
    );

    expect(supabase.auth.onAuthStateChange).toHaveBeenCalled();

    unmount();

    // Unsubscribe should be called on unmount
    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});
