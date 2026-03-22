import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Header } from '../../components/Header';

const mockLogout = vi.fn();
const mockGetNotifications = vi.fn();

const mockUseAuth = vi.fn(() => ({
  logout: mockLogout,
}));

const mockUseUser = vi.fn(() => ({
  user: {
    uuid: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
    avatar_url: 'https://example.com/avatar.jpg',
  },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/contexts/useUser', () => ({
  useUser: () => mockUseUser(),
}));

vi.mock('@/services', () => ({
  notificationService: {
    getNotifications: (...args: unknown[]) => mockGetNotifications(...args),
  },
}));

vi.mock('@/utils/avatar', () => ({
  getAvatarUri: (url: string) => url || 'https://default-avatar.jpg',
}));

const renderWithRouter = () =>
  render(
    <BrowserRouter>
      <Header />
    </BrowserRouter>,
  );

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ logout: mockLogout });
    mockUseUser.mockReturnValue({
      user: {
        uuid: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
        avatar_url: 'https://example.com/avatar.jpg',
      },
    });
    mockGetNotifications.mockResolvedValue([]);
  });

  it('renders header and desktop navigation labels', () => {
    renderWithRouter();
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Courses')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
    expect(screen.getByText('Students')).toBeInTheDocument();
  });

  it('loads notifications on mount', async () => {
    renderWithRouter();

    await waitFor(() => {
      expect(mockGetNotifications).toHaveBeenCalledWith('user-123', 50);
    });
  });

  it('does not request notifications when user is missing', async () => {
    mockUseUser.mockReturnValue({ user: null });
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByRole('banner')).toBeInTheDocument();
    });
    expect(mockGetNotifications).not.toHaveBeenCalled();
  });

  it('handles notification loading errors gracefully', async () => {
    mockGetNotifications.mockRejectedValue(new Error('API Error'));
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByRole('banner')).toBeInTheDocument();
    });
  });

  it('applies key header layout classes', () => {
    const { container } = renderWithRouter();
    const header = container.querySelector('header');
    expect(header).toHaveClass(
      'sticky',
      'top-0',
      'z-50',
      'border-b',
      'backdrop-blur',
    );
  });
});
