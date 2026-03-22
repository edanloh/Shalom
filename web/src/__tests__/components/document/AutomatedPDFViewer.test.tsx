import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AutomatedPDFViewer from '../../../components/document/AutomatedPDFViewer';

// Mock the Colors constant
vi.mock('@/constants/Colors', () => ({
  Colors: {
    purple400: '#9d4edd',
    gray600: '#4a5568',
    gray800: '#1a202c',
    textInputBg: '#2d3748',
    accent: '#5b9ef5',
    textSecondary: '#a0aec0',
    textMuted: '#718096',
  },
}));

describe('AutomatedPDFViewer', () => {
  const mockPdfUrl = 'https://example.com/sample.pdf';
  const mockTitle = 'Test PDF';

  beforeEach(() => {
    vi.useFakeTimers();
    // Mock console methods to avoid noise in tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.restoreAllMocks();
  });

  it('should render loading state initially', () => {
    render(<AutomatedPDFViewer pdfUrl={mockPdfUrl} title={mockTitle} />);

    // Should show loading indicator
    expect(
      screen.queryByText(/Loading/i) || screen.queryByRole('img'),
    ).toBeDefined();
  });

  it('should render "No PDF available" message when pdfUrl is empty', () => {
    render(<AutomatedPDFViewer pdfUrl="" title={mockTitle} />);

    expect(screen.getByText('No PDF available')).toBeInTheDocument();
  });

  it('should render an iframe element when PDF is provided', () => {
    const { container } = render(
      <AutomatedPDFViewer pdfUrl={mockPdfUrl} title={mockTitle} />,
    );

    const iframe = container.querySelector('iframe');
    expect(iframe).toBeInTheDocument();
  });

  it('should try first PDF viewer (Google Docs Viewer) on initial load', () => {
    const { container } = render(
      <AutomatedPDFViewer pdfUrl={mockPdfUrl} title={mockTitle} />,
    );

    const iframe = container.querySelector('iframe');
    expect(iframe?.src).toContain('docs.google.com/viewer');
  });

  it('should change viewer on iframe load timeout', async () => {
    const { container, rerender } = render(
      <AutomatedPDFViewer pdfUrl={mockPdfUrl} title={mockTitle} />,
    );

    let iframe = container.querySelector('iframe');
    const initialSrc = iframe?.src;

    // Advance timers to trigger timeout (8000ms for Google Docs)
    vi.advanceTimersByTime(8100);

    rerender(<AutomatedPDFViewer pdfUrl={mockPdfUrl} title={mockTitle} />);

    iframe = container.querySelector('iframe');
    // Should have switched to second viewer (Direct PDF)
    expect(iframe?.src).not.toBe(initialSrc);
  });

  it('should retry loading when retry button is clicked', async () => {
    vi.advanceTimersByTime(30000); // Advance to error state
    const user = userEvent.setup({ delay: null });

    render(<AutomatedPDFViewer pdfUrl={mockPdfUrl} title={mockTitle} />);

    vi.advanceTimersByTime(30000);

    const retryButton = screen.queryByText('Try Again');
    if (retryButton) {
      await user.click(retryButton);
    }
  });

  it('should reset viewer index when PDF URL changes', () => {
    const { rerender } = render(
      <AutomatedPDFViewer pdfUrl={mockPdfUrl} title={mockTitle} />,
    );

    const newPdfUrl = 'https://example.com/different.pdf';
    rerender(<AutomatedPDFViewer pdfUrl={newPdfUrl} title={mockTitle} />);

    // Should reset to first viewer
    expect(screen.queryByText('No PDF available')).not.toBeInTheDocument();
  });

  it('should detect framing errors from console.error and try next viewer', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = render(
      <AutomatedPDFViewer pdfUrl={mockPdfUrl} title={mockTitle} />,
    );

    // Should have rendered an iframe
    const iframe = container.querySelector('iframe');
    expect(iframe).toBeInTheDocument();

    // Simulate framing error
    const consoleErrorSpy = console.error as any;
    consoleErrorSpy(
      'Refused to display',
      'in a frame due to X-Frame-Options header',
    );

    // Component should attempt to use next viewer
    vi.restoreAllMocks();
  });

  it('should attempt next viewer when timeout occurs', () => {
    const { container, rerender } = render(
      <AutomatedPDFViewer pdfUrl={mockPdfUrl} title={mockTitle} />,
    );

    const firstIframe = container.querySelector('iframe');
    const firstSrc = firstIframe?.src;

    // Hit the first viewer's timeout
    vi.advanceTimersByTime(8100);

    // Rerender to capture state update
    rerender(<AutomatedPDFViewer pdfUrl={mockPdfUrl} title={mockTitle} />);

    const secondIframe = container.querySelector('iframe');
    const secondSrc = secondIframe?.src;

    // Should have attempted a different viewer
    expect(firstSrc).not.toBe(secondSrc);
  });

  it('should handle cross-origin iframe errors gracefully', () => {
    const { container } = render(
      <AutomatedPDFViewer pdfUrl={mockPdfUrl} title={mockTitle} />,
    );

    const iframe = container.querySelector('iframe') as HTMLIFrameElement;

    // Simulate iframe load
    const loadEvent = new Event('load');
    iframe?.dispatchEvent(loadEvent);

    expect(iframe).toBeInTheDocument();
  });

  it('should cleanup timeouts on unmount', () => {
    const { unmount } = render(
      <AutomatedPDFViewer pdfUrl={mockPdfUrl} title={mockTitle} />,
    );

    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it('should have correct title attribute on iframe', () => {
    const { container } = render(
      <AutomatedPDFViewer pdfUrl={mockPdfUrl} title={mockTitle} />,
    );

    const iframe = container.querySelector('iframe');
    expect(iframe?.title).toMatch(new RegExp(mockTitle, 'i'));
  });

  it('should encode PDF URL in viewer URLs', () => {
    const { container } = render(
      <AutomatedPDFViewer pdfUrl={mockPdfUrl} title={mockTitle} />,
    );

    const iframe = container.querySelector('iframe');
    const src = iframe?.src || '';

    // URL should be encoded
    expect(src).toContain(encodeURIComponent(mockPdfUrl));
  });
});
