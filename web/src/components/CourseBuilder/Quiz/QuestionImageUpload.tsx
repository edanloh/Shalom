import { X, Loader2 } from "lucide-react";
import { Colors } from "../../../constants/Colors";
import { useState } from "react";
import { StorageService } from "../../../services/storageService";
import { useCourseBuilder } from "../useCourseBuilder";

interface QuestionImageUploadProps {
  currentQuestion: any;
  updateQuestion: (
    moduleId: string,
    quizId: string,
    questionId: string,
    field: string,
    value: any,
  ) => void;
  moduleId: string;
  quizId: string;
  questionImagePreviewUrl: string;
}

export const QuestionImageUpload = ({
  currentQuestion,
  updateQuestion,
  moduleId,
  quizId,
  questionImagePreviewUrl,
}: QuestionImageUploadProps) => {
  const { currentCourseId } = useCourseBuilder();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleImageUrlChange = async (url: string) => {
    // Clear previous errors
    setUploadError(null);

    // Update the input immediately for user feedback
    updateQuestion(moduleId, quizId, currentQuestion.id, "imageUrl", url);

    // If empty or not a valid URL, just return
    if (!url || !url.trim()) {
      return;
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      // Invalid URL format
      setUploadError("Invalid URL format");
      return;
    }

    // Check if it's already a Supabase URL (already uploaded)
    if (url.includes("supabase.co/storage")) {
      // Already uploaded, just store it
      return;
    }

    // This is an external URL - download and upload to bucket
    setIsUploading(true);
    setUploadError(null);

    try {
      // Ensure we have a valid course ID
      let courseIdForUpload = currentCourseId;
      if (!courseIdForUpload || courseIdForUpload === "new") {
        // Generate a new UUID for the course
        courseIdForUpload = crypto.randomUUID();
      }

      // Fetch the image from external URL
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }

      // Check if it's actually an image
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.startsWith("image/")) {
        throw new Error(`URL does not point to an image (type: ${contentType || "unknown"})`);
      }

      // Convert to blob
      const blob = await response.blob();

      // Get filename from URL or use default
      const urlPath = new URL(url).pathname;
      const filename = urlPath.split("/").pop() || "image.jpg";

      // Convert blob to File
      const file = new File([blob], filename, { type: blob.type });

      // Upload to Supabase storage
      const { url: bucketUrl, error } = await StorageService.uploadQuestionImage(
        file,
        courseIdForUpload,
      );

      if (error) {
        throw new Error(error);
      }

      // Update with the bucket URL
      updateQuestion(moduleId, quizId, currentQuestion.id, "imageUrl", bucketUrl);
      setUploadError(null);
    } catch (error: any) {
      console.error("Error uploading image from URL:", error);
      setUploadError(error.message || "Failed to upload image");
      // Revert to empty on error
      updateQuestion(moduleId, quizId, currentQuestion.id, "imageUrl", "");
    } finally {
      setIsUploading(false);
    }
  };

  return (
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
                moduleId,
                quizId,
                currentQuestion.id,
                "imageUrl",
                "",
              );
              // Clear from cache
              const cacheKey = `question-${moduleId}-${quizId}-${currentQuestion.id}`;
              (window as any).__questionImageCache?.delete(cacheKey);
            }
          }}
          disabled={
            currentQuestion.imageUrl?.startsWith("[LOCAL_FILE:") &&
            currentQuestion.imageUrl !== "[LOCAL_FILE: ]"
          }
          style={{
            backgroundColor: (!currentQuestion.imageUrl || 
              (currentQuestion.imageUrl && !currentQuestion.imageUrl.startsWith("[LOCAL_FILE:")))
              ? Colors.secondary
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
                moduleId,
                quizId,
                currentQuestion.id,
                "imageUrl",
                "",
              );
            }
            // Force to upload mode by setting a placeholder if empty
            if (!currentQuestion.imageUrl) {
              updateQuestion(
                moduleId,
                quizId,
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
            backgroundColor: (currentQuestion.imageUrl?.startsWith("[LOCAL_FILE:"))
              ? Colors.secondary
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
          <div className="relative">
            <input
              type="url"
              value={
                currentQuestion.imageUrl?.startsWith("[LOCAL_FILE:")
                  ? ""
                  : currentQuestion.imageUrl || ""
              }
              onChange={(e) => handleImageUrlChange(e.target.value)}
              disabled={isUploading}
              style={{
                backgroundColor: Colors.textInputBg,
                borderColor: uploadError ? "#EF4444" : Colors.gray600,
                color: Colors.textPrimary,
                opacity: isUploading ? 0.6 : 1,
              }}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:border-opacity-80"
              placeholder="https://example.com/image.jpg"
            />
            {isUploading && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Loader2 className="h-5 w-5 animate-spin" style={{ color: Colors.secondary }} />
              </div>
            )}
          </div>
          {uploadError && (
            <p className="text-xs text-red-400 mt-1">
              {uploadError}
            </p>
          )}
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
                moduleId,
                quizId,
                currentQuestion.id,
                "imageUrl",
                `[LOCAL_FILE: ${file.name}]`,
              );

              const cacheKey = `question-${moduleId}-${quizId}-${currentQuestion.id}`;
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
                        moduleId,
                        quizId,
                        currentQuestion.id,
                        "imageUrl",
                        "",
                      );
                      const cacheKey = `question-${moduleId}-${quizId}-${currentQuestion.id}`;
                      (window as any).__questionImageCache?.delete(cacheKey);
                    }}
                    style={{ color: Colors.textSecondary }}
                    className="ml-2 hover:text-red-500 hover:bg-red-900/20 p-1 rounded transition-colors"
                    title="Clear image"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {/* Preview */}
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
  );
};
