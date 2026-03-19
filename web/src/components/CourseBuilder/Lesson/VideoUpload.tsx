import React, { useState, useEffect, Dispatch, SetStateAction } from "react";
import { X } from "lucide-react";
import { Colors } from "../../../constants/Colors";

interface Module {
  id: string;
  [key: string]: any;
}

interface Lesson {
  id: string;
  baseTitle?: string;
  videoUrl?: string;
  durationSeconds?: number;
  [key: string]: any;
}

interface VideoUploadProps {
  module: Module;
  lesson: Lesson;
  updateLesson: (
    moduleId: string,
    lessonId: string,
    updates: Partial<Lesson>,
  ) => void;
  showValidationErrors: boolean;
  hasVideo: boolean;
  videoInputType: "url" | "upload";
  setVideoInputType: Dispatch<SetStateAction<"url" | "upload">>;
  handleVideoUrlChange: (url: string) => void;
  handleVideoFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  clearVideo: () => void;
  selectedVideoFile: File | null;
  localVideoPreviewUrl: string;
  setLocalVideoPreviewUrl: (url: string) => void;
  isUploading: boolean;
  extractYouTubeId: (url: string) => string | null;
  extractVimeoId: (url: string) => string | null;
  setValidationMessage: (message: { title: string; description: string }) => void;
  setShowValidationModal: (show: boolean) => void;
}

export const VideoUpload: React.FC<VideoUploadProps> = ({
  module,
  lesson,
  updateLesson,
  showValidationErrors,
  hasVideo,
  videoInputType,
  setVideoInputType,
  handleVideoUrlChange,
  handleVideoFileChange,
  clearVideo,
  selectedVideoFile,
  localVideoPreviewUrl,
  setLocalVideoPreviewUrl,
  isUploading,
  extractYouTubeId,
  extractVimeoId,
  setValidationMessage,
  setShowValidationModal,
}) => {
  const [videoPreviewError, setVideoPreviewError] = useState(false);

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
  }, [selectedVideoFile, lesson?.videoUrl, module.id, lesson.id, setLocalVideoPreviewUrl]);

  return (
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
            backgroundColor: videoInputType === "url"
              ? Colors.secondary
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
            backgroundColor: videoInputType === "upload"
              ? Colors.secondary
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
                  lesson.videoUrl.includes("youtu.be") ||
                  lesson.videoUrl.includes("vimeo.com")) && (
                  <p
                    style={{
                      color: Colors.textMuted,
                      fontSize: "12px",
                      marginTop: "4px",
                    }}
                  >
                    Hosted video detected (YouTube/Vimeo) - duration will be auto-fetched
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
                ) : extractVimeoId(lesson.videoUrl) ? (
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
                        src={`https://player.vimeo.com/video/${extractVimeoId(lesson.videoUrl)}`}
                        allow="autoplay; fullscreen; picture-in-picture"
                        allowFullScreen
                        title="Vimeo video preview"
                        onError={() => {
                          if (!videoPreviewError) {
                            setVideoPreviewError(true);
                            setValidationMessage({
                              title: "Video Preview Error",
                              description:
                                "The Vimeo preview cannot be loaded. Please ensure the Vimeo URL is valid and publicly accessible.",
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
                                "The video cannot be loaded as a direct media file. If this is a hosted URL, use a supported public YouTube or Vimeo link. For direct files, ensure the URL points to MP4, WebM, or OGG and is publicly accessible.",
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
  );
};
