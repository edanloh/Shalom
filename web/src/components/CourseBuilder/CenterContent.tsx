import React, { useState, useEffect, useRef } from "react";
import { X, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import mammoth from "mammoth";
import JSZip from "jszip";
import { useCourseBuilder } from "./useCourseBuilder";
import { useContentManagement } from "./useContentManagement";
import { useVideoUpload } from "./useVideoUpload";
import { Button } from "../ui/button";
import { Colors } from "../../constants/Colors";
import { StorageService } from "../../services/storageService";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import StyledPDFViewer from "@/components/document/StyledPDFViewer";
import OfficeOnlinePreview from "@/components/document/OfficeOnlinePreview";
import { ValidationModal } from "./ValidationModal";

/* ------------------------- MODULE EDITOR ------------------------- */
const ModuleEditor = ({
  selectedItem,
  modules,
  updateModule,
  showValidationErrors,
}: any) => {
  const module = modules.find((m: any) => m.id === selectedItem.id);

  // Extract the base title without "Module X:" prefix for editing
  const baseTitle = module?.title?.replace(/^Module \d+:\s*/, "") || "";
  const isModuleTitleEmpty = !baseTitle.trim();

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Module Title<span className="text-red-500 ml-1">*</span>
        </label>
        <input
          type="text"
          value={baseTitle}
          onChange={(e) => {
            // Update with the user's input, the prefix will be added by the numbering system
            const moduleNumber =
              modules.findIndex((m: any) => m.id === selectedItem.id) + 1;
            updateModule(selectedItem.id, {
              title: `Module ${moduleNumber}: ${e.target.value}`,
            });
          }}
          placeholder="Enter module title"
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500"
        />
        {showValidationErrors && isModuleTitleEmpty && (
          <p className="text-xs text-red-400 mt-1">Module title is required.</p>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Description
        </label>
        <textarea
          value={module?.description || ""}
          onChange={(e) =>
            updateModule(selectedItem.id, { description: e.target.value })
          }
          rows={3}
          placeholder="Enter module description..."
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500 resize-none"
        />
      </div>
    </div>
  );
};

/* ------------------------- LESSON EDITOR ------------------------- */
const LessonEditor = ({
  selectedItem,
  modules,
  updateLesson,
  showValidationErrors,
}: any) => {
  const { currentCourseId } = useCourseBuilder();
  const module = modules.find((m: any) =>
    m.lessons.some((l: any) => l.id === selectedItem.id),
  );
  const lesson = module?.lessons.find((l: any) => l.id === selectedItem.id);

  // Return null if lesson or module not found (e.g., after deletion)
  if (!module || !lesson) {
    return (
      <div className="flex items-center justify-center h-full">
        <p style={{ color: Colors.textSecondary }}>
          Lesson not found. Please select a lesson from the sidebar.
        </p>
      </div>
    );
  }

  // Use the video upload hook for all video-related functionality
  const {
    isFetchingDuration,
    isUploading,
    uploadProgress,
    thumbnailInputType,
    setThumbnailInputType,
    videoInputType,
    setVideoInputType,
    selectedThumbnailFile,
    selectedVideoFile,
    extractYouTubeId,
    handleVideoUrlChange,
    handleThumbnailFileChange: originalHandleThumbnailFileChange,
    handleVideoFileChange: originalHandleVideoFileChange,
    clearThumbnail,
    clearVideo,
  } = useVideoUpload(updateLesson, module.id, lesson.id, lesson);

  // Wrap thumbnail file change handler to check for validation errors
  const handleThumbnailFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    originalHandleThumbnailFileChange(e);

    // Check if there was a validation error
    const errorInfo = (window as any).__thumbnailUploadError;
    if (errorInfo) {
      setValidationMessage(errorInfo);
      setShowValidationModal(true);
      delete (window as any).__thumbnailUploadError;
    }
  };

  // Wrap video file change handler to check for validation errors
  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    originalHandleVideoFileChange(e);

    // Check if there was a validation error
    const errorInfo = (window as any).__videoUploadError;
    if (errorInfo) {
      setValidationMessage(errorInfo);
      setShowValidationModal(true);
      delete (window as any).__videoUploadError;
    }
  };

  // Check lesson type
  const isVideoLesson = lesson?.type === "video";
  const isDocumentLesson = !isVideoLesson;
  const documentSubType = lesson?.resourceType || "pdf"; // 'pdf', 'document', 'slides'
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

  // State for DOCX/PPTX preview
  const [htmlContent, setHtmlContent] = useState<string>("");
  const [isConvertingDocx, setIsConvertingDocx] = useState(false);
  const [pptxSlides, setPptxSlides] = useState<string[]>([]);
  const [isConvertingPptx, setIsConvertingPptx] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [localVideoPreviewUrl, setLocalVideoPreviewUrl] = useState("");
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [documentUploadError, setDocumentUploadError] = useState("");

  // Validation states
  const MAX_FILE_SIZE_MB = 50;
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationMessage, setValidationMessage] = useState({
    title: "",
    description: "",
  });
  const [videoPreviewError, setVideoPreviewError] = useState(false);
  const [documentPreviewError, setDocumentPreviewError] = useState(false);

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

  useEffect(() => {
    const cacheKey = `${module.id}-${lesson.id}`;
    const cachedFiles = (window as any).__lessonFileCache?.get(cacheKey);
    const cachedVideoFile = cachedFiles?.videoFile as File | undefined;
    const activeVideoFile = selectedVideoFile || cachedVideoFile;

    if (activeVideoFile) {
      const url = URL.createObjectURL(activeVideoFile);
      setLocalVideoPreviewUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    }

    setLocalVideoPreviewUrl("");
    return undefined;
  }, [selectedVideoFile, lesson?.videoUrl, module.id, lesson.id]);
  const lessonTitleEmpty = !(lesson?.baseTitle || "").trim();
  const hasVideo =
    !!lesson?.videoUrl &&
    lesson.videoUrl.trim() !== "" &&
    lesson.videoUrl !== "[LOCAL_FILE: ]";
  const hasPdf =
    !!lesson?.resourceUrl &&
    lesson.resourceUrl.trim() !== "" &&
    lesson.resourceUrl !== "[LOCAL_FILE: ]";

  return (
    <div className="space-y-4">
      <div>
        <label
          style={{ color: Colors.textSecondary }}
          className="block text-sm font-medium mb-2"
        >
          Lesson Title<span className="text-red-500 ml-1">*</span>
        </label>
        <div
          style={{
            color: Colors.textMuted,
            fontSize: "12px",
            marginBottom: "8px",
          }}
        ></div>
        <input
          type="text"
          value={lesson?.baseTitle || ""}
          onChange={(e) =>
            updateLesson(module.id, lesson.id, { baseTitle: e.target.value })
          }
          style={{
            backgroundColor: Colors.textInputBg,
            borderColor: Colors.gray600,
            color: Colors.textPrimary,
          }}
          placeholder="Enter lesson title"
          className="w-full px-3 py-2 border rounded focus:outline-none focus:border-opacity-80"
        />
        {showValidationErrors && lessonTitleEmpty && (
          <p className="text-xs text-red-400 mt-1">Lesson title is required.</p>
        )}
      </div>
      <div>
        <label
          style={{ color: Colors.textSecondary }}
          className="block text-sm font-medium mb-2"
        >
          Description / Content
        </label>
        <textarea
          value={lesson?.content || ""}
          onChange={(e) =>
            updateLesson(module.id, lesson.id, { content: e.target.value })
          }
          rows={8}
          style={{
            backgroundColor: Colors.textInputBg,
            borderColor: Colors.gray600,
            color: Colors.textPrimary,
          }}
          className="w-full px-3 py-2 border rounded focus:outline-none focus:border-opacity-80 resize-none"
          placeholder="Enter lesson description..."
        />
      </div>

      {/* Conditional rendering based on lesson type */}
      {isDocumentLesson ? (
        // Document Upload Section
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
              onClick={() => {
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
                  (window as any).__lessonFileCache?.set(
                    cacheKey,
                    existingCache,
                  );
                }
              }}
              disabled={
                lesson?.resourceUrl?.startsWith("[LOCAL_FILE:") &&
                lesson.resourceUrl !== "[LOCAL_FILE: ]"
              }
              style={{
                backgroundColor: !lesson?.resourceUrl?.startsWith(
                  "[LOCAL_FILE:",
                )
                  ? Colors.accent
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
              onClick={() => {
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
              }}
              disabled={
                lesson?.resourceUrl &&
                !lesson.resourceUrl.startsWith("[LOCAL_FILE:")
              }
              style={{
                backgroundColor: lesson?.resourceUrl?.startsWith("[LOCAL_FILE:")
                  ? Colors.accent
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
                onChange={(e) =>
                  updateLesson(module.id, lesson.id, {
                    resourceUrl: e.target.value,
                  })
                }
                style={{
                  backgroundColor: Colors.textInputBg,
                  borderColor: Colors.gray600,
                  color: Colors.textPrimary,
                }}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:border-opacity-80"
                placeholder="https://example.com/document.pdf"
              />
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
                onChange={async (e) => {
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
                      const { url, error } =
                        await StorageService.uploadDocument(
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
                      (window as any).__lessonFileCache?.set(
                        cacheKey,
                        existingCache,
                      );
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
                }}
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
                        onClick={() => {
                          updateLesson(module.id, lesson.id, {
                            resourceUrl: "",
                            fileSize: 0,
                          });
                          // Clear from cache
                          const cacheKey = `${module.id}-${lesson.id}`;
                          const existingCache =
                            (window as any).__lessonFileCache?.get(cacheKey) ||
                            {};
                          delete existingCache.pdfFile;
                          (window as any).__lessonFileCache?.set(
                            cacheKey,
                            existingCache,
                          );
                        }}
                        style={{ color: Colors.textSecondary }}
                        className="ml-2 hover:text-red-500 hover:bg-red-900/20 p-1 rounded transition-colors"
                        title="Clear PDF"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    {(() => {
                      const cacheKey = `${module.id}-${lesson.id}`;
                      const cachedFiles = (
                        window as any
                      ).__lessonFileCache?.get(cacheKey);
                      const pdfFile = cachedFiles?.pdfFile;

                      if (pdfFile) {
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
                                  <p className="text-sm">
                                    Converting document...
                                  </p>
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
                                  <p className="text-sm">
                                    No content to display
                                  </p>
                                </div>
                              )}
                              <div
                                className="mt-2 px-3 py-2 rounded text-xs"
                                style={{
                                  backgroundColor: Colors.gray800,
                                  color: Colors.textMuted,
                                }}
                              >
                                💡 This is a basic preview. Save the lesson to
                                view with pixel-perfect formatting via Microsoft
                                Office Online
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
                                  <p className="text-sm">
                                    Parsing presentation...
                                  </p>
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
                                        setCurrentSlideIndex(
                                          Math.max(0, currentSlideIndex - 1),
                                        )
                                      }
                                      disabled={currentSlideIndex === 0}
                                      style={{
                                        padding: "6px 12px",
                                        backgroundColor:
                                          currentSlideIndex === 0
                                            ? Colors.gray800
                                            : Colors.accent,
                                        color: Colors.textPrimary,
                                        border: "none",
                                        borderRadius: "4px",
                                        cursor:
                                          currentSlideIndex === 0
                                            ? "not-allowed"
                                            : "pointer",
                                        opacity:
                                          currentSlideIndex === 0 ? 0.5 : 1,
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
                                      Slide {currentSlideIndex + 1} of{" "}
                                      {pptxSlides.length}
                                    </span>
                                    <button
                                      onClick={() =>
                                        setCurrentSlideIndex(
                                          Math.min(
                                            pptxSlides.length - 1,
                                            currentSlideIndex + 1,
                                          ),
                                        )
                                      }
                                      disabled={
                                        currentSlideIndex ===
                                        pptxSlides.length - 1
                                      }
                                      style={{
                                        padding: "6px 12px",
                                        backgroundColor:
                                          currentSlideIndex ===
                                          pptxSlides.length - 1
                                            ? Colors.gray800
                                            : Colors.accent,
                                        color: Colors.textPrimary,
                                        border: "none",
                                        borderRadius: "4px",
                                        cursor:
                                          currentSlideIndex ===
                                          pptxSlides.length - 1
                                            ? "not-allowed"
                                            : "pointer",
                                        opacity:
                                          currentSlideIndex ===
                                          pptxSlides.length - 1
                                            ? 0.5
                                            : 1,
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
                                    💡 This is a text preview. Save the lesson
                                    to view with full formatting via Microsoft
                                    Office Online
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
                                  <p
                                    className="text-xs"
                                    style={{ color: Colors.textMuted }}
                                  >
                                    If this takes too long, the file may not be
                                    a valid PowerPoint document
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        }
                      }
                      return null;
                    })()}
                  </>
                )}
            </div>
          )}

          {/* PDF Options */}
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
          </div>
        </div>
      ) : (
        // Video Upload Section (existing code)
        <div>
          <label
            style={{ color: Colors.textSecondary }}
            className="block text-sm font-medium mb-2"
          >
            Video<span className="text-red-500 ml-1">*</span>
          </label>
          {showValidationErrors && !hasVideo && (
            <p className="text-xs text-red-400 mb-2">
              Video URL or file is required.
            </p>
          )}
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => {
                // Don't allow switching if there's a local file
                if (
                  lesson?.videoUrl?.startsWith("[LOCAL_FILE:") &&
                  lesson.videoUrl !== "[LOCAL_FILE: ]"
                ) {
                  return;
                }
                // Clear local file when switching to URL mode (check BEFORE setting new mode)
                if (
                  videoInputType === "upload" &&
                  (selectedVideoFile ||
                    lesson?.videoUrl?.startsWith("[LOCAL_FILE:"))
                ) {
                  updateLesson(module.id, lesson.id, {
                    videoUrl: "",
                    durationSeconds: 0,
                  });
                }
                setVideoInputType("url");
              }}
              disabled={
                lesson?.videoUrl?.startsWith("[LOCAL_FILE:") &&
                lesson.videoUrl !== "[LOCAL_FILE: ]"
              }
              style={{
                backgroundColor: !lesson?.videoUrl?.startsWith("[LOCAL_FILE:")
                  ? Colors.accent
                  : Colors.gray800,
                color: Colors.textPrimary,
                opacity:
                  lesson?.videoUrl?.startsWith("[LOCAL_FILE:") &&
                  lesson.videoUrl !== "[LOCAL_FILE: ]"
                    ? 0.5
                    : 1,
                cursor:
                  lesson?.videoUrl?.startsWith("[LOCAL_FILE:") &&
                  lesson.videoUrl !== "[LOCAL_FILE: ]"
                    ? "not-allowed"
                    : "pointer",
              }}
              className="px-3 py-1 rounded text-sm"
            >
              URL
            </button>
            <button
              onClick={() => {
                // Don't allow switching if there's a URL
                if (
                  lesson?.videoUrl &&
                  !lesson.videoUrl.startsWith("[LOCAL_FILE:")
                ) {
                  return;
                }
                // Clear URL when switching to upload mode (check BEFORE setting new mode)
                if (
                  videoInputType === "url" &&
                  lesson?.videoUrl &&
                  !lesson.videoUrl.startsWith("[LOCAL_FILE:")
                ) {
                  updateLesson(module.id, lesson.id, {
                    videoUrl: "",
                    durationSeconds: 0,
                  });
                }
                setVideoInputType("upload");
              }}
              disabled={
                lesson?.videoUrl && !lesson.videoUrl.startsWith("[LOCAL_FILE:")
              }
              style={{
                backgroundColor: lesson?.videoUrl?.startsWith("[LOCAL_FILE:")
                  ? Colors.accent
                  : Colors.gray800,
                color: Colors.textPrimary,
                opacity:
                  lesson?.videoUrl &&
                  !lesson.videoUrl.startsWith("[LOCAL_FILE:")
                    ? 0.5
                    : 1,
                cursor:
                  lesson?.videoUrl &&
                  !lesson.videoUrl.startsWith("[LOCAL_FILE:")
                    ? "not-allowed"
                    : "pointer",
              }}
              className="px-3 py-1 rounded text-sm"
            >
              Upload File
            </button>
          </div>
          {videoInputType === "url" ? (
            <div>
              <input
                type="url"
                value={
                  lesson?.videoUrl?.startsWith("[LOCAL_FILE:")
                    ? ""
                    : lesson?.videoUrl || ""
                }
                onChange={(e) => handleVideoUrlChange(e.target.value)}
                style={{
                  backgroundColor: Colors.textInputBg,
                  borderColor: Colors.gray600,
                  color: Colors.textPrimary,
                }}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:border-opacity-80"
                placeholder="https://youtube.com/watch?v=... or any video URL"
              />
              {lesson?.videoUrl &&
                !lesson.videoUrl.startsWith("[LOCAL_FILE:") && (
                  <>
                    <div
                      className="mt-2 px-2 py-1 rounded flex items-center justify-between"
                      style={{ backgroundColor: "transparent" }}
                    >
                      <span
                        style={{
                          color: Colors.textSecondary,
                          fontSize: "13px",
                        }}
                      >
                        🎥 Video URL added
                      </span>
                      <button
                        onClick={clearVideo}
                        style={{ color: Colors.textSecondary }}
                        className="ml-2 hover:text-red-500 hover:bg-red-900/20 p-1 rounded transition-colors"
                        title="Clear video"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    {(lesson.videoUrl.includes("youtube.com") ||
                      lesson.videoUrl.includes("youtu.be")) && (
                      <p
                        style={{
                          color: Colors.textMuted,
                          fontSize: "12px",
                          marginTop: "4px",
                        }}
                      >
                        YouTube video detected - duration will be auto-fetched
                      </p>
                    )}
                    {/* Video Preview */}
                    {extractYouTubeId(lesson.videoUrl) ? (
                      <div className="mt-4">
                        <label
                          style={{ color: Colors.textSecondary }}
                          className="block text-sm font-medium mb-2"
                        >
                          Video Preview
                        </label>
                        <div
                          className="rounded overflow-hidden"
                          style={{
                            backgroundColor: Colors.gray800,
                            aspectRatio: "16/9",
                            position: "relative",
                          }}
                        >
                          <iframe
                            key={lesson.videoUrl}
                            style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              width: "100%",
                              height: "100%",
                              border: "none",
                            }}
                            src={`https://www.youtube.com/embed/${extractYouTubeId(lesson.videoUrl)}`}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            title="Video preview"
                            onError={() => {
                              if (!videoPreviewError) {
                                setVideoPreviewError(true);
                                setValidationMessage({
                                  title: "Video Preview Error",
                                  description:
                                    "The video preview cannot be loaded. This might be due to an invalid URL, restricted content, or network issues. Please ensure the video URL is accessible and try again. For best results, consider hosting your video on YouTube.",
                                });
                                setShowValidationModal(true);
                              }
                            }}
                          />
                        </div>
                      </div>
                    ) : lesson.videoUrl &&
                      lesson.videoUrl.trim() &&
                      lesson.videoUrl !== "[LOCAL_FILE: ]" ? (
                      <div className="mt-4">
                        <label
                          style={{ color: Colors.textSecondary }}
                          className="block text-sm font-medium mb-2"
                        >
                          Video Preview
                        </label>
                        <div
                          className="rounded overflow-hidden"
                          style={{
                            backgroundColor: Colors.gray800,
                            aspectRatio: "16/9",
                            position: "relative",
                          }}
                        >
                          <video
                            src={lesson.videoUrl}
                            controls
                            style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              width: "100%",
                              height: "100%",
                            }}
                            onError={() => {
                              if (!videoPreviewError) {
                                setVideoPreviewError(true);
                                setValidationMessage({
                                  title: "Video Cannot Be Loaded",
                                  description:
                                    "The video file cannot be loaded properly. This could be due to an unsupported video format, a corrupted file, or network issues. Please ensure the video URL is accessible and in a standard format (MP4, WebM, or OGG), or consider hosting your video on YouTube and using the URL option instead.",
                                });
                                setShowValidationModal(true);
                              }
                            }}
                          />
                        </div>
                      </div>
                    ) : null}
                  </>
                )}
            </div>
          ) : (
            <div>
              <div>
                <input
                  key={`video-${lesson.id}`}
                  type="file"
                  accept="video/*"
                  onChange={handleVideoFileChange}
                  disabled={isUploading}
                  style={{
                    backgroundColor: Colors.textInputBg,
                    borderColor: Colors.gray600,
                    color: Colors.textPrimary,
                  }}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:border-opacity-80"
                />
                {(selectedVideoFile ||
                  lesson?.videoUrl?.startsWith("[LOCAL_FILE:")) && (
                  <div
                    className="mt-2 px-2 py-1 rounded flex items-center justify-between"
                    style={{ backgroundColor: "transparent" }}
                  >
                    <span
                      style={{ color: Colors.textSecondary, fontSize: "13px" }}
                    >
                      🎥{" "}
                      {selectedVideoFile?.name ||
                        lesson?.videoUrl
                          ?.split("[LOCAL_FILE: ")[1]
                          ?.replace("]", "")}
                      {selectedVideoFile && (
                        <span
                          style={{ color: Colors.textMuted, marginLeft: "8px" }}
                        >
                          ({(selectedVideoFile.size / (1024 * 1024)).toFixed(2)}{" "}
                          MB)
                        </span>
                      )}
                    </span>
                    <button
                      onClick={clearVideo}
                      style={{ color: Colors.textSecondary }}
                      className="ml-2 hover:text-red-500 hover:bg-red-900/20 p-1 rounded transition-colors"
                      title="Clear video"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
                {(selectedVideoFile ||
                  lesson?.videoUrl?.startsWith("[LOCAL_FILE:")) &&
                  localVideoPreviewUrl && (
                    <div className="mt-4">
                      <label
                        style={{ color: Colors.textSecondary }}
                        className="block text-sm font-medium mb-2"
                      >
                        Video Preview
                      </label>
                      <div
                        className="rounded overflow-hidden"
                        style={{
                          backgroundColor: Colors.gray800,
                          aspectRatio: "16/9",
                          position: "relative",
                        }}
                      >
                        <video
                          src={localVideoPreviewUrl}
                          controls
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                          }}
                          onError={() => {
                            if (!videoPreviewError) {
                              setVideoPreviewError(true);
                              setValidationMessage({
                                title: "Video Cannot Be Loaded",
                                description:
                                  "The uploaded video file cannot be loaded properly. This could be due to an unsupported video format or a corrupted file. Please try uploading a different video file in a standard format (MP4, WebM, or OGG), or consider hosting your video on YouTube and using the URL option instead.",
                              });
                              setShowValidationModal(true);
                            }
                          }}
                        />
                      </div>
                    </div>
                  )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Duration and Preview settings - show for video only */}
      <div className="grid grid-cols-2 gap-4">
        {isVideoLesson && (
          <div>
            <label
              style={{ color: Colors.textSecondary }}
              className="block text-sm font-medium mb-2"
            >
              Duration (HH:MM:SS)
              {isFetchingDuration && (
                <span
                  className="ml-2 text-xs"
                  style={{ color: Colors.textMuted }}
                >
                  Fetching...
                </span>
              )}
            </label>
            <input
              type="text"
              value={(() => {
                const seconds = lesson?.durationSeconds || 0;
                const hours = Math.floor(seconds / 3600);
                const minutes = Math.floor((seconds % 3600) / 60);
                const secs = seconds % 60;
                return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
              })()}
              onChange={(e) => {
                const value = e.target.value;
                const parts = value.split(":");
                if (parts.length === 3) {
                  const hours = parseInt(parts[0]) || 0;
                  const minutes = parseInt(parts[1]) || 0;
                  const secs = parseInt(parts[2]) || 0;
                  const totalSeconds = hours * 3600 + minutes * 60 + secs;
                  updateLesson(module.id, lesson.id, {
                    durationSeconds: totalSeconds,
                  });
                }
              }}
              style={{
                backgroundColor: Colors.textInputBg,
                borderColor: Colors.gray600,
                color: Colors.textPrimary,
              }}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:border-opacity-80"
              placeholder="00:00:00"
              disabled={isFetchingDuration}
            />
          </div>
        )}
      </div>

      {/* Validation Modal */}
      <ValidationModal
        open={showValidationModal}
        onOpenChange={setShowValidationModal}
        title={validationMessage.title}
        description={validationMessage.description}
      />
    </div>
  );
};

