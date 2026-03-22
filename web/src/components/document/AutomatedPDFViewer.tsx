import { useState, useEffect, useRef } from "react";
import { Loader2, AlertCircle, FileText, ExternalLink } from "lucide-react";
import { Colors } from "@/constants/Colors";

const PDF_VIEWERS = [
  {
    name: "Google Docs Viewer",
    getUrl: (pdfUrl: string) =>
      `https://docs.google.com/viewer?url=${encodeURIComponent(pdfUrl)}&embedded=true`,
    timeout: 8000,
  },
  {
    name: "Direct PDF",
    getUrl: (pdfUrl: string) => pdfUrl,
    timeout: 8000,
  },

  {
    name: "Mozilla PDF.js",
    getUrl: (pdfUrl: string) =>
      `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(pdfUrl)}`,
    timeout: 10000,
  },
];

interface AutomatedPDFViewerProps {
  pdfUrl: string;
  title: string;
}

const AutomatedPDFViewer: React.FC<AutomatedPDFViewerProps> = ({
  pdfUrl,
  title,
}) => {
  const [currentViewerIndex, setCurrentViewerIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [successfulViewer, setSuccessfulViewer] = useState<number | null>(null);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const hasFramingErrorRef = useRef(false);

  // Always start from the first viewer whenever the PDF changes so we don't persist old fallbacks
  useEffect(() => {
    if (!pdfUrl) return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current);

    hasFramingErrorRef.current = false;
    setCurrentViewerIndex(0);
    setSuccessfulViewer(null);
    setHasError(false);
    setIsLoading(true);
  }, [pdfUrl]);

  // Intercept console errors to detect framing issues
  useEffect(() => {
    const originalError = console.error;

    console.error = function (...args) {
      const message = args.join(" ").toLowerCase();

      // Detect framing errors
      if (
        message.includes("refused to display") ||
        message.includes("x-frame-options") ||
        message.includes("frame-ancestors") ||
        message.includes("framing")
      ) {
        hasFramingErrorRef.current = true;

        if (successfulViewer === null && isLoading) {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current);

          setTimeout(() => {
            if (currentViewerIndex < PDF_VIEWERS.length - 1) {
              setCurrentViewerIndex((prev) => prev + 1);
            } else {
              setIsLoading(false);
              setHasError(true);
            }
          }, 100);
        }
      }

      originalError.apply(console, args);
    };

    return () => {
      console.error = originalError;
    };
  }, [successfulViewer, isLoading, currentViewerIndex]);

  useEffect(() => {
    if (!pdfUrl) return;

    hasFramingErrorRef.current = false;
    setIsLoading(true);
    setHasError(false);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current);

    const currentViewer = PDF_VIEWERS[currentViewerIndex];

    timeoutRef.current = setTimeout(() => {
      if (successfulViewer !== null) return;


      if (currentViewerIndex < PDF_VIEWERS.length - 1) {
        setCurrentViewerIndex((prev) => prev + 1);
      } else {
        setIsLoading(false);
        setHasError(true);
      }
    }, currentViewer.timeout);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current);
    };
  }, [currentViewerIndex, pdfUrl, successfulViewer]);

  const markSuccess = () => {
    if (successfulViewer !== null || hasFramingErrorRef.current) return;

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
      const iframeDoc =
        iframe.contentDocument || iframe.contentWindow?.document;

      if (iframeDoc) {
        const body = iframeDoc.body;
        if (!body) {
          if (currentViewerIndex < PDF_VIEWERS.length - 1) {
            setCurrentViewerIndex((prev) => prev + 1);
          } else {
            setIsLoading(false);
            setHasError(true);
          }
          return;
        }

        const bodyText = body.innerText?.toLowerCase() || "";
        const bodyHtml = body.innerHTML?.toLowerCase() || "";

        const hasErrorText =
          bodyText.includes("no preview available") ||
          bodyText.includes("error") ||
          bodyText.includes("cannot display") ||
          bodyText.includes("failed to load") ||
          bodyText.includes("unable to load") ||
          bodyText.includes("refused to display") ||
          bodyText.includes("not supported");

        if (hasErrorText) {
          if (currentViewerIndex < PDF_VIEWERS.length - 1) {
            setCurrentViewerIndex((prev) => prev + 1);
          } else {
            setIsLoading(false);
            setHasError(true);
          }
          return;
        }

        const hasSuccessIndicators =
          iframeDoc.querySelector("canvas") !== null ||
          iframeDoc.querySelector('embed[type="application/pdf"]') !== null ||
          iframeDoc.querySelector('object[type="application/pdf"]') !== null ||
          body.children.length > 2 ||
          bodyText.length > 100;

        if (hasSuccessIndicators) {
          markSuccess();
        } else {
          if (currentViewerIndex < PDF_VIEWERS.length - 1) {
            setCurrentViewerIndex((prev) => prev + 1);
          } else {
            setIsLoading(false);
            setHasError(true);
          }
        }
      }
    } catch (e) {
      const error = e as Error;
      if (error.message?.includes("cross-origin")) {
        // Wait a bit to see if framing error appears
        setTimeout(() => {
          if (hasFramingErrorRef.current || successfulViewer !== null) {
            return;
          }
          markSuccess();
        }, 500);
      } else {
        if (currentViewerIndex < PDF_VIEWERS.length - 1) {
          setCurrentViewerIndex((prev) => prev + 1);
        } else {
          setIsLoading(false);
          setHasError(true);
        }
      }
    }
  };

  const handleIframeLoad = () => {
    if (successfulViewer !== null) return;


    // Wait for potential framing errors
    setTimeout(() => {
      if (hasFramingErrorRef.current || successfulViewer !== null) {
        return;
      }

      checkTimeoutRef.current = setTimeout(() => {
        checkIframeContent();
      }, 1500);
    }, 800);
  };

  const handleRetry = () => {
    setCurrentViewerIndex(0);
    setIsLoading(true);
    setHasError(false);
    setSuccessfulViewer(null);
    hasFramingErrorRef.current = false;
  };

  if (!pdfUrl) {
    return (
      <div className="flex items-center justify-center h-full min-h-[600px] bg-gray-50 rounded-xl">
        <div className="text-center">
          <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">No PDF available</p>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="flex items-center justify-center h-full min-h-[600px] bg-gray-50 rounded-xl">
        <div className="text-center space-y-4 p-8 max-w-md">
          <AlertCircle className="h-12 w-12 mx-auto text-amber-500" />
          <div>
            <p className="text-gray-900 font-semibold text-lg">
              Unable to Display PDF
            </p>
            <p className="text-sm text-gray-600 mt-2">
              This PDF cannot be embedded due to security restrictions.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Tried {PDF_VIEWERS.length} different viewers
            </p>
          </div>
          <div className="flex gap-3 justify-center pt-2">
            <button
              onClick={handleRetry}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
            >
              Try Again
            </button>
            <button
              onClick={() => window.open(pdfUrl, "_blank")}
              className="px-4 py-2 bg-blue-600 text-black rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
              style={{color: Colors.purple400}}
            >
              <ExternalLink className="h-4 w-4" />
              Open in New Tab
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentViewer = PDF_VIEWERS[currentViewerIndex];
  const embedUrl = currentViewer.getUrl(pdfUrl);

  return (
    <div className="relative w-full h-full min-h-[600px]">
      {isLoading && successfulViewer === null && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl">
          <div className="text-center space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto" />
            <div>
              <p className="text-sm font-medium text-gray-700">
                Loading PDF with {currentViewer.name}
              </p>
              {currentViewerIndex > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Attempt {currentViewerIndex + 1} of {PDF_VIEWERS.length}
                </p>
              )}
            </div>
            <button
              onClick={() => window.open(pdfUrl, "_blank")}
              className="mt-4 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center gap-2 mx-auto"
            >
              <ExternalLink className="h-4 w-4" />
              Open Directly Instead
            </button>
          </div>
        </div>
      )}

      {successfulViewer !== null && (
        <div className="absolute top-3 left-3 z-10 bg-green-50 border border-green-200 text-green-700 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
          Loaded with {PDF_VIEWERS[successfulViewer].name}
        </div>
      )}

      <iframe
        ref={iframeRef}
        key={`viewer-${currentViewerIndex}-${pdfUrl}`}
        src={embedUrl}
        className="w-full h-full rounded-xl border border-gray-200 bg-white"
        style={{ minHeight: "600px" }}
        title={title}
        onLoad={handleIframeLoad}
        allow="fullscreen"
      />
    </div>
  );
};

export default AutomatedPDFViewer;
