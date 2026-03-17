import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import mammoth from "mammoth";
import JSZip from "jszip";
import { Colors } from "../../../constants/Colors";
import { StorageService } from "../../../services/storageService";
import StyledPDFViewer from "@/components/document/StyledPDFViewer";
import OfficeOnlinePreview from "@/components/document/OfficeOnlinePreview";

interface Module {
  id: string;
  [key: string]: any;
}

interface Lesson {
  id: string;
  baseTitle?: string;
  resourceUrl?: string;
  resourceType?: string;
  fileSize?: number;
  isDownloadable?: boolean;
  [key: string]: any;
}

interface DocumentUploadProps {
  module: Module;
  lesson: Lesson;
  updateLesson: (
    moduleId: string,
    lessonId: string,
    updates: Partial<Lesson>,
  ) => void;
  showValidationErrors: boolean;
  hasPdf: boolean;
  setValidationMessage: (message: { title: string; description: string }) => void;
  setShowValidationModal: (show: boolean) => void;
  currentCourseId: string;
}

const decodeXmlEntities = (value: string) => {
  if (!value) return value;
  if (typeof document === "undefined") {
    return value
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ");
  }
  const textarea = document.createElement("textarea");
  textarea.innerHTML = value;
  return textarea.value;
};

export const DocumentUpload: React.FC<DocumentUploadProps> = ({
  module,
  lesson,
  updateLesson,
  showValidationErrors,
  hasPdf,
  setValidationMessage,
  setShowValidationModal,
  currentCourseId,
}) => {
  // State for DOCX/PPTX preview
  const [htmlContent, setHtmlContent] = useState<string>("");
  const [isConvertingDocx, setIsConvertingDocx] = useState(false);
  const [pptxSlides, setPptxSlides] = useState<string[]>([]);
  const [isConvertingPptx, setIsConvertingPptx] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [documentUploadError, setDocumentUploadError] = useState("");
  const [documentPreviewError, setDocumentPreviewError] = useState(false);

  const MAX_FILE_SIZE_MB = 50;
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

  // Determine document types
  const remoteResourceUrl =
    lesson?.resourceUrl && !lesson.resourceUrl.startsWith("[LOCAL_FILE:")
      ? lesson.resourceUrl
      : "";
  const normalizedRemoteUrl = remoteResourceUrl.toLowerCase();
  const isRemoteDocx = normalizedRemoteUrl.endsWith(".docx");
  const isRemotePptx = normalizedRemoteUrl.endsWith(".pptx");
  const isRemotePdf = normalizedRemoteUrl.endsWith(".pdf");
  const officeOnlinePreviewUrl =
    remoteResourceUrl && (isRemoteDocx || isRemotePptx)
      ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(remoteResourceUrl)}`
      : "";
  const remoteLabel = isRemoteDocx
    ? "📘 Document URL added"
    : isRemotePptx
      ? "📊 Slides URL added"
      : "📄 PDF URL added";
  const isSupabaseBucketOfficeUrl =
    !!remoteResourceUrl &&
    (isRemoteDocx || isRemotePptx) &&
    remoteResourceUrl.includes(
      "/storage/v1/object/public/course-documents/",
    );
  const isResourceUrlLocked = isSupabaseBucketOfficeUrl;

  // Detect and handle unsupported document types
  useEffect(() => {
    if (
      lesson?.resourceUrl &&
      !lesson.resourceUrl.startsWith("[LOCAL_FILE:") &&
      !officeOnlinePreviewUrl &&
      !isRemotePdf &&
      lesson.resourceUrl.trim() !== ""
    ) {
      // Unsupported document type detected
      setValidationMessage({
        title: "Unsupported Document Type",
        description:
          "The document URL provided is not in a supported format (PDF, DOCX, or PPTX). Please upload a PDF, Word document, or PowerPoint presentation, or use the 'Upload File' option to upload your document directly.",
      });
      setShowValidationModal(true);
      updateLesson(module.id, lesson.id, { resourceUrl: "" });
    }
  }, [lesson?.resourceUrl, officeOnlinePreviewUrl, isRemotePdf]);

  // Effect to convert DOCX file to HTML
  useEffect(() => {
    const cacheKey = `${module.id}-${lesson.id}`;
    const cachedFiles = (window as any).__lessonFileCache?.get(cacheKey);
    const pdfFile = cachedFiles?.pdfFile;

    if (pdfFile && pdfFile.name.toLowerCase().endsWith(".docx")) {
      const convertDocx = async () => {
        setIsConvertingDocx(true);
        try {
          const arrayBuffer = await pdfFile.arrayBuffer();
          const result = await mammoth.convertToHtml({ arrayBuffer });
          setHtmlContent(result.value);
        } catch (error) {
          console.error("Error converting DOCX:", error);
          setHtmlContent(
            "<p style='color: red;'>Failed to convert document</p>",
          );
        } finally {
          setIsConvertingDocx(false);
        }
      };
      convertDocx();
    } else {
      setHtmlContent("");
      setIsConvertingDocx(false);
    }
  }, [module.id, lesson.id, lesson.resourceUrl]);

  // Effect to parse PPTX file
  useEffect(() => {
    const cacheKey = `${module.id}-${lesson.id}`;
    const cachedFiles = (window as any).__lessonFileCache?.get(cacheKey);
    const pdfFile = cachedFiles?.pdfFile;

    if (pdfFile && pdfFile.name.toLowerCase().endsWith(".pptx")) {
      const parsePptx = async () => {
        setIsConvertingPptx(true);
        setCurrentSlideIndex(0);
        try {
          const arrayBuffer = await pdfFile.arrayBuffer();
          const zip = new JSZip();
          await zip.loadAsync(arrayBuffer);

          // Find slide XML files more robustly
          const slideFilePaths: string[] = [];
          zip.forEach((relativePath) => {
            if (
              relativePath.startsWith("ppt/slides/slide") &&
              relativePath.endsWith(".xml") &&
              !relativePath.includes("_rels") &&
              !relativePath.includes("slidemaster") &&
              !relativePath.includes("slideLayout")
            ) {
              slideFilePaths.push(relativePath);
            }
          });

          // Sort slides numerically
          slideFilePaths.sort((a, b) => {
            const numA = parseInt(a.match(/slide(\d+)/)?.[1] || "0");
            const numB = parseInt(b.match(/slide(\d+)/)?.[1] || "0");
            return numA - numB;
          });

          console.log(
            "Slide files found:",
            slideFilePaths.length,
            slideFilePaths,
          );

          const slidePreviews: string[] = [];

          for (let i = 0; i < slideFilePaths.length; i++) {
            try {
              const slideXml = await zip.file(slideFilePaths[i])?.async("text");
              if (slideXml) {
                // Extract all text content
                const textMatches =
                  slideXml.match(/<a:t>([^<]*)<\/a:t>/g) || [];
                const slideTexts = textMatches
                  .map((match) =>
                    decodeXmlEntities(
                      match.replace(/<a:t>|<\/a:t>/g, "").trim(),
                    ),
                  )
                  .filter((text) => text.length > 0);

                const slideContent =
                  slideTexts.length > 0
                    ? slideTexts.join("\n")
                    : `[Slide ${i + 1}]`;

                console.log(`Slide ${i + 1}:`, slideContent);
                slidePreviews.push(slideContent);
              }
            } catch (err) {
              console.error(`Error parsing slide ${i + 1}:`, err);
              slidePreviews.push(`[Slide ${i + 1}]`);
            }
          }

          if (slidePreviews.length === 0) {
            slidePreviews.push("Presentation loaded - click through slides");
          }

          setPptxSlides(slidePreviews);
        } catch (error) {
          console.error("Error parsing PPTX:", error);
          setPptxSlides(["Failed to parse presentation"]);
        } finally {
          setIsConvertingPptx(false);
        }
      };
      parsePptx();
    } else {
      setPptxSlides([]);
      setIsConvertingPptx(false);
      setCurrentSlideIndex(0);
    }
  }, [module.id, lesson.id, lesson.resourceUrl]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setValidationMessage({
        title: "File Too Large",
        description: `The selected file is ${(file.size / (1024 * 1024)).toFixed(2)} MB, which exceeds the maximum allowed size of ${MAX_FILE_SIZE_MB} MB. Please choose a smaller file or compress the document before uploading.`,
      });
      setShowValidationModal(true);
      e.target.value = ""; // Reset file input
      return;
    }

    const lowerName = file.name.toLowerCase();
    const isDocx = lowerName.endsWith(".docx");
    const isPptx = lowerName.endsWith(".pptx");
    const resourceType = isDocx
      ? "document"
      : isPptx
        ? "slides"
        : "pdf";

    setDocumentUploadError("");

    // For DOCX/PPTX, upload immediately to enable Office Online preview
    if (isDocx || isPptx) {
      setIsUploadingDocument(true);
      try {
        const { url, error } = await StorageService.uploadDocument(
          file,
          currentCourseId,
        );

        if (error || !url) {
          setDocumentUploadError(
            error || "Upload failed. Please try again.",
          );
          return;
        }

        updateLesson(module.id, lesson.id, {
          resourceUrl: url,
          resourceType,
          fileSize: file.size,
        });

        const cacheKey = `${module.id}-${lesson.id}`;
        const existingCache =
          (window as any).__lessonFileCache?.get(cacheKey) || {};
        delete existingCache.pdfFile;
        (window as any).__lessonFileCache?.set(cacheKey, existingCache);
      } finally {
        setIsUploadingDocument(false);
      }

      return;
    }

    // For PDF, keep local preview behavior
    updateLesson(module.id, lesson.id, {
      resourceUrl: `[LOCAL_FILE: ${file.name}]`,
      resourceType,
      fileSize: file.size,
    });

    const cacheKey = `${module.id}-${lesson.id}`;
    const existingCache =
      (window as any).__lessonFileCache?.get(cacheKey) || {};
    (window as any).__lessonFileCache?.set(cacheKey, {
      ...existingCache,
      pdfFile: file,
    });
  };

  const clearDocument = () => {
    updateLesson(module.id, lesson.id, {
      resourceUrl: "",
      fileSize: 0,
    });
    // Clear from cache
    const cacheKey = `${module.id}-${lesson.id}`;
    const existingCache = (window as any).__lessonFileCache?.get(cacheKey) || {};
    delete existingCache.pdfFile;
    (window as any).__lessonFileCache?.set(cacheKey, existingCache);
  };

  const switchToUrlMode = () => {
    // Don't allow switching if there's a local file
    if (
      lesson?.resourceUrl?.startsWith("[LOCAL_FILE:") &&
      lesson.resourceUrl !== "[LOCAL_FILE: ]"
    ) {
      return;
    }
    if (lesson?.resourceUrl?.startsWith("[LOCAL_FILE:")) {
      updateLesson(module.id, lesson.id, {
        resourceUrl: "",
        fileSize: 0,
      });
      // Clear from cache
      const cacheKey = `${module.id}-${lesson.id}`;
      const existingCache =
        (window as any).__lessonFileCache?.get(cacheKey) || {};
      delete existingCache.pdfFile;
      (window as any).__lessonFileCache?.set(cacheKey, existingCache);
    }
  };

  const switchToUploadMode = () => {
    // Don't allow switching if there's a URL
    if (
      lesson?.resourceUrl &&
      !lesson.resourceUrl.startsWith("[LOCAL_FILE:")
    ) {
      return;
    }
    if (
      lesson?.resourceUrl &&
      !lesson.resourceUrl.startsWith("[LOCAL_FILE:")
    ) {
      updateLesson(module.id, lesson.id, {
        resourceUrl: "",
        fileSize: 0,
      });
    }
    // Force to upload mode by setting a placeholder if empty
    if (!lesson?.resourceUrl) {
      updateLesson(module.id, lesson.id, {
        resourceUrl: "[LOCAL_FILE: ]",
      });
    }
  };

  const renderLocalFilePreview = () => {
    const cacheKey = `${module.id}-${lesson.id}`;
    const cachedFiles = (window as any).__lessonFileCache?.get(cacheKey);
    const pdfFile = cachedFiles?.pdfFile;

    if (!pdfFile) return null;

    const fileName = pdfFile.name.toLowerCase();
    const isPdf = fileName.endsWith(".pdf");
    const isDocx = fileName.endsWith(".docx");
    const isPptx = fileName.endsWith(".pptx");

    if (isPdf) {
      const fileUrl = URL.createObjectURL(pdfFile);
      return (
        <div className="mt-3">
          <label
            style={{ color: Colors.textSecondary }}
            className="block text-sm font-medium mb-2"
          >
            📄 PDF Preview
          </label>
          <div
            className="rounded overflow-hidden border"
            style={{
              borderColor: Colors.gray600,
              height: "500px",
            }}
          >
            <iframe
              src={fileUrl}
              style={{
                width: "100%",
                height: "100%",
                border: "none",
              }}
              title="PDF preview"
            />
          </div>
        </div>
      );
    } else if (isDocx) {
      return (
        <div className="mt-3">
          <label
            style={{ color: Colors.textSecondary }}
            className="block text-sm font-medium mb-2"
          >
            📘 Word Document Preview
          </label>
          {isConvertingDocx ? (
            <div
              className="rounded border p-4 text-center"
              style={{
                borderColor: Colors.gray600,
                backgroundColor: Colors.textInputBg,
                color: Colors.textMuted,
              }}
            >
              <p className="text-sm">Converting document...</p>
            </div>
          ) : htmlContent &&
            htmlContent !==
              "<p style='color: red;'>Failed to convert document</p>" ? (
            <div
              className="rounded overflow-auto border flex flex-col"
              style={{
                borderColor: Colors.gray600,
                backgroundColor: "#f5f5f5",
                height: "500px",
                padding: "20px",
              }}
            >
              <style>{`
                .docx-preview {
                  background-color: #ffffff;
                  width: 100%;
                  max-width: 816px;
                  padding: 40px;
                  box-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24);
                  font-family: 'Calibri', 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
                  font-size: 14px;
                  line-height: 1.5;
                  color: #000000;
                  margin: auto;
                }
                .docx-preview * {
                  margin: 0;
                  padding: 0;
                  color: #000000;
                }
                .docx-preview p {
                  margin-bottom: 12px;
                  line-height: 1.5;
                  font-size: 14px;
                }
                .docx-preview h1, .docx-preview h2, .docx-preview h3, .docx-preview h4, .docx-preview h5, .docx-preview h6 {
                  font-weight: 600;
                  margin: 14px 0 10px 0;
                  line-height: 1.3;
                  color: #000000;
                }
                .docx-preview h1 { font-size: 28px; }
                .docx-preview h2 { font-size: 24px; }
                .docx-preview h3 { font-size: 20px; }
                .docx-preview h4 { font-size: 16px; }
                .docx-preview strong, .docx-preview b { font-weight: 700; color: #000000; }
                .docx-preview em, .docx-preview i { font-style: italic; color: #000000; }
                .docx-preview u { text-decoration: underline; color: #000000; }
                .docx-preview ul { margin: 10px 0 10px 40px; list-style-type: disc; }
                .docx-preview ol { margin: 10px 0 10px 40px; list-style-type: decimal; }
                .docx-preview li { margin-bottom: 6px; line-height: 1.5; color: #000000; }
                .docx-preview ul ul { list-style-type: circle; margin-left: 30px; }
                .docx-preview ul ul ul { list-style-type: square; margin-left: 30px; }
                .docx-preview table { border-collapse: collapse; width: 100%; margin: 12px 0; border: 1px solid #a6a6a6; }
                .docx-preview td, .docx-preview th { border: 1px solid #a6a6a6; padding: 8px; text-align: left; color: #000000; }
                .docx-preview th { background-color: #f0f0f0; font-weight: 600; }
                .docx-preview a { color: #0563c1; text-decoration: underline; }
                .docx-preview blockquote { margin: 10px 0 10px 30px; border-left: 4px solid #a6a6a6; padding-left: 15px; color: #595959; font-style: italic; }
                .docx-preview hr { border: none; border-top: 1px solid #a6a6a6; margin: 12px 0; }
              `}</style>
              <div
                className="docx-preview"
                dangerouslySetInnerHTML={{
                  __html: htmlContent,
                }}
              />
            </div>
          ) : (
            <div
              className="rounded border p-4 text-center"
              style={{
                borderColor: Colors.gray600,
                backgroundColor: Colors.textInputBg,
                color: Colors.textMuted,
                height: "500px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <p className="text-sm">No content to display</p>
            </div>
          )}
          <div
            className="mt-2 px-3 py-2 rounded text-xs"
            style={{
              backgroundColor: Colors.gray800,
              color: Colors.textMuted,
            }}
          >
            💡 This is a basic preview. Save the lesson to view with
            pixel-perfect formatting via Microsoft Office Online
          </div>
        </div>
      );
    } else if (isPptx) {
      return (
        <div className="mt-3">
          <label
            style={{ color: Colors.textSecondary }}
            className="block text-sm font-medium mb-2"
          >
            📊 PowerPoint Preview
          </label>
          {isConvertingPptx ? (
            <div
              className="rounded border p-4 text-center"
              style={{
                borderColor: Colors.gray600,
                backgroundColor: Colors.textInputBg,
                color: Colors.textMuted,
              }}
            >
              <p className="text-sm">Parsing presentation...</p>
            </div>
          ) : pptxSlides.length > 0 ? (
            <div
              className="rounded border overflow-hidden flex flex-col"
              style={{
                borderColor: Colors.gray600,
                backgroundColor: Colors.textInputBg,
                height: "500px",
              }}
            >
              <div
                className="flex-1 p-6 overflow-auto"
                style={{
                  backgroundColor: "#2a2a2a",
                  color: Colors.textPrimary,
                  fontFamily: "Segoe UI, sans-serif",
                }}
              >
                <div
                  style={{
                    padding: "20px",
                    backgroundColor: "#ffffff",
                    color: "#333",
                    borderRadius: "4px",
                    minHeight: "200px",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    fontSize: "14px",
                    lineHeight: "1.6",
                  }}
                >
                  {pptxSlides[currentSlideIndex]}
                </div>
              </div>
              <div
                className="flex items-center justify-between p-3"
                style={{
                  borderTop: `1px solid ${Colors.gray600}`,
                  backgroundColor: Colors.textInputBg,
                }}
              >
                <button
                  onClick={() =>
                    setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))
                  }
                  disabled={currentSlideIndex === 0}
                  style={{
                    padding: "6px 12px",
                    backgroundColor:
                      currentSlideIndex === 0 ? Colors.gray800 : Colors.secondary,
                    color: Colors.textPrimary,
                    border: "none",
                    borderRadius: "4px",
                    cursor:
                      currentSlideIndex === 0 ? "not-allowed" : "pointer",
                    opacity: currentSlideIndex === 0 ? 0.5 : 1,
                    fontSize: "12px",
                  }}
                >
                  ← Prev
                </button>
                <span
                  style={{
                    color: Colors.textSecondary,
                    fontSize: "12px",
                  }}
                >
                  Slide {currentSlideIndex + 1} of {pptxSlides.length}
                </span>
                <button
                  onClick={() =>
                    setCurrentSlideIndex(
                      Math.min(pptxSlides.length - 1, currentSlideIndex + 1),
                    )
                  }
                  disabled={currentSlideIndex === pptxSlides.length - 1}
                  style={{
                    padding: "6px 12px",
                    backgroundColor:
                      currentSlideIndex === pptxSlides.length - 1
                        ? Colors.gray800
                        : Colors.secondary,
                    color: Colors.textPrimary,
                    border: "none",
                    borderRadius: "4px",
                    cursor:
                      currentSlideIndex === pptxSlides.length - 1
                        ? "not-allowed"
                        : "pointer",
                    opacity:
                      currentSlideIndex === pptxSlides.length - 1 ? 0.5 : 1,
                    fontSize: "12px",
                  }}
                >
                  Next →
                </button>
              </div>
              <div
                className="px-3 py-2 text-xs"
                style={{
                  borderTop: `1px solid ${Colors.gray600}`,
                  backgroundColor: Colors.gray800,
                  color: Colors.textMuted,
                }}
              >
                💡 This is a text preview. Save the lesson to view with full
                formatting via Microsoft Office Online
              </div>
            </div>
          ) : (
            <div
              className="rounded border p-4 text-center"
              style={{
                borderColor: Colors.gray600,
                backgroundColor: Colors.textInputBg,
                color: Colors.textMuted,
                height: "500px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
              }}
            >
              <p className="text-sm font-medium mb-2">
                Preparing presentation...
              </p>
              <p className="text-xs" style={{ color: Colors.textMuted }}>
                If this takes too long, the file may not be a valid PowerPoint
                document
              </p>
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div>
      <label
        style={{ color: Colors.textSecondary }}
        className="block text-sm font-medium mb-2"
      >
        Document<span className="text-red-500 ml-1">*</span>
      </label>
      {showValidationErrors && !hasPdf && (
        <p className="text-xs text-red-400 mb-2">
          Document URL or file is required.
        </p>
      )}

      <div className="flex gap-2 mb-2">
        <button
          onClick={switchToUrlMode}
          disabled={
            lesson?.resourceUrl?.startsWith("[LOCAL_FILE:") &&
            lesson.resourceUrl !== "[LOCAL_FILE: ]"
          }
          style={{
            backgroundColor: !lesson?.resourceUrl?.startsWith("[LOCAL_FILE:")
              ? Colors.secondary
              : Colors.gray800,
            color: Colors.textPrimary,
            opacity:
              lesson?.resourceUrl?.startsWith("[LOCAL_FILE:") &&
              lesson.resourceUrl !== "[LOCAL_FILE: ]"
                ? 0.5
                : 1,
            cursor:
              lesson?.resourceUrl?.startsWith("[LOCAL_FILE:") &&
              lesson.resourceUrl !== "[LOCAL_FILE: ]"
                ? "not-allowed"
                : "pointer",
          }}
          className="px-3 py-1 rounded text-sm"
        >
          URL
        </button>
        <button
          onClick={switchToUploadMode}
          disabled={
            lesson?.resourceUrl &&
            !lesson.resourceUrl.startsWith("[LOCAL_FILE:")
          }
          style={{
            backgroundColor: lesson?.resourceUrl?.startsWith("[LOCAL_FILE:")
              ? Colors.secondary
              : Colors.gray800,
            color: Colors.textPrimary,
            opacity:
              lesson?.resourceUrl &&
              !lesson.resourceUrl.startsWith("[LOCAL_FILE:")
                ? 0.5
                : 1,
            cursor:
              lesson?.resourceUrl &&
              !lesson.resourceUrl.startsWith("[LOCAL_FILE:")
                ? "not-allowed"
                : "pointer",
          }}
          className="px-3 py-1 rounded text-sm"
        >
          Upload File
        </button>
      </div>

      {!lesson?.resourceUrl?.startsWith("[LOCAL_FILE:") ? (
        // URL Input
        <div>
          <input
            type="url"
            value={
              lesson?.resourceUrl?.startsWith("[LOCAL_FILE:")
                ? ""
                : lesson?.resourceUrl || ""
            }
            onChange={(e) => {
              if (isResourceUrlLocked) return;
              updateLesson(module.id, lesson.id, {
                resourceUrl: e.target.value,
              });
            }}
            readOnly={isResourceUrlLocked}
            style={{
              backgroundColor: Colors.textInputBg,
              borderColor: Colors.gray600,
              color: Colors.textPrimary,
              opacity: isResourceUrlLocked ? 0.8 : 1,
              cursor: isResourceUrlLocked ? "not-allowed" : "text",
            }}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:border-opacity-80"
            placeholder="https://example.com/document.pdf"
          />
          {isResourceUrlLocked && (
            <p className="mt-1 text-xs" style={{ color: Colors.textMuted }}>
              URL is auto-generated from local DOCX/PPTX upload and cannot be edited here.
            </p>
          )}
          {lesson?.resourceUrl &&
            !lesson.resourceUrl.startsWith("[LOCAL_FILE:") && (
              <>
                <div
                  className="mt-2 px-2 py-1 rounded flex items-center justify-between"
                  style={{ backgroundColor: Colors.gray800 }}
                >
                  <span
                    style={{
                      color: Colors.textSecondary,
                      fontSize: "13px",
                    }}
                  >
                    {remoteLabel}
                  </span>
                  <button
                    onClick={() =>
                      updateLesson(module.id, lesson.id, {
                        resourceUrl: "",
                      })
                    }
                    style={{ color: Colors.textSecondary }}
                    className="ml-2 hover:text-red-500 hover:bg-red-900/20 p-1 rounded transition-colors"
                    title="Clear document"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-3">
                  {officeOnlinePreviewUrl ? (
                    <OfficeOnlinePreview
                      previewUrl={officeOnlinePreviewUrl}
                      resourceType={isRemoteDocx ? "document" : "slides"}
                      title={lesson.baseTitle || "Document Preview"}
                      onError={() => {
                        if (!documentPreviewError) {
                          setDocumentPreviewError(true);
                          setValidationMessage({
                            title: "Document Preview Error",
                            description: `The ${isRemoteDocx ? "Word document" : "PowerPoint presentation"} preview cannot be loaded. This might be due to an invalid URL, restricted access, or the document not being publicly accessible. Please ensure the document URL is publicly accessible and try again. For best results, upload the document directly using the "Upload File" option.`,
                          });
                          setShowValidationModal(true);
                        }
                      }}
                    />
                  ) : isRemotePdf ? (
                    <>
                      <label
                        style={{ color: Colors.textSecondary }}
                        className="block text-sm font-medium mb-2"
                      >
                        PDF Preview
                      </label>
                      <StyledPDFViewer
                        pdfUrl={lesson.resourceUrl}
                        title={lesson.baseTitle || "PDF Preview"}
                      />
                    </>
                  ) : null}
                </div>
              </>
            )}
        </div>
      ) : (
        // File Upload
        <div>
          <input
            key={`pdf-${lesson.id}`}
            type="file"
            accept=".pdf,.docx,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation"
            onChange={handleFileChange}
            style={{
              backgroundColor: Colors.textInputBg,
              borderColor: Colors.gray600,
              color: Colors.textPrimary,
            }}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:border-opacity-80"
          />
          {isUploadingDocument && (
            <div
              className="mt-2 px-2 py-1 rounded"
              style={{
                backgroundColor: Colors.gray800,
                color: Colors.textSecondary,
                fontSize: "13px",
              }}
            >
              Uploading document for Office Online preview...
            </div>
          )}
          {documentUploadError && (
            <div
              className="mt-2 px-2 py-1 rounded"
              style={{
                backgroundColor: Colors.gray800,
                color: "#ff6b6b",
                fontSize: "13px",
              }}
            >
              {documentUploadError}
            </div>
          )}
          {lesson?.resourceUrl?.startsWith("[LOCAL_FILE:") &&
            lesson.resourceUrl !== "[LOCAL_FILE: ]" && (
              <>
                <div
                  className="mt-2 px-2 py-1 rounded flex items-center justify-between"
                  style={{ backgroundColor: Colors.gray800 }}
                >
                  <span
                    style={{
                      color: Colors.textSecondary,
                      fontSize: "13px",
                    }}
                  >
                    📄{" "}
                    {lesson.resourceUrl
                      .split("[LOCAL_FILE: ")[1]
                      ?.replace("]", "")}
                    {lesson.fileSize && (
                      <span
                        style={{
                          color: Colors.textMuted,
                          marginLeft: "8px",
                        }}
                      >
                        ({(lesson.fileSize / (1024 * 1024)).toFixed(2)} MB)
                      </span>
                    )}
                  </span>
                  <button
                    onClick={clearDocument}
                    style={{ color: Colors.textSecondary }}
                    className="ml-2 hover:text-red-500 hover:bg-red-900/20 p-1 rounded transition-colors"
                    title="Clear PDF"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {renderLocalFilePreview()}
              </>
            )}
        </div>
      )}

      {/* PDF Options
      <div className="mt-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={lesson?.isDownloadable ?? true}
            onChange={(e) =>
              updateLesson(module.id, lesson.id, {
                isDownloadable: e.target.checked,
              })
            }
            className="w-4 h-4"
          />
          <span style={{ color: Colors.textSecondary, fontSize: "14px" }}>
            Allow students to download this PDF
          </span>
        </label>
      </div> */}
    </div>
  );
};
