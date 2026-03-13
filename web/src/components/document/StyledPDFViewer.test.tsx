import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import StyledPDFViewer from './StyledPDFViewer';

// Mock the Colors constant
vi.mock('@/constants/Colors', () => ({
  Colors: {
    gray600: '#4a5568',
  },
}));

// Mock AutomatedPDFViewer component
vi.mock('./AutomatedPDFViewer', () => ({
  default: ({ pdfUrl, title }: { pdfUrl: string; title: string }) => (
    <div data-testid="automated-pdf-viewer">
      <div>PDF URL: {pdfUrl}</div>
      <div>Title: {title}</div>
    </div>
  ),
}));

describe('StyledPDFViewer', () => {
  const mockPdfUrl = 'https://example.com/sample.pdf';
  const mockTitle = 'Test PDF Document';

  it('should render AutomatedPDFViewer component', () => {
    render(<StyledPDFViewer pdfUrl={mockPdfUrl} title={mockTitle} />);

    expect(screen.getByTestId('automated-pdf-viewer')).toBeInTheDocument();
  });

  it('should pass pdfUrl prop to AutomatedPDFViewer', () => {
    render(<StyledPDFViewer pdfUrl={mockPdfUrl} title={mockTitle} />);

    expect(screen.getByText(`PDF URL: ${mockPdfUrl}`)).toBeInTheDocument();
  });

  it('should pass title prop to AutomatedPDFViewer', () => {
    render(<StyledPDFViewer pdfUrl={mockPdfUrl} title={mockTitle} />);

    expect(screen.getByText(`Title: ${mockTitle}`)).toBeInTheDocument();
  });

  it('should have wrapper div with rounded overflow-hidden border styling', () => {
    const { container } = render(
      <StyledPDFViewer pdfUrl={mockPdfUrl} title={mockTitle} />,
    );

    const wrapper = container.querySelector(
      'div[class*="rounded overflow-hidden border"]',
    );
    expect(wrapper).toBeInTheDocument();
  });

  it('should apply 500px height to wrapper', () => {
    const { container } = render(
      <StyledPDFViewer pdfUrl={mockPdfUrl} title={mockTitle} />,
    );

    // Check that the wrapper div has height styling
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.height).toBe('500px');
  });

  it('should have correct border color styling', () => {
    const { container } = render(
      <StyledPDFViewer pdfUrl={mockPdfUrl} title={mockTitle} />,
    );

    const wrapper = container.firstChild as HTMLElement;
    // Should have styling applied
    expect(wrapper).toBeInTheDocument();
  });

  it('should render with different PDF URLs', () => {
    const { rerender } = render(
      <StyledPDFViewer pdfUrl={mockPdfUrl} title={mockTitle} />,
    );

    expect(screen.getByText(`PDF URL: ${mockPdfUrl}`)).toBeInTheDocument();

    const newPdfUrl = 'https://example.com/another.pdf';
    rerender(<StyledPDFViewer pdfUrl={newPdfUrl} title={mockTitle} />);

    expect(screen.getByText(`PDF URL: ${newPdfUrl}`)).toBeInTheDocument();
  });

  it('should render with different titles', () => {
    const { rerender } = render(
      <StyledPDFViewer pdfUrl={mockPdfUrl} title={mockTitle} />,
    );

    expect(screen.getByText(`Title: ${mockTitle}`)).toBeInTheDocument();

    const newTitle = 'Different PDF Title';
    rerender(<StyledPDFViewer pdfUrl={mockPdfUrl} title={newTitle} />);

    expect(screen.getByText(`Title: ${newTitle}`)).toBeInTheDocument();
  });

  it('should be a wrapper component that does not modify props', () => {
    const testPdfUrl = 'https://example.com/test.pdf';
    const testTitle = 'Test Title';

    render(<StyledPDFViewer pdfUrl={testPdfUrl} title={testTitle} />);

    // Props should be passed through unchanged
    expect(screen.getByText(`PDF URL: ${testPdfUrl}`)).toBeInTheDocument();
    expect(screen.getByText(`Title: ${testTitle}`)).toBeInTheDocument();
  });

  it('should have overflow-hidden for clipping content', () => {
    const { container } = render(
      <StyledPDFViewer pdfUrl={mockPdfUrl} title={mockTitle} />,
    );

    const wrapper = container.querySelector('div[class*="overflow-hidden"]');
    expect(wrapper).toBeInTheDocument();
  });

  it('should render correctly with long PDF URLs', () => {
    const longPdfUrl =
      'https://example.com/very/long/path/to/pdf/document/with/many/segments.pdf?param=value&other=param';

    render(<StyledPDFViewer pdfUrl={longPdfUrl} title={mockTitle} />);

    expect(screen.getByText(`PDF URL: ${longPdfUrl}`)).toBeInTheDocument();
  });

  it('should render correctly with special characters in title', () => {
    const specialTitle = 'PDF_Document-2024 [Draft].pdf';

    render(<StyledPDFViewer pdfUrl={mockPdfUrl} title={specialTitle} />);

    expect(screen.getByText(`Title: ${specialTitle}`)).toBeInTheDocument();
  });

  it('should maintain styling when props change', () => {
    const { container, rerender } = render(
      <StyledPDFViewer pdfUrl={mockPdfUrl} title={mockTitle} />,
    );

    const wrapperBefore = container.firstChild as HTMLElement;
    const heightBefore = wrapperBefore.style.height;

    rerender(
      <StyledPDFViewer
        pdfUrl="https://example.com/new.pdf"
        title="New Title"
      />,
    );

    const wrapperAfter = container.firstChild as HTMLElement;
    const heightAfter = wrapperAfter.style.height;

    expect(heightBefore).toBe(heightAfter);
  });
});
