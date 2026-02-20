/**
 * UniversalDocumentViewer Component
 * Supports viewing PDF, PPTX, DOCX, and other document formats
 * Automatically tries multiple viewers and fallbacks based on document type
 */

import React, { useState, useEffect, useRef } from "react";
import { Button } from "../ui/button";
import { Download, ExternalLink, FileText, RefreshCw } from "lucide-react";

// Document type detection
const getDocumentType = (url: string): string => {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('.pdf') || lowerUrl.includes('pdf')) return 'pdf';
  if (lowerUrl.includes('.pptx') || lowerUrl.includes('.ppt') || lowerUrl.includes('powerpoint')) return 'pptx';
  if (lowerUrl.includes('.docx') || lowerUrl.includes('.doc') || lowerUrl.includes('word')) return 'docx';
  if (lowerUrl.includes('.xlsx') || lowerUrl.includes('.xls') || lowerUrl.includes('excel')) return 'xlsx';
  return 'pdf'; // Default to PDF
};

// Viewer configurations for different document types
const DOCUMENT_VIEWERS = {
  pdf: [
    {
      name: "Google Docs Viewer",
      getUrl: (docUrl: string) =>
        `https://docs.google.com/viewer?url=${encodeURIComponent(docUrl)}&embedded=true`,
      timeout: 8000,
    },
    {
      name: "Direct PDF",
      getUrl: (docUrl: string) => docUrl,
      timeout: 8000,
    },
    {
      name: "Mozilla PDF.js",
      getUrl: (docUrl: string) =>
        `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(docUrl)}`,
      timeout: 10000,
    },
  ],
  pptx: [
    {
      name: "Microsoft Office Online",
      getUrl: (docUrl: string) =>
        `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(docUrl)}`,
      timeout: 10000,
    },
    {
      name: "Google Docs Viewer",
      getUrl: (docUrl: string) =>
        `https://docs.google.com/viewer?url=${encodeURIComponent(docUrl)}&embedded=true`,
      timeout: 10000,
    },
  ],
  docx: [
    {
      name: "Microsoft Office Online",
      getUrl: (docUrl: string) =>
        `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(docUrl)}`,
      timeout: 10000,
    },
    {
      name: "Google Docs Viewer",
      getUrl: (docUrl: string) =>
        `https://docs.google.com/viewer?url=${encodeURIComponent(docUrl)}&embedded=true`,
      timeout: 10000,
    },
  ],
  xlsx: [
    {
      name: "Microsoft Office Online",
      getUrl: (docUrl: string) =>
        `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(docUrl)}`,
      timeout: 10000,
    },
    {
      name: "Google Docs Viewer",
      getUrl: (docUrl: string) =>
        `https://docs.google.com/viewer?url=${encodeURIComponent(docUrl)}&embedded=true`,
      timeout: 10000,
    },
  ],
};

interface UniversalDocumentViewerProps {
  documentUrl: string;
  title: string;
  documentType?: string; // Optional override for document type
  allowDownload?: boolean;
}

