import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Header } from '@/components/Header';

const mockLogout = vi.fn();
const mockGetNotifications = vi.fn();
const mockNavigate = vi.fn();
const mockRpc = vi.fn();
const mockRemoveChannel = vi.fn();
const mockSubscribe = vi.fn(() => 'subscription');
const mockChannelOn = vi.fn(() => ({ subscribe: mockSubscribe }));
const mockChannel = vi.fn(() => ({ on: mockChannelOn }));
const mockUseLocation = vi.fn(() => ({ pathname: '/' }));

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

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    channel: (...args: unknown[]) => mockChannel(...args),
    removeChannel: (...args: unknown[]) => mockRemoveChannel(...args),
  },
}));

vi.mock('@/utils/avatar', () => ({
  getAvatarUri: (url: string) => url || 'https://default-avatar.jpg',
}));

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: any) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockUseLocation(),
  };
});

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
    mockRpc.mockResolvedValue({ data: [], error: null });
    mockRemoveChannel.mockResolvedValue(undefined);
    mockChannel.mockClear();
    mockChannelOn.mockClear();
    mockSubscribe.mockClear();
    mockRemoveChannel.mockClear();
    mockNavigate.mockClear();
    mockUseLocation.mockReturnValue({ pathname: '/' });
  });

  it('renders header and desktop navigation labels', () => {
    renderWithRouter();
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Courses').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Analytics').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Students').length).toBeGreaterThan(0);
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
    expect(mockRpc).not.toHaveBeenCalled();
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

  it('shows unread notification and message badges', async () => {
    mockGetNotifications.mockResolvedValue([{ read: false }, { read: true }]);
    mockRpc.mockResolvedValue({
      data: [{ unread_messages: 12 }],
      error: null,
    });

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText('9+')).toBeInTheDocument();
    });
    expect(screen.getAllByText('9+').length).toBeGreaterThan(0);
  });

  it('navigates when the notification and settings buttons are clicked', async () => {
    const { container } = renderWithRouter();
    const actionButtons = container.querySelectorAll('.ml-auto > button');

    fireEvent.click(actionButtons[0]);
    fireEvent.click(actionButtons[1]);

    expect(mockNavigate).toHaveBeenCalledWith('/notifications');
    expect(mockNavigate).toHaveBeenCalledWith('/settings');
  });

  it('subscribes to direct message updates and removes the channel on unmount', async () => {
    const { unmount } = renderWithRouter();

    await waitFor(() => {
      expect(mockChannel).toHaveBeenCalledWith('header-unread-messages');
    });
    expect(mockChannelOn).toHaveBeenCalled();

    unmount();
    expect(mockRemoveChannel).toHaveBeenCalledWith('subscription');
  });

  it('logs out when the dropdown log out action is clicked', async () => {
    renderWithRouter();

    fireEvent.click(screen.getByText('Log out'));
    expect(mockLogout).toHaveBeenCalled();
  });

  it('handles unread message RPC errors gracefully', async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'RPC failed' },
    });

    renderWithRouter();

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith(
        'get_direct_message_conversations',
        { user_id: 'user-123' },
      );
    });
  });
});
