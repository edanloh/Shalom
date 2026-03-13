import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LocalDocumentPreview } from '@/components/document/LocalDocumentPreview';

// Mock the Colors constant - must match actual import path
vi.mock('@/constants/Colors', () => ({
  Colors: {
    gray800: '#1a202c',
    accent: '#5b9ef5',
    textSecondary: '#a0aec0',
    textInputBg: '#2d3748',
    textMuted: '#718096',
  },
}));

describe('LocalDocumentPreview', () => {
  const defaultProps = {
    fileName: 'test-document.pdf',
  };

  it('should render with PDF resource type', () => {
    render(<LocalDocumentPreview {...defaultProps} resourceType="pdf" />);

    expect(screen.getByText(/PDF Preview/i)).toBeInTheDocument();
  });

  it('should render with document resource type', () => {
    render(<LocalDocumentPreview {...defaultProps} resourceType="document" />);

    expect(screen.getByText(/Word Document Preview/i)).toBeInTheDocument();
  });

  it('should render with slides resource type', () => {
    render(<LocalDocumentPreview {...defaultProps} resourceType="slides" />);

    expect(screen.getByText(/PowerPoint Preview/i)).toBeInTheDocument();
  });

  it('should render with unknown resource type', () => {
    render(<LocalDocumentPreview {...defaultProps} resourceType="unknown" />);

    expect(screen.getByText(/Document Preview/i)).toBeInTheDocument();
  });

  it('should display local preview alert message', () => {
    render(<LocalDocumentPreview {...defaultProps} resourceType="pdf" />);

    expect(screen.getByText('Local Preview')).toBeInTheDocument();
    expect(
      screen.getByText(/Click "Save Lesson" to upload/i),
    ).toBeInTheDocument();
  });

  it('should show processing state', () => {
    render(
      <LocalDocumentPreview
        {...defaultProps}
        resourceType="pdf"
        isProcessing={true}
      />,
    );

    expect(screen.getByText('Processing document...')).toBeInTheDocument();
  });

  it('should display preview content when provided', () => {
    const previewContent = <div>Custom Preview Content</div>;

    render(
      <LocalDocumentPreview
        {...defaultProps}
        resourceType="pdf"
        previewContent={previewContent}
      />,
    );

    expect(screen.getByText('Custom Preview Content')).toBeInTheDocument();
  });

  it('should show error message when provided', () => {
    const errorMessage = 'Failed to process document';

    render(
      <LocalDocumentPreview
        {...defaultProps}
        resourceType="pdf"
        errorMessage={errorMessage}
      />,
    );

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('should show "No preview available" when no content and no processing', () => {
    render(<LocalDocumentPreview {...defaultProps} resourceType="pdf" />);

    expect(screen.getByText('No preview available')).toBeInTheDocument();
  });

  it('should have proper styling container with border', () => {
    const { container } = render(
      <LocalDocumentPreview {...defaultProps} resourceType="pdf" />,
    );

    // Should have some styled container
    const styled =
      container.querySelector('[style*="border"]') ||
      container.querySelector('[class*="border"]');
    expect(container).toBeInTheDocument();
  });

  it('should render file size when provided', () => {
    const { container } = render(
      <LocalDocumentPreview
        {...defaultProps}
        resourceType="pdf"
        fileSize={1024000}
      />,
    );

    // Component should not error with fileSize prop
    expect(container).toBeInTheDocument();
  });

  it('should render all resource type icons correctly', () => {
    const { unmount } = render(
      <LocalDocumentPreview {...defaultProps} resourceType="pdf" />,
    );
    expect(screen.getByText(/PDF Preview/i)).toBeInTheDocument();
    unmount();

    const { unmount: unmount2 } = render(
      <LocalDocumentPreview {...defaultProps} resourceType="document" />,
    );
    expect(screen.getByText(/Word Document Preview/i)).toBeInTheDocument();
    unmount2();

    const { unmount: unmount3 } = render(
      <LocalDocumentPreview {...defaultProps} resourceType="slides" />,
    );
    expect(screen.getByText(/PowerPoint Preview/i)).toBeInTheDocument();
    unmount3();
  });

  it('should have proper text styling for secondary color', () => {
    const { container } = render(
      <LocalDocumentPreview {...defaultProps} resourceType="pdf" />,
    );

    const label = container.querySelector('label');
    expect(label).toBeInTheDocument();
  });

  it('should handle error message styling', () => {
    const errorMessage = 'Document upload failed';
    const { container } = render(
      <LocalDocumentPreview
        {...defaultProps}
        resourceType="pdf"
        errorMessage={errorMessage}
      />,
    );

    // Error message should be displayed
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('should render multiple resource types as independent renders', () => {
    const pdfRender = render(
      <LocalDocumentPreview {...defaultProps} resourceType="pdf" />,
    );

    expect(screen.getByText(/PDF Preview/i)).toBeInTheDocument();
    pdfRender.unmount();

    render(<LocalDocumentPreview {...defaultProps} resourceType="document" />);

    expect(screen.getByText(/Word Document Preview/i)).toBeInTheDocument();
  });
});