const UniversalDocumentViewer: React.FC<UniversalDocumentViewerProps> = ({
  documentUrl,
  title,
  documentType,
  allowDownload = true,
}) => {
  const detectedType = documentType || getDocumentType(documentUrl);
  const viewers = DOCUMENT_VIEWERS[detectedType as keyof typeof DOCUMENT_VIEWERS] || DOCUMENT_VIEWERS.pdf;

  const [currentViewerIndex, setCurrentViewerIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [successfulViewer, setSuccessfulViewer] = useState<number | null>(null);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const hasFramingErrorRef = useRef(false);

  // Reset when document changes
  useEffect(() => {
    if (!documentUrl) return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current);

    hasFramingErrorRef.current = false;
    setCurrentViewerIndex(0);
    setSuccessfulViewer(null);
    setHasError(false);
    setIsLoading(true);
  }, [documentUrl]);

  // Intercept console errors to detect framing issues
  useEffect(() => {
    const originalError = console.error;

    console.error = function (...args) {
      const errorMessage = args.join(" ");

      if (
        errorMessage.includes("Refused to display") ||
        errorMessage.includes("X-Frame-Options") ||
        errorMessage.includes("frame-ancestors")
      ) {
        if (successfulViewer === null && !hasFramingErrorRef.current) {
          console.log(
            `❌ Framing error detected for ${viewers[currentViewerIndex].name}, trying next viewer...`,
          );
          hasFramingErrorRef.current = true;

          if (currentViewerIndex < viewers.length - 1) {
            setCurrentViewerIndex((prev) => prev + 1);
          } else {
            setHasError(true);
            setIsLoading(false);
          }
        }
      }

      originalError.apply(console, args);
    };

    return () => {
      console.error = originalError;
    };
  }, [successfulViewer, isLoading, currentViewerIndex, viewers]);

  // Try loading current viewer
  useEffect(() => {
    if (!documentUrl) return;

    hasFramingErrorRef.current = false;
    setIsLoading(true);
    setHasError(false);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current);

    const currentViewer = viewers[currentViewerIndex];
    console.log(`🔄 Trying ${currentViewer.name} for ${detectedType.toUpperCase()}`);

    timeoutRef.current = setTimeout(() => {
      if (successfulViewer === null && !hasFramingErrorRef.current) {
        console.log(`⏱️ ${currentViewer.name} timeout, trying next viewer...`);

        if (currentViewerIndex < viewers.length - 1) {
          setCurrentViewerIndex((prev) => prev + 1);
        } else {
          setHasError(true);
          setIsLoading(false);
        }
      }
    }, currentViewer.timeout);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current);
    };
  }, [currentViewerIndex, documentUrl, successfulViewer, viewers, detectedType]);

  const markSuccess = () => {
    if (successfulViewer !== null || hasFramingErrorRef.current) return;

    console.log(
      `✅ Successfully loaded ${detectedType.toUpperCase()} with ${viewers[currentViewerIndex].name}`,
    );
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current);

    setSuccessfulViewer(currentViewerIndex);
    setIsLoading(false);
    setHasError(false);
  };

  const checkIframeContent = () => {
    const iframe = iframeRef.current;
    if (!iframe || successfulViewer !== null || hasFramingErrorRef.current) {
      return;
    }

    try {
      // Try to access iframe content
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;

      if (iframeDoc) {
        const hasContent =
          iframeDoc.body?.children.length > 0 ||
          iframeDoc.body?.innerText?.trim() !== "";

        if (hasContent) {
          markSuccess();
        } else {
          console.log("Iframe loaded but appears empty, checking again...");
          checkTimeoutRef.current = setTimeout(checkIframeContent, 500);
        }
      } else {
        // Cross-origin, assume success if no framing error yet
        if (!hasFramingErrorRef.current) {
          markSuccess();
        }
      }
    } catch (e) {
      // Cross-origin restriction, assume success if no framing error
      if (!hasFramingErrorRef.current) {
        markSuccess();
      }
    }
  };

  const handleIframeLoad = () => {
    if (successfulViewer !== null) return;

    console.log(`📱 Iframe onLoad for ${viewers[currentViewerIndex].name}`);

    // Wait for potential framing errors
    setTimeout(() => {
      if (!hasFramingErrorRef.current) {
        checkIframeContent();
      }
    }, 800);
  };

  const handleRetry = () => {
    setCurrentViewerIndex(0);
    setIsLoading(true);
    setHasError(false);
    setSuccessfulViewer(null);
    hasFramingErrorRef.current = false;
  };

  const handleDownload = () => {
    window.open(documentUrl, '_blank');
  };

  const handleOpenExternal = () => {
    window.open(documentUrl, '_blank');
  };

  const getDocumentIcon = () => {
    switch (detectedType) {
      case 'pptx':
        return '📊';
      case 'docx':
        return '📄';
      case 'xlsx':
        return '📈';
      case 'pdf':
      default:
        return '📕';
    }
  };

  if (!documentUrl) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-lg border-2 border-dashed border-muted bg-muted/20">
        <div className="text-center">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">No document available</p>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-destructive/50 bg-destructive/5 p-8">
        <div className="text-center">
          <div className="text-6xl mb-4">{getDocumentIcon()}</div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Unable to Display Document
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            The {detectedType.toUpperCase()} document couldn't be loaded in the browser.
            <br />
            All available viewers failed. Please download the file or open it externally.
          </p>
          <div className="flex gap-3 justify-center">
            {allowDownload && (
              <Button onClick={handleDownload} variant="default">
                <Download className="mr-2 h-4 w-4" />
                Download Document
              </Button>
            )}
            <Button onClick={handleOpenExternal} variant="outline">
              <ExternalLink className="mr-2 h-4 w-4" />
              Open in New Tab
            </Button>
            <Button onClick={handleRetry} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const currentViewer = viewers[currentViewerIndex];
  const embedUrl = currentViewer.getUrl(documentUrl);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg border border-border bg-background">
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="text-6xl mb-4 animate-bounce">{getDocumentIcon()}</div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">
              Loading {detectedType.toUpperCase()} document...
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Trying {currentViewer.name} ({currentViewerIndex + 1}/{viewers.length})
            </p>
          </div>
        </div>
      )}

      {/* Document iframe */}
      <iframe
        ref={iframeRef}
        src={embedUrl}
        title={title}
        className="h-full w-full border-0"
        onLoad={handleIframeLoad}
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
      />

      {/* Action buttons */}
      {successfulViewer !== null && (
        <div className="absolute top-4 right-4 flex gap-2 z-20">
          {allowDownload && (
            <Button
              onClick={handleDownload}
              size="sm"
              variant="secondary"
              className="shadow-lg"
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
          <Button
            onClick={handleOpenExternal}
            size="sm"
            variant="secondary"
            className="shadow-lg"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default UniversalDocumentViewer;
