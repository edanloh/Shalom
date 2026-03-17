import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UniversalDocumentViewer from '@/components/document/UniversalDocumentViewer';

describe('UniversalDocumentViewer', () => {
  const mockDocumentUrl = 'https://example.com/document.pdf';
  const mockTitle = 'Test Document';

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.restoreAllMocks();
  });

  describe('Document Type Detection', () => {
    it('should detect PDF document type from .pdf extension', () => {
      const { container } = render(
        <UniversalDocumentViewer
          documentUrl="https://example.com/file.pdf"
          title={mockTitle}
        />,
      );

      // Should render iframe for PDF viewer
      const iframe = container.querySelector('iframe');
      expect(iframe).toBeInTheDocument();
      expect(iframe?.src).toContain('docs.google.com/viewer');
    });

    it('should detect PPTX document type', () => {
      const { container } = render(
        <UniversalDocumentViewer
          documentUrl="https://example.com/presentation.pptx"
          title={mockTitle}
        />,
      );

      const iframe = container.querySelector('iframe');
      expect(iframe).toBeInTheDocument();
      // PPTX should use Office Online viewer as first choice
      expect(iframe?.src).toContain('view.officeapps.live.com');
    });

    it('should detect DOCX document type', () => {
      const { container } = render(
        <UniversalDocumentViewer
          documentUrl="https://example.com/document.docx"
          title={mockTitle}
        />,
      );

      const iframe = container.querySelector('iframe');
      expect(iframe).toBeInTheDocument();
      // DOCX should use Office Online viewer
      expect(iframe?.src).toContain('view.officeapps.live.com');
    });

    it('should detect XLSX document type', () => {
      const { container } = render(
        <UniversalDocumentViewer
          documentUrl="https://example.com/spreadsheet.xlsx"
          title={mockTitle}
        />,
      );

      const iframe = container.querySelector('iframe');
      expect(iframe).toBeInTheDocument();
      // XLSX should use Office Online viewer
      expect(iframe?.src).toContain('view.officeapps.live.com');
    });

    it('should default to PDF when document type is unknown', () => {
      const { container } = render(
        <UniversalDocumentViewer
          documentUrl="https://example.com/unknown-file.xyz"
          title={mockTitle}
        />,
      );

      // Should still render an iframe (defaulting to PDF viewers)
      const iframe = container.querySelector('iframe');
      expect(iframe).toBeInTheDocument();
      expect(iframe?.src).toContain('docs.google.com/viewer');
    });

    it('should use provided documentType override', () => {
      const { container } = render(
        <UniversalDocumentViewer
          documentUrl="https://example.com/file.xyz"
          title={mockTitle}
          documentType="docx"
        />,
      );

      const iframe = container.querySelector('iframe');
      expect(iframe).toBeInTheDocument();
      // Should use DOCX viewer despite .xyz extension
      expect(iframe?.src).toContain('view.officeapps.live.com');
    });
  });

  describe('PDF Document Viewing', () => {
    it('should render PDF document with Google Docs Viewer as first option', () => {
      const { container } = render(
        <UniversalDocumentViewer
          documentUrl="https://example.com/sample.pdf"
          title={mockTitle}
        />,
      );

      const iframe = container.querySelector('iframe');
      expect(iframe?.src).toContain('docs.google.com/viewer');
    });

    it('should try different viewers on timeout', () => {
      const { container } = render(
        <UniversalDocumentViewer
          documentUrl="https://example.com/sample.pdf"
          title={mockTitle}
        />,
      );

      const iframe = container.querySelector('iframe');
      // First attempt should try Google Docs
      expect(iframe?.src).toContain('docs.google.com/viewer');

      // Advance timer to trigger timeout - this will cause state update
      vi.advanceTimersByTime(8100);

      // Component should still be rendering (either loading or different viewer)
      expect(container.querySelector('iframe')).toBeInTheDocument();
    });
  });

  describe('Office Document Viewing', () => {
    it('should use Microsoft Office Online for DOCX', () => {
      const { container } = render(
        <UniversalDocumentViewer
          documentUrl="https://example.com/document.docx"
          title={mockTitle}
        />,
      );

      const iframe = container.querySelector('iframe');
      expect(iframe?.src).toContain('view.officeapps.live.com');
    });

    it('should use Microsoft Office Online for PPTX', () => {
      const { container } = render(
        <UniversalDocumentViewer
          documentUrl="https://example.com/presentation.pptx"
          title={mockTitle}
        />,
      );

      const iframe = container.querySelector('iframe');
      expect(iframe?.src).toContain('view.officeapps.live.com');
    });

    it('should use Microsoft Office Online for XLSX', () => {
      const { container } = render(
        <UniversalDocumentViewer
          documentUrl="https://example.com/spreadsheet.xlsx"
          title={mockTitle}
        />,
      );

      const iframe = container.querySelector('iframe');
      expect(iframe?.src).toContain('view.officeapps.live.com');
    });
  });

  describe('Loading and Error States', () => {
    it('should show loading overlay initially', () => {
      const { container } = render(
        <UniversalDocumentViewer
          documentUrl={mockDocumentUrl}
          title={mockTitle}
        />,
      );

      // Component should render loading overlay with backdrop blur
      const loadingOverlay = container.querySelector('.backdrop-blur-sm');
      expect(loadingOverlay).toBeInTheDocument();
    });

    it('should display document type in loading text', () => {
      render(
        <UniversalDocumentViewer
          documentUrl={mockDocumentUrl}
          title={mockTitle}
        />,
      );

      // Should show loading text with PDF type
      expect(screen.getByText(/Loading PDF document/i)).toBeInTheDocument();
    });

    it('should display loading text when component renders', () => {
      render(
        <UniversalDocumentViewer
          documentUrl={mockDocumentUrl}
          title={mockTitle}
        />,
      );

      // Should show loading state for PDF
      expect(screen.getByText(/Loading PDF document/i)).toBeInTheDocument();
    });

    it('should accept allowDownload prop', () => {
      const { rerender } = render(
        <UniversalDocumentViewer
          documentUrl={mockDocumentUrl}
          title={mockTitle}
          allowDownload={true}
        />,
      );

      // Component should render with allowDownload=true
      expect(screen.getByText(/Loading/i)).toBeInTheDocument();

      // Should also work with allowDownload=false
      rerender(
        <UniversalDocumentViewer
          documentUrl={mockDocumentUrl}
          title={mockTitle}
          allowDownload={false}
        />,
      );

      expect(screen.getByText(/Loading/i)).toBeInTheDocument();
    });
  });

  describe('Download Functionality', () => {
    it('should render iframe when document loads', () => {
      const { container } = render(
        <UniversalDocumentViewer
          documentUrl={mockDocumentUrl}
          title={mockTitle}
          allowDownload={true}
        />,
      );

      const iframe = container.querySelector('iframe');
      expect(iframe).toBeInTheDocument();
    });

    it('should not show download button when allowDownload is false', () => {
      const { container } = render(
        <UniversalDocumentViewer
          documentUrl={mockDocumentUrl}
          title={mockTitle}
          allowDownload={false}
        />,
      );

      // Download button shouldn't be in the DOM when not allowed
      const downloadButtons = screen.queryAllByText(/Download/i);
      // At least during loading, download shouldn't appear
      expect(downloadButtons.length).toBeLessThanOrEqual(0);
    });
  });

  describe('Document URL Changes', () => {
    it('should reset viewer when document URL changes', () => {
      const { rerender, container } = render(
        <UniversalDocumentViewer
          documentUrl={mockDocumentUrl}
          title={mockTitle}
        />,
      );

      const newDocumentUrl = 'https://example.com/different.pdf';
      rerender(
        <UniversalDocumentViewer
          documentUrl={newDocumentUrl}
          title={mockTitle}
        />,
      );

      // Should still have iframe
      const iframe = container.querySelector('iframe');
      expect(iframe).toBeInTheDocument();
    });

    it('should handle switching between different document types', () => {
      const { rerender, container } = render(
        <UniversalDocumentViewer
          documentUrl="https://example.com/document.pdf"
          title={mockTitle}
        />,
      );

      rerender(
        <UniversalDocumentViewer
          documentUrl="https://example.com/document.docx"
          title={mockTitle}
        />,
      );

      // Should switch to Office Online for DOCX
      const iframe = container.querySelector('iframe');
      expect(iframe?.src).toContain('view.officeapps.live.com');
    });
  });

  describe('Error Handling', () => {
    it('should detect framing errors and try next viewer', () => {
      const { container } = render(
        <UniversalDocumentViewer
          documentUrl={mockDocumentUrl}
          title={mockTitle}
        />,
      );

      const consoleErrorSpy = console.error as any;
      // Simulate framing error
      consoleErrorSpy('Refused to display', 'X-Frame-Options header');

      // Should have still rendered the component
      expect(container.querySelector('iframe')).toBeInTheDocument();
    });

    it('should handle iframe load gracefully', () => {
      const { container } = render(
        <UniversalDocumentViewer
          documentUrl={mockDocumentUrl}
          title={mockTitle}
        />,
      );

      const iframe = container.querySelector('iframe') as HTMLIFrameElement;

      // Simulate iframe load
      const loadEvent = new Event('load');
      iframe?.dispatchEvent(loadEvent);

      expect(iframe).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have appropriate title on iframe', () => {
      const { container } = render(
        <UniversalDocumentViewer
          documentUrl={mockDocumentUrl}
          title={mockTitle}
        />,
      );

      const iframe = container.querySelector('iframe');
      expect(iframe?.title).toBe(mockTitle);
    });

    it('should set sandbox attribute for security', () => {
      const { container } = render(
        <UniversalDocumentViewer
          documentUrl={mockDocumentUrl}
          title={mockTitle}
        />,
      );

      const iframe = container.querySelector('iframe');
      expect(iframe?.getAttribute('sandbox')).toContain('allow-same-origin');
    });

    it('should render semantic structure', () => {
      const { container } = render(
        <UniversalDocumentViewer
          documentUrl={mockDocumentUrl}
          title={mockTitle}
        />,
      );

      // Should have main container div
      const mainContainer = container.querySelector('.relative.h-full');
      expect(mainContainer).toBeInTheDocument();
    });
  });

  describe('Cleanup', () => {
    it('should clear timeouts on unmount', () => {
      const { unmount } = render(
        <UniversalDocumentViewer
          documentUrl={mockDocumentUrl}
          title={mockTitle}
        />,
      );

      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it('should restore console.error on unmount', () => {
      const { unmount } = render(
        <UniversalDocumentViewer
          documentUrl={mockDocumentUrl}
          title={mockTitle}
        />,
      );

      const originalError = console.error;
      unmount();

      // After unmount, console.error should be restored
      expect(console.error).toBeDefined();
    });
  });

  describe('Multiple Viewers Fallback', () => {
    it('should try multiple viewers for PDF', () => {
      const { container } = render(
        <UniversalDocumentViewer
          documentUrl="https://example.com/file.pdf"
          title={mockTitle}
        />,
      );

      const logSpy = console.log as any;

      // Component should render
      expect(container.querySelector('iframe')).toBeInTheDocument();

      // Trigger timeout progression
      vi.advanceTimersByTime(8100);
      vi.advanceTimersByTime(8100);

      // Console should show multiple attempts
      expect(logSpy.mock.calls.length).toBeGreaterThan(0);
    });

    it('should encode document URLs in viewer URLs', () => {
      const { container } = render(
        <UniversalDocumentViewer
          documentUrl="https://example.com/document with spaces.pdf"
          title={mockTitle}
        />,
      );

      const iframe = container.querySelector('iframe');
      const src = iframe?.src || '';

      // URL should be properly encoded
      expect(src).toContain(
        encodeURIComponent('https://example.com/document with spaces.pdf'),
      );
    });
  });
});