/* ------------------------- PAGED QUIZ EDITOR ------------------------- */
const QuizEditor = ({
  selectedItem,
  modules,
  updateQuiz,
  addQuestion,
  deleteQuestion,
  updateQuestion,
  addOption,
  removeOption,
  showValidationErrors,
}: any) => {
  const { deleteQuiz } = useContentManagement();
  const { currentCourseId, setCurrentCourseId } = useCourseBuilder();
  const module = modules.find((m: any) =>
    m.quizzes.some((q: any) => q.id === selectedItem.id),
  );
  const quiz = module?.quizzes.find((q: any) => q.id === selectedItem.id);
  const quizTitleEmpty = !(quiz?.baseTitle || "").trim();
  const passingScoreInvalid =
    quiz?.passingScore === undefined ||
    quiz?.passingScore === null ||
    Number.isNaN(Number(quiz?.passingScore));
  const maxAttemptsInvalid =
    quiz?.maxAttempts !== null &&
    quiz?.maxAttempts !== undefined &&
    Number(quiz?.maxAttempts) < 1;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  // FIX 1: Declare questionImagePreviewUrl state here in QuizEditor (not LessonEditor)
  const [questionImagePreviewUrl, setQuestionImagePreviewUrl] = useState<string>("");

  // Reset currentIndex when quiz changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [quiz?.id]);

  // Return null if quiz or module not found (e.g., after deletion)
  // FIX 2: Guard clause moved BEFORE useEffect that depends on currentQuestion,
  // so we derive currentQuestion after the guard and pass it as a dep safely.
  if (!module || !quiz) {
    return (
      <div className="flex items-center justify-center h-full">
        <p style={{ color: Colors.textSecondary }}>
          Quiz not found. Please select a quiz from the sidebar.
        </p>
      </div>
    );
  }

  const questions = quiz?.questions || [];
  const currentQuestion = questions[currentIndex];

  // Effect to sync options/correctAnswer when question type changes.
  // This runs AFTER the render where type was updated, so it always sees the new type
  // and can reliably reset dependent fields without racing the type update.
  const prevQuestionTypeRef = React.useRef<string | undefined>(undefined);
  const prevQuestionIdRef = React.useRef<string | undefined>(undefined);
  useEffect(() => { // eslint-disable-line react-hooks/rules-of-hooks
    if (!currentQuestion) return;

    // When navigating to a different question, reset the ref so we don't
    // incorrectly treat a type-change as happening on the new question
    if (prevQuestionIdRef.current !== currentQuestion.id) {
      prevQuestionIdRef.current = currentQuestion.id;
      prevQuestionTypeRef.current = currentQuestion.type;

      // If the question is already true-false but has no/wrong options, fix it now
      if (currentQuestion.type === "true-false") {
        const hasValidOptions =
          Array.isArray(currentQuestion.options) &&
          currentQuestion.options[0] === "True" &&
          currentQuestion.options[1] === "False";
        if (!hasValidOptions) {
          updateQuestion(module.id, quiz.id, currentQuestion.id, "options", ["True", "False"]);
        }
        if (currentQuestion.correctAnswer !== 0 && currentQuestion.correctAnswer !== 1) {
          updateQuestion(module.id, quiz.id, currentQuestion.id, "correctAnswer", 0);
        }
      }
      return;
    }

    const prevType = prevQuestionTypeRef.current;
    const currType = currentQuestion.type;

    if (prevType === currType) return; // no change
    prevQuestionTypeRef.current = currType;

    if (currType === "true-false") {
      // Arriving at true-false: always set canonical options so the validator never sees empty options
      updateQuestion(module.id, quiz.id, currentQuestion.id, "options", ["True", "False"]);
      if (currentQuestion.correctAnswer !== 0 && currentQuestion.correctAnswer !== 1) {
        updateQuestion(module.id, quiz.id, currentQuestion.id, "correctAnswer", 0);
      }
    } else if (prevType === "true-false") {
      // Leaving true-false: clear the True/False options so the new type starts blank
      updateQuestion(module.id, quiz.id, currentQuestion.id, "options", ["", ""]);
      updateQuestion(
        module.id, quiz.id, currentQuestion.id, "correctAnswer",
        currType === "multiple-correct" ? [] : null,
      );
    }
  }, [currentQuestion?.type, currentQuestion?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Image preview effect: creates a stable object URL from the cached File object
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    const cacheKey = `question-${module?.id}-${quiz?.id}-${currentQuestion?.id}`;
    const cachedFile = (window as any).__questionImageCache?.get(cacheKey);
    if (cachedFile) {
      const url = URL.createObjectURL(cachedFile);
      setQuestionImagePreviewUrl(url);
      return () => { URL.revokeObjectURL(url); };
    } else {
      setQuestionImagePreviewUrl("");
      return undefined;
    }
  }, [currentQuestion?.id, currentQuestion?.imageUrl, module?.id, quiz?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNext = () => {
    if (currentIndex < questions.length - 1) setCurrentIndex(currentIndex + 1);
  };

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const handleDeleteQuestion = () => {
    if (questions.length === 1) {
      // Show confirmation dialog if this is the last question
      setShowDeleteDialog(true);
    } else {
      // Delete question normally
      deleteQuestion(module.id, quiz.id, currentQuestion.id);
      // Adjust currentIndex if needed
      if (currentIndex >= questions.length - 1 && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      }
    }
  };

  const handleConfirmDeleteQuiz = () => {
    // Delete the entire quiz
    deleteQuiz(module.id, quiz.id);
    setShowDeleteDialog(false);
  };

  // Handle image URL input - download and upload to Supabase
  const handleImageUrlChange = async (url: string) => {
    // Update the input immediately for user feedback
    updateQuestion(
      module.id,
      quiz.id,
      currentQuestion.id,
      "imageUrl",
      url,
    );

    // If empty or not a valid URL, just return
    if (!url || !url.trim()) {
      return;
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      // Invalid URL format, but we'll store it anyway and let save handle it
      return;
    }

    // Check if it's already a Supabase URL (already uploaded)
    if (url.includes('supabase.co/storage')) {
      // Already uploaded, just store it
      updateQuestion(
        module.id,
        quiz.id,
        currentQuestion.id,
        "imageUrl",
        url,
      );
      return;
    }

    // Store the external URL directly - will be uploaded during save
    updateQuestion(
      module.id,
      quiz.id,
      currentQuestion.id,
      "imageUrl",
      url,
    );
  };

  return (
    <div className="space-y-6">
      {/* Quiz Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-slate-300">
            Quiz Title<span className="text-red-500 ml-1">*</span>
          </label>
        </div>
        <input
          type="text"
          value={quiz?.baseTitle || ""}
          onChange={(e) =>
            updateQuiz(module.id, quiz.id, { baseTitle: e.target.value })
          }
          placeholder="Enter quiz title (e.g., 'Module 1 Assessment')"
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500"
        />
        {showValidationErrors && quizTitleEmpty && (
          <p className="text-xs text-red-400 mt-1">Quiz title is required.</p>
        )}
      </div>

      {/* Quiz Settings */}
      <div className="space-y-4 mb-6">
        <div className="flex items-start gap-4">
          <div className="mr-4">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Passing Score (%)
              <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="number"
              value={quiz?.passingScore || 70}
              onChange={(e) =>
                updateQuiz(module.id, quiz.id, {
                  passingScore: parseInt(e.target.value) || 70,
                })
              }
              min="0"
              max="100"
              className="w-24 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500"
            />
            {showValidationErrors && passingScoreInvalid && (
              <p className="text-xs text-red-400 mt-1">
                Passing score is required.
              </p>
            )}
          </div>
          <div className="mr-4 flex flex-col">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Max Attempts<span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type={quiz?.maxAttempts === null ? "text" : "number"}
              value={
                quiz?.maxAttempts === null ? "-" : (quiz?.maxAttempts ?? 1)
              }
              onChange={(e) =>
                updateQuiz(module.id, quiz.id, {
                  maxAttempts: Math.max(1, parseInt(e.target.value) || 1),
                })
              }
              min="1"
              readOnly={quiz?.maxAttempts === null}
              className="w-24 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500"
            />
            {showValidationErrors && maxAttemptsInvalid && (
              <p className="text-xs text-red-400 mt-1">
                Must be at least 1 or set to unlimited.
              </p>
            )}
            <label className="mt-2 flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={quiz?.maxAttempts === null}
                onChange={(e) =>
                  updateQuiz(module.id, quiz.id, {
                    maxAttempts: e.target.checked ? null : 1,
                  })
                }
              />
              Unlimited attempts
            </label>
          </div>
          <div className="ml-4">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Total Points
            </label>
            <div className="w-24 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-400">
              {questions.reduce((sum, q) => sum + (q.points || 0), 0)} points
            </div>
          </div>
        </div>
      </div>

      {/* Question Navigation */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="p-2 bg-slate-700 rounded disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4 text-white" />
          </button>
          <span className="text-slate-300 text-sm">
            Question {currentIndex + 1} of {questions.length || 0}
          </span>
          <button
            onClick={handleNext}
            disabled={currentIndex >= questions.length - 1}
            className="p-2 bg-slate-700 rounded disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4 text-white" />
          </button>
        </div>

        <Button
          onClick={() => {
            addQuestion(module.id, quiz.id);
            setCurrentIndex(questions.length);
          }}
          className="w-auto gap-2 mt-2 mb-2"
        >
          <Plus className="h-4 w-4" />
          Add Question
        </Button>
      </div>

      {/* Empty State */}
      {!currentQuestion && (
        <div className="text-slate-400 text-center py-8">
          No questions yet. Click "Add Question" to begin.
        </div>
      )}

      {/* Question Page */}
      {currentQuestion && (
        <div className="relative bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-md space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-white">
              Question {currentIndex + 1}
            </h3>
            <button
              onClick={handleDeleteQuestion}
              className="text-black hover:text-black"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Question text */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Question Text<span className="text-red-500 ml-1">*</span>
            </label>
            <textarea
              value={currentQuestion.text}
              onChange={(e) =>
                updateQuestion(
                  module.id,
                  quiz.id,
                  currentQuestion.id,
                  "text",
                  e.target.value,
                )
              }
              placeholder="Enter question text"
              rows={2}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500 resize-none"
            />
            {showValidationErrors && !currentQuestion.text?.trim() && (
              <p className="text-xs text-red-400 mt-1">
                Question text is required.
              </p>
            )}
          </div>

          {/* Question Type Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Question Type<span className="text-red-500 ml-1">*</span>
            </label>
            <select
              value={currentQuestion.type}
              onChange={(e) => {
                // Only update the type here. The useEffect above watches for type changes
                // and resets options/correctAnswer after the render, avoiding race conditions
                // that occur when calling updateQuestion multiple times in one event handler.
                updateQuestion(module.id, quiz.id, currentQuestion.id, "type", e.target.value);
              }}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500"
            >
              <option value="multiple-choice">
                Multiple Choice (Single Answer)
              </option>
              <option value="multiple-correct">Multiple Correct Answers</option>
              <option value="true-false">True/False</option>
              <option value="short-answer">Short Answer</option>
              <option value="matching">Matching</option>
            </select>
          </div>

          {/* Question Image */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Question Image (optional)
            </label>
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => {
                  // Don't allow switching if there's a local file
                  if (
                    currentQuestion.imageUrl?.startsWith("[LOCAL_FILE:") &&
                    currentQuestion.imageUrl !== "[LOCAL_FILE: ]"
                  ) {
                    return;
                  }
                  // Clear if switching from placeholder
                  if (currentQuestion.imageUrl?.startsWith("[LOCAL_FILE:")) {
                    updateQuestion(
                      module.id,
                      quiz.id,
                      currentQuestion.id,
                      "imageUrl",
                      "",
                    );
                    // Clear from cache
                    const cacheKey = `question-${module.id}-${quiz.id}-${currentQuestion.id}`;
                    (window as any).__questionImageCache?.delete(cacheKey);
                  }
                }}
                disabled={
                  currentQuestion.imageUrl?.startsWith("[LOCAL_FILE:") &&
                  currentQuestion.imageUrl !== "[LOCAL_FILE: ]"
                }
                style={{
                  backgroundColor: !currentQuestion.imageUrl?.startsWith(
                    "[LOCAL_FILE:",
                  )
                    ? Colors.accent
                    : Colors.gray800,
                  color: Colors.textPrimary,
                  opacity:
                    currentQuestion.imageUrl?.startsWith("[LOCAL_FILE:") &&
                    currentQuestion.imageUrl !== "[LOCAL_FILE: ]"
                      ? 0.5
                      : 1,
                  cursor:
                    currentQuestion.imageUrl?.startsWith("[LOCAL_FILE:") &&
                    currentQuestion.imageUrl !== "[LOCAL_FILE: ]"
                      ? "not-allowed"
                      : "pointer",
                }}
                className="px-3 py-1 rounded text-sm"
              >
                URL
              </button>
              <button
                onClick={() => {
                  // Don't allow switching if there's a URL
                  if (
                    currentQuestion.imageUrl &&
                    !currentQuestion.imageUrl.startsWith("[LOCAL_FILE:")
                  ) {
                    return;
                  }
                  // Clear if switching from placeholder
                  if (
                    currentQuestion.imageUrl &&
                    !currentQuestion.imageUrl.startsWith("[LOCAL_FILE:")
                  ) {
                    updateQuestion(
                      module.id,
                      quiz.id,
                      currentQuestion.id,
                      "imageUrl",
                      "",
                    );
                  }
                  // Force to upload mode by setting a placeholder if empty
                  if (!currentQuestion.imageUrl) {
                    updateQuestion(
                      module.id,
                      quiz.id,
                      currentQuestion.id,
                      "imageUrl",
                      "[LOCAL_FILE: ]",
                    );
                  }
                }}
                disabled={
                  currentQuestion.imageUrl &&
                  !currentQuestion.imageUrl.startsWith("[LOCAL_FILE:")
                }
                style={{
                  backgroundColor: currentQuestion.imageUrl?.startsWith(
                    "[LOCAL_FILE:",
                  )
                    ? Colors.accent
                    : Colors.gray800,
                  color: Colors.textPrimary,
                  opacity:
                    currentQuestion.imageUrl &&
                    !currentQuestion.imageUrl.startsWith("[LOCAL_FILE:")
                      ? 0.5
                      : 1,
                  cursor:
                    currentQuestion.imageUrl &&
                    !currentQuestion.imageUrl.startsWith("[LOCAL_FILE:")
                      ? "not-allowed"
                      : "pointer",
                }}
                className="px-3 py-1 rounded text-sm"
              >
                Upload File
              </button>
            </div>
            {!currentQuestion.imageUrl?.startsWith("[LOCAL_FILE:") ? (
              <div>
                <input
                  type="url"
                  value={
                    currentQuestion.imageUrl?.startsWith("[LOCAL_FILE:")
                      ? ""
                      : currentQuestion.imageUrl || ""
                  }
                  onChange={(e) => handleImageUrlChange(e.target.value)}
                  style={{
                    backgroundColor: Colors.textInputBg,
                    borderColor: Colors.gray600,
                    color: Colors.textPrimary,
                  }}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:border-opacity-80"
                  placeholder="https://example.com/image.jpg"
                />
                {currentQuestion.imageUrl &&
                  !currentQuestion.imageUrl.startsWith("[LOCAL_FILE:") && (
                    <div className="mt-2">
                      <img
                        src={currentQuestion.imageUrl}
                        alt="Question image"
                        className="max-w-full h-32 object-cover rounded border border-slate-600"
                      />
                    </div>
                  )}
              </div>
            ) : (
              <div>
                <input
                  key={`question-img-${currentQuestion.id}`}
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    // Validate file is image
                    if (!file.type.startsWith("image/")) {
                      alert("Please select an image file");
                      e.target.value = "";
                      return;
                    }

                    // Store local reference and cache for preview (upload happens during save)
                    updateQuestion(
                      module.id,
                      quiz.id,
                      currentQuestion.id,
                      "imageUrl",
                      `[LOCAL_FILE: ${file.name}]`,
                    );

                    const cacheKey = `question-${module.id}-${quiz.id}-${currentQuestion.id}`;
                    if (!(window as any).__questionImageCache) {
                      (window as any).__questionImageCache = new Map();
                    }
                    (window as any).__questionImageCache.set(cacheKey, file);

                    // Clear the file input
                    e.target.value = "";
                  }}
                  style={{
                    backgroundColor: Colors.textInputBg,
                    borderColor: Colors.gray600,
                    color: Colors.textPrimary,
                  }}
                  className="w-full px-3 py-2 border rounded cursor-pointer"
                />
                {currentQuestion.imageUrl?.startsWith("[LOCAL_FILE:") &&
                  currentQuestion.imageUrl !== "[LOCAL_FILE: ]" && (
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
                          🖼️{" "}
                          {currentQuestion.imageUrl
                            .replace("[LOCAL_FILE: ", "")
                            .replace("]", "")}
                        </span>
                        <button
                          onClick={() => {
                            updateQuestion(
                              module.id,
                              quiz.id,
                              currentQuestion.id,
                              "imageUrl",
                              "",
                            );
                            const cacheKey = `question-${module.id}-${quiz.id}-${currentQuestion.id}`;
                            (window as any).__questionImageCache?.delete(
                              cacheKey,
                            );
                          }}
                          style={{ color: Colors.textSecondary }}
                          className="ml-2 hover:text-red-500 hover:bg-red-900/20 p-1 rounded transition-colors"
                          title="Clear image"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      {/* FIX 4: Replace inline IIFE with stable state-driven preview */}
                      {questionImagePreviewUrl && (
                        <div className="mt-2">
                          <img
                            src={questionImagePreviewUrl}
                            alt="Question image preview"
                            className="max-w-full h-32 object-cover rounded border border-slate-600"
                          />
                        </div>
                      )}
                    </>
                  )}
              </div>
            )}
          </div>

          {/* Options - Only show for certain question types */}
          {(currentQuestion.type === "multiple-choice" ||
            currentQuestion.type === "multiple-correct" ||
            currentQuestion.type === "true-false") && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {currentQuestion.type === "true-false"
                  ? "True/False Options"
                  : currentQuestion.type === "multiple-correct"
                    ? "Options (Select all correct)"
                    : "Answer Options"}
                <span className="text-red-500 ml-1">*</span>
              </label>
              {showValidationErrors &&
                currentQuestion.type !== "true-false" &&
                (!currentQuestion.options ||
                  currentQuestion.options.filter((opt: any) =>
                    String(opt).trim(),
                  ).length === 0) && (
                  <p className="text-xs text-red-400">
                    At least one option is required.
                  </p>
                )}

              {currentQuestion.type === "true-false" ? (
                // True/False specific UI — use <label> wrapping so the entire row is clickable,
                // and onChange on the input directly so React fires reliably on every selection.
                <div className="space-y-2">
                  <label className="flex items-center gap-2 bg-slate-700/40 rounded p-2 cursor-pointer hover:bg-slate-700/60 transition-colors">
                    <input
                      type="radio"
                      name={`question-${currentQuestion.id}`}
                      checked={currentQuestion.correctAnswer === 0}
                      onChange={() => {
                        updateQuestion(module.id, quiz.id, currentQuestion.id, "correctAnswer", 0);
                      }}
                      className="w-4 h-4 accent-blue-500"
                    />
                    <span className="text-white flex-1">True</span>
                  </label>
                  <label className="flex items-center gap-2 bg-slate-700/40 rounded p-2 cursor-pointer hover:bg-slate-700/60 transition-colors">
                    <input
                      type="radio"
                      name={`question-${currentQuestion.id}`}
                      checked={currentQuestion.correctAnswer === 1}
                      onChange={() => {
                        updateQuestion(module.id, quiz.id, currentQuestion.id, "correctAnswer", 1);
                      }}
                      className="w-4 h-4 accent-blue-500"
                    />
                    <span className="text-white flex-1">False</span>
                  </label>
                </div>
              ) : (
                // Multiple choice/Multiple correct options
                <div className="space-y-2">
                  {currentQuestion.options?.map((option: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 bg-slate-700/40 rounded p-2"
                    >
                      <input
                        type={
                          currentQuestion.type === "multiple-correct"
                            ? "checkbox"
                            : "radio"
                        }
                        name={`question-${currentQuestion.id}`}
                        checked={
                          currentQuestion.type === "multiple-correct"
                            ? Array.isArray(currentQuestion.correctAnswer)
                              ? currentQuestion.correctAnswer.includes(idx)
                              : currentQuestion.correctAnswer === idx
                            : currentQuestion.correctAnswer === idx
                        }
                        onChange={() => {
                          if (currentQuestion.type === "multiple-correct") {
                            const currentAnswers = Array.isArray(
                              currentQuestion.correctAnswer,
                            )
                              ? currentQuestion.correctAnswer
                              : [currentQuestion.correctAnswer];
                            const newAnswers = currentAnswers.includes(idx)
                              ? currentAnswers.filter((i) => i !== idx)
                              : [...currentAnswers, idx];
                            updateQuestion(
                              module.id,
                              quiz.id,
                              currentQuestion.id,
                              "correctAnswer",
                              newAnswers,
                            );
                          } else {
                            updateQuestion(
                              module.id,
                              quiz.id,
                              currentQuestion.id,
                              "correctAnswer",
                              idx,
                            );
                          }
                        }}
                      />
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...currentQuestion.options];
                          newOptions[idx] = e.target.value;
                          updateQuestion(
                            module.id,
                            quiz.id,
                            currentQuestion.id,
                            "options",
                            newOptions,
                          );
                        }}
                        className="flex-1 px-3 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                        placeholder={`Option ${idx + 1}`}
                      />
                      {currentQuestion.options.length > 2 && (
                        <button
                          onClick={() =>
                            removeOption(
                              module.id,
                              quiz.id,
                              currentQuestion.id,
                              idx,
                            )
                          }
                          className="text-red-400 hover:text-red-300"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() =>
                      addOption(module.id, quiz.id, currentQuestion.id)
                    }
                    className="text-blue-400 hover:text-blue-300 text-sm"
                  >
                    + Add Option
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Short Answer Note */}
          {currentQuestion.type === "short-answer" && (
            <div className="bg-yellow-900/20 border border-yellow-700/50 rounded p-3">
              <p className="text-xs text-yellow-300">
                ⚠️ Short answer questions require manual grading. Use the
                explanation field above to provide grading guidelines.
              </p>
            </div>
          )}

          {/* Matching Type UI */}
          {currentQuestion.type === "matching" && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Matching Pairs
              </label>
              <div className="space-y-2">
                {currentQuestion.matchingPairs?.map(
                  (pair: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 bg-slate-700/40 rounded p-2"
                    >
                      <input
                        type="text"
                        value={pair.left || ""}
                        onChange={(e) => {
                          const newPairs = [
                            ...(currentQuestion.matchingPairs || []),
                          ];
                          newPairs[idx] = {
                            ...newPairs[idx],
                            left: e.target.value,
                          };
                          updateQuestion(
                            module.id,
                            quiz.id,
                            currentQuestion.id,
                            "matchingPairs",
                            newPairs,
                          );
                        }}
                        placeholder="Left item"
                        className="flex-1 px-3 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                      />
                      <span className="text-slate-400">↔</span>
                      <input
                        type="text"
                        value={pair.right || ""}
                        onChange={(e) => {
                          const newPairs = [
                            ...(currentQuestion.matchingPairs || []),
                          ];
                          newPairs[idx] = {
                            ...newPairs[idx],
                            right: e.target.value,
                          };
                          updateQuestion(
                            module.id,
                            quiz.id,
                            currentQuestion.id,
                            "matchingPairs",
                            newPairs,
                          );
                        }}
                        placeholder="Right item"
                        className="flex-1 px-3 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                      />
                      <button
                        onClick={() => {
                          const newPairs =
                            currentQuestion.matchingPairs?.filter(
                              (_: any, i: number) => i !== idx,
                            ) || [];
                          updateQuestion(
                            module.id,
                            quiz.id,
                            currentQuestion.id,
                            "matchingPairs",
                            newPairs,
                          );
                        }}
                        className="text-red-400 hover:text-red-300"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ),
                )}
                <button
                  onClick={() => {
                    const newPairs = [
                      ...(currentQuestion.matchingPairs || []),
                      { left: "", right: "" },
                    ];
                    updateQuestion(
                      module.id,
                      quiz.id,
                      currentQuestion.id,
                      "matchingPairs",
                      newPairs,
                    );
                  }}
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  + Add Matching Pair
                </button>
              </div>
            </div>
          )}

          {/* Explanation/Feedback Section - For all question types */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Explanation / Feedback
              <span className="text-slate-400 text-xs ml-2">
                (Shown to students after answering)
              </span>
            </label>
            <textarea
              value={currentQuestion.sampleAnswer || ""}
              onChange={(e) =>
                updateQuestion(
                  module.id,
                  quiz.id,
                  currentQuestion.id,
                  "sampleAnswer",
                  e.target.value,
                )
              }
              placeholder="Enter explanation for the correct answer (e.g., why this is the correct choice)"
              rows={3}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500 resize-none"
            />
            <p className="text-xs text-slate-400 mt-1">
              This explanation helps students understand why the answer is
              correct
            </p>
          </div>

          {/* Points input */}
          <div>
            <label className="block text-sm text-slate-300 mb-1">
              Points<span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="number"
              value={currentQuestion.points}
              onChange={(e) =>
                updateQuestion(
                  module.id,
                  quiz.id,
                  currentQuestion.id,
                  "points",
                  parseInt(e.target.value) || 0,
                )
              }
              className="w-24 px-3 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
              min="0"
            />
            {showValidationErrors && Number(currentQuestion.points) <= 0 && (
              <p className="text-xs text-red-400 mt-1">Points are required.</p>
            )}
          </div>
        </div>
      )}

      {/* Delete Last Question Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">
              Delete Last Question
            </DialogTitle>
            <DialogDescription className="text-slate-300">
              A quiz must have at least one question. If you delete this
              question, the entire quiz will be{" "}
              <strong className="font-bold">deleted</strong>. Are you sure you
              want to continue?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDeleteQuiz}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete Quiz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* ------------------------- MAIN CENTER CONTENT ------------------------- */
export const CenterContent = () => {
  const { selectedItem, setSelectedItem, modules, showValidationErrors } =
    useCourseBuilder();
  const {
    updateModule,
    updateLesson,
    updateQuiz,
    addQuestion,
    deleteQuestion,
    updateQuestion,
    addOption,
    removeOption,
  } = useContentManagement();

  if (!selectedItem) {
    return (
      <div className="flex-1 bg-slate-900 flex items-center justify-center">
        <div className="text-center text-slate-400">
          <h2 className="text-2xl font-semibold mb-2">Course Builder</h2>
          <p>Select an item from the left sidebar to edit content</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-slate-900 flex flex-col">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 p-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">
          Edit{" "}
          {selectedItem.type === "module"
            ? "Module"
            : selectedItem.type === "lesson"
              ? "Lesson"
              : "Quiz"}
        </h2>
        <button
          onClick={() => setSelectedItem(null)}
          className="p-2 hover:bg-slate-700 text-slate-400 hover:text-white rounded transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {selectedItem.type === "module" && (
          <ModuleEditor
            selectedItem={selectedItem}
            modules={modules}
            updateModule={updateModule}
            showValidationErrors={showValidationErrors}
          />
        )}
        {selectedItem.type === "lesson" && (
          <LessonEditor
            selectedItem={selectedItem}
            modules={modules}
            updateLesson={updateLesson}
            showValidationErrors={showValidationErrors}
          />
        )}
        {selectedItem.type === "quiz" && (
          <QuizEditor
            selectedItem={selectedItem}
            modules={modules}
            updateQuiz={updateQuiz}
            addQuestion={addQuestion}
            deleteQuestion={deleteQuestion}
            updateQuestion={updateQuestion}
            addOption={addOption}
            removeOption={removeOption}
            showValidationErrors={showValidationErrors}
          />
        )}
      </div>
    </div>
  );
};
