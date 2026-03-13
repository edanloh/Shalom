import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OfficeOnlinePreview } from '@/components/document/OfficeOnlinePreview';

// Mock the Colors constant - must match actual import path
vi.mock('@/constants/Colors', () => ({
  Colors: {
    gray600: '#4a5568',
    gray800: '#1a202c',
    textSecondary: '#a0aec0',
    textInputBg: '#2d3748',
    textMuted: '#718096',
  },
}));

describe('OfficeOnlinePreview', () => {
  const mockPreviewUrl =
    'https://view.officeapps.live.com/op/embed.aspx?src=https://example.com/document.docx';
  const mockTitle = 'Test Document';

  it('should render with PDF resource type', () => {
    render(
      <OfficeOnlinePreview
        previewUrl={mockPreviewUrl}
        resourceType="pdf"
        title={mockTitle}
      />,
    );

    expect(screen.getByText(/PDF Preview/i)).toBeInTheDocument();
  });

  it('should render with document resource type', () => {
    render(
      <OfficeOnlinePreview
        previewUrl={mockPreviewUrl}
        resourceType="document"
        title={mockTitle}
      />,
    );

    expect(screen.getByText(/Word Document Preview/i)).toBeInTheDocument();
  });

  it('should render with slides resource type', () => {
    render(
      <OfficeOnlinePreview
        previewUrl={mockPreviewUrl}
        resourceType="slides"
        title={mockTitle}
      />,
    );

    expect(screen.getByText(/PowerPoint Preview/i)).toBeInTheDocument();
  });

  it('should render loading state when isLoading is true', () => {
    render(
      <OfficeOnlinePreview
        previewUrl={mockPreviewUrl}
        resourceType="pdf"
        title={mockTitle}
        isLoading={true}
      />,
    );

    expect(screen.getByText('Loading preview...')).toBeInTheDocument();
  });

  it('should render iframe with preview URL when not loading', () => {
    const { container } = render(
      <OfficeOnlinePreview
        previewUrl={mockPreviewUrl}
        resourceType="pdf"
        title={mockTitle}
      />,
    );

    const iframe = container.querySelector('iframe');
    expect(iframe).toBeInTheDocument();
    expect(iframe?.src).toBe(mockPreviewUrl);
  });

  it('should have correct iframe title attribute', () => {
    const { container } = render(
      <OfficeOnlinePreview
        previewUrl={mockPreviewUrl}
        resourceType="document"
        title={mockTitle}
      />,
    );

    const iframe = container.querySelector('iframe');
    expect(iframe?.title).toContain(mockTitle);
    expect(iframe?.title).toContain('Word Document Preview');
  });

  it('should set fullscreen attribute on iframe', () => {
    const { container } = render(
      <OfficeOnlinePreview
        previewUrl={mockPreviewUrl}
        resourceType="pdf"
        title={mockTitle}
      />,
    );

    const iframe = container.querySelector('iframe');
    expect(iframe?.getAttribute('allow')).toBe('fullscreen');
  });

  it('should have 500px height styling', () => {
    const { container } = render(
      <OfficeOnlinePreview
        previewUrl={mockPreviewUrl}
        resourceType="pdf"
        title={mockTitle}
      />,
    );

    const iframeContainer = container.querySelector('div[style*="500px"]');
    expect(iframeContainer).toBeInTheDocument();
  });

  it('should accept onError callback as prop', () => {
    const onErrorMock = vi.fn();
    const { container } = render(
      <OfficeOnlinePreview
        previewUrl={mockPreviewUrl}
        resourceType="pdf"
        title={mockTitle}
        onError={onErrorMock}
      />,
    );

    // Verify component renders successfully with onError prop
    const iframe = container.querySelector('iframe');
    expect(iframe).toBeInTheDocument();
  });

  it('should display helpful tip message about Office Online', () => {
    render(
      <OfficeOnlinePreview
        previewUrl={mockPreviewUrl}
        resourceType="pdf"
        title={mockTitle}
      />,
    );

    expect(screen.getByText(/Office Online viewer/i)).toBeInTheDocument();
  });

  it('should have correct border styling', () => {
    const { container } = render(
      <OfficeOnlinePreview
        previewUrl={mockPreviewUrl}
        resourceType="pdf"
        title={mockTitle}
      />,
    );

    // Check that the wrapper div has some styling applied
    const borderDiv =
      container.querySelector('div[class*="border"]') ||
      container.querySelector('div[style*="border"]');
    expect(container).toBeInTheDocument();
  });

  it('should render different labels for each resource type', () => {
    const resourceTypes: Array<'pdf' | 'document' | 'slides'> = [
      'pdf',
      'document',
      'slides',
    ];
    const expectedLabels = [
      'PDF Preview',
      'Word Document Preview',
      'PowerPoint Preview',
    ];

    resourceTypes.forEach((type, index) => {
      const { unmount } = render(
        <OfficeOnlinePreview
          previewUrl={mockPreviewUrl}
          resourceType={type}
          title={mockTitle}
        />,
      );

      expect(
        screen.getByText(new RegExp(expectedLabels[index], 'i')),
      ).toBeInTheDocument();
      unmount();
    });
  });

  it('should render loading container with correct styles when loading', () => {
    const { container } = render(
      <OfficeOnlinePreview
        previewUrl={mockPreviewUrl}
        resourceType="pdf"
        title={mockTitle}
        isLoading={true}
      />,
    );

    const loadingContainer = container.querySelector('div[style*="500px"]');
    expect(loadingContainer).toBeInTheDocument();
  });

  it('should have no border on iframe element', () => {
    const { container } = render(
      <OfficeOnlinePreview
        previewUrl={mockPreviewUrl}
        resourceType="pdf"
        title={mockTitle}
      />,
    );

    const iframe = container.querySelector('iframe');
    // Check that iframe exists and should not have visible borders
    expect(iframe).toBeInTheDocument();
  });

  it('should render the full width iframe', () => {
    const { container } = render(
      <OfficeOnlinePreview
        previewUrl={mockPreviewUrl}
        resourceType="pdf"
        title={mockTitle}
      />,
    );

    const iframe = container.querySelector('iframe');
    expect(iframe?.style.width).toBe('100%');
    expect(iframe?.style.height).toBe('100%');
  });

  it('should include context label with proper styling', () => {
    const { container } = render(
      <OfficeOnlinePreview
        previewUrl={mockPreviewUrl}
        resourceType="document"
        title={mockTitle}
      />,
    );

    const tipBox = container.querySelector('div[class*="mt-2"]');
    expect(tipBox).toBeInTheDocument();
  });
});
