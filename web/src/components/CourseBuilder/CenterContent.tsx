import React, { useState } from "react";
import { X, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { useCourseBuilder } from "./CourseBuilderContext";
import { useContentManagement } from "./useContentManagement";
import { useVideoUpload } from "./useVideoUpload";
import { Button } from "../ui/button";
import { Colors } from "../../constants/Colors";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

/* ------------------------- MODULE EDITOR ------------------------- */
const ModuleEditor = ({ selectedItem, modules, updateModule }: any) => {
  const module = modules.find((m: any) => m.id === selectedItem.id);

  // Extract the base title without "Module X:" prefix for editing
  const baseTitle = module?.title?.replace(/^Module \d+:\s*/, "") || "";

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Module Title
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
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500"
        />
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
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500 resize-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Status
        </label>
        <select
          value={module?.status || "draft"}
          onChange={(e) =>
            updateModule(selectedItem.id, { status: e.target.value })
          }
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500"
        >
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
      </div>
    </div>
  );
};

/* ------------------------- LESSON EDITOR ------------------------- */
const LessonEditor = ({ selectedItem, modules, updateLesson }: any) => {
  const module = modules.find((m: any) =>
    m.lessons.some((l: any) => l.id === selectedItem.id)
  );
  const lesson = module?.lessons.find((l: any) => l.id === selectedItem.id);

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
    handleThumbnailFileChange,
    handleVideoFileChange,
    clearThumbnail,
    clearVideo,
  } = useVideoUpload(updateLesson, module.id, lesson.id, lesson);

  return (
    <div className="space-y-4">
      <div>
        <label
          style={{ color: Colors.textSecondary }}
          className="block text-sm font-medium mb-2"
        >
          Lesson Title
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
          className="w-full px-3 py-2 border rounded focus:outline-none focus:border-opacity-80"
        />
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
      <div>
        <label
          style={{ color: Colors.textSecondary }}
          className="block text-sm font-medium mb-2"
        >
          Lesson Thumbnail (optional)
        </label>
        <div className="flex gap-2 mb-2">
          <button
            onClick={() => {
              // Clear local file when switching to URL mode (check BEFORE setting new mode)
              if (thumbnailInputType === 'upload' && (selectedThumbnailFile || lesson?.thumbnailUrl?.startsWith('[LOCAL_FILE:'))) {
                updateLesson(module.id, lesson.id, { thumbnailUrl: '' });
              }
              setThumbnailInputType('url');
            }}
            style={{
              backgroundColor: thumbnailInputType === 'url' ? Colors.primary : 'transparent',
              color: Colors.textPrimary,
            }}
            className="px-3 py-1 rounded text-sm"
          >
            URL
          </button>
          <button
            onClick={() => {
              // Clear URL when switching to upload mode (check BEFORE setting new mode)
              if (thumbnailInputType === 'url' && lesson?.thumbnailUrl && !lesson.thumbnailUrl.startsWith('[LOCAL_FILE:')) {
                updateLesson(module.id, lesson.id, { thumbnailUrl: '' });
              }
              setThumbnailInputType('upload');
            }}
            style={{
              backgroundColor: thumbnailInputType === 'upload' ? Colors.primary : 'transparent',
              color: Colors.textPrimary,
            }}
            className="px-3 py-1 rounded text-sm"
          >
            Upload File
          </button>
        </div>
        {thumbnailInputType === 'url' ? (
          <div>
            <input
              type="url"
              value={lesson?.thumbnailUrl?.startsWith('[LOCAL_FILE:') ? '' : (lesson?.thumbnailUrl || "")}
              onChange={(e) =>
                updateLesson(module.id, lesson.id, { thumbnailUrl: e.target.value })
              }
              style={{
                backgroundColor: Colors.textInputBg,
                borderColor: Colors.gray600,
                color: Colors.textPrimary,
              }}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:border-opacity-80"
              placeholder="https://..."
            />
            {lesson?.thumbnailUrl && !lesson.thumbnailUrl.startsWith('[LOCAL_FILE:') && (
              <div className="mt-3">
                <label
                  style={{ color: Colors.textSecondary }}
                  className="block text-sm font-medium mb-2"
                >
                  Thumbnail Preview
                </label>
                <div 
                  className="rounded overflow-hidden border"
                  style={{ 
                    borderColor: Colors.gray600,
                    maxWidth: '300px'
                  }}
                >
                  <img
                    src={lesson.thumbnailUrl}
                    alt="Thumbnail preview"
                    style={{
                      width: '100%',
                      height: 'auto',
                      display: 'block'
                    }}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement!.innerHTML = '<p style="padding: 20px; text-align: center; color: #94a3b8;">Failed to load image</p>';
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div>
              <input
                key={`thumbnail-${lesson.id}`}
                type="file"
                accept="image/*"
                onChange={handleThumbnailFileChange}
                disabled={isUploading}
                style={{
                  backgroundColor: Colors.textInputBg,
                  borderColor: Colors.gray600,
                  color: Colors.textPrimary,
                }}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:border-opacity-80"
              />
              {(selectedThumbnailFile || lesson?.thumbnailUrl?.startsWith('[LOCAL_FILE:')) && (
                <div className="mt-2 px-2 py-1 rounded flex items-center justify-between" style={{ backgroundColor: 'transparent' }}>
                  <span style={{ color: Colors.textSecondary, fontSize: '13px' }}>
                    📎 {selectedThumbnailFile?.name || lesson?.thumbnailUrl?.split('[LOCAL_FILE: ')[1]?.replace(']', '')}
                  </span>
                  <button
                    onClick={clearThumbnail}
                    style={{ color: Colors.textSecondary }}
                    className="ml-2 hover:text-red-500 hover:bg-red-900/20 p-1 rounded transition-colors"
                    title="Clear thumbnail"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
            {selectedThumbnailFile && (
              <div className="mt-3">
                <label
                  style={{ color: Colors.textSecondary }}
                  className="block text-sm font-medium mb-2"
                >
                  Thumbnail Preview
                </label>
                <div 
                  className="rounded overflow-hidden border"
                  style={{ 
                    borderColor: Colors.gray600,
                    maxWidth: '300px'
                  }}
                >
                  <img
                    src={URL.createObjectURL(selectedThumbnailFile)}
                    alt="Thumbnail preview"
                    style={{
                      width: '100%',
                      height: 'auto',
                      display: 'block'
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <div>
        <label
          style={{ color: Colors.textSecondary }}
          className="block text-sm font-medium mb-2"
        >
          Video (required)
        </label>
        <div className="flex gap-2 mb-2">
          <button
            onClick={() => {
              // Clear local file when switching to URL mode (check BEFORE setting new mode)
              if (videoInputType === 'upload' && (selectedVideoFile || lesson?.videoUrl?.startsWith('[LOCAL_FILE:'))) {
                updateLesson(module.id, lesson.id, { videoUrl: '', durationSeconds: 0 });
              }
              setVideoInputType('url');
            }}
            style={{
              backgroundColor: videoInputType === 'url' ? Colors.primary : 'transparent',
              color: Colors.textPrimary,
            }}
            className="px-3 py-1 rounded text-sm"
          >
            URL
          </button>
          <button
            onClick={() => {
              // Clear URL when switching to upload mode (check BEFORE setting new mode)
              if (videoInputType === 'url' && lesson?.videoUrl && !lesson.videoUrl.startsWith('[LOCAL_FILE:')) {
                updateLesson(module.id, lesson.id, { videoUrl: '', durationSeconds: 0 });
              }
              setVideoInputType('upload');
            }}
            style={{
              backgroundColor: videoInputType === 'upload' ? Colors.primary : 'transparent',
              color: Colors.textPrimary,
            }}
            className="px-3 py-1 rounded text-sm"
          >
            Upload File
          </button>
        </div>
        {videoInputType === 'url' ? (
          <div>
            <input
              type="url"
              value={lesson?.videoUrl?.startsWith('[LOCAL_FILE:') ? '' : (lesson?.videoUrl || "")}
              onChange={(e) =>
                handleVideoUrlChange(e.target.value)
              }
              style={{
                backgroundColor: Colors.textInputBg,
                borderColor: Colors.gray600,
                color: Colors.textPrimary,
              }}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:border-opacity-80"
              placeholder="https://youtube.com/watch?v=... or any video URL"
            />
            {lesson?.videoUrl && !lesson.videoUrl.startsWith('[LOCAL_FILE:') && (
              <>
                <div className="mt-2 px-2 py-1 rounded flex items-center justify-between" style={{ backgroundColor: 'transparent' }}>
                  <span style={{ color: Colors.textSecondary, fontSize: '13px' }}>
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
                {(lesson.videoUrl.includes('youtube.com') || lesson.videoUrl.includes('youtu.be')) && (
                  <p style={{ color: Colors.textMuted, fontSize: '12px', marginTop: '4px' }}>
                    YouTube video detected - duration will be auto-fetched
                  </p>
                )}
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
              {(selectedVideoFile || lesson?.videoUrl?.startsWith('[LOCAL_FILE:')) && (
                <div className="mt-2 px-2 py-1 rounded flex items-center justify-between" style={{ backgroundColor: 'transparent' }}>
                  <span style={{ color: Colors.textSecondary, fontSize: '13px' }}>
                    🎥 {selectedVideoFile?.name || lesson?.videoUrl?.split('[LOCAL_FILE: ')[1]?.replace(']', '')}
                    {selectedVideoFile && <span style={{ color: Colors.textMuted, marginLeft: '8px' }}>({(selectedVideoFile.size / (1024 * 1024)).toFixed(2)} MB)</span>}
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
            </div>
          </div>
        )}
      </div>
      
      {/* Video Preview */}
      {lesson?.videoUrl && !lesson.videoUrl.startsWith('[LOCAL_FILE:') && extractYouTubeId(lesson.videoUrl) && (
        <div>
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
              aspectRatio: '16/9',
              position: 'relative'
            }}
          >
            <iframe
              key={lesson.videoUrl}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                border: 'none'
              }}
              src={`https://www.youtube.com/embed/${extractYouTubeId(lesson.videoUrl)}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="Video preview"
            />
          </div>
        </div>
      )}
      {selectedVideoFile && (
        <div>
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
              aspectRatio: '16/9',
              position: 'relative'
            }}
          >
            <video
              controls
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'contain'
              }}
              src={URL.createObjectURL(selectedVideoFile)}
            />
          </div>
        </div>
      )}
      
     
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            style={{ color: Colors.textSecondary }}
            className="block text-sm font-medium mb-2"
          >
            Duration (seconds)
            {isFetchingDuration && (
              <span className="ml-2 text-xs" style={{ color: Colors.textMuted }}>
                Fetching...
              </span>
            )}
          </label>
          <input
            type="number"
            value={lesson?.durationSeconds || 0}
            onChange={(e) =>
              updateLesson(module.id, lesson.id, {
                durationSeconds: parseInt(e.target.value) || 0,
              })
            }
            style={{
              backgroundColor: Colors.textInputBg,
              borderColor: Colors.gray600,
              color: Colors.textPrimary,
            }}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:border-opacity-80"
            placeholder="Auto-fetched from YouTube"
            min="0"
            disabled={isFetchingDuration}
          />
        </div>
        <div>
          <label
            style={{ color: Colors.textSecondary }}
            className="block text-sm font-medium mb-2"
          >
            Preview Lesson
          </label>
          <label className="flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              checked={lesson?.isPreview || false}
              onChange={(e) =>
                updateLesson(module.id, lesson.id, {
                  isPreview: e.target.checked,
                })
              }
              style={{
                accentColor: Colors.secondary,
              }}
              className="w-5 h-5 rounded"
            />
            <span style={{ color: Colors.textSecondary }} className="text-sm">
              Allow preview without enrollment
            </span>
          </label>
        </div>
      </div>
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
}: any) => {
  const { deleteQuiz } = useContentManagement();
  const module = modules.find((m: any) =>
    m.quizzes.some((q: any) => q.id === selectedItem.id)
  );
  const quiz = module?.quizzes.find((q: any) => q.id === selectedItem.id);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const questions = quiz?.questions || [];
  const currentQuestion = questions[currentIndex];

  // Debug logging
  console.log("QuizEditor - Quiz:", quiz?.title);
  console.log("QuizEditor - Questions:", questions);
  console.log("QuizEditor - Current Question:", currentQuestion);
  console.log("QuizEditor - Current Question Text:", currentQuestion?.text);

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

  return (
    <div className="space-y-6">
      {/* Quiz Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-slate-300">
            Quiz Title
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
      </div>

      {/* Quiz Settings */}
      <div className="space-y-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="mr-4">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Passing Score (%)
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

        {/* <button
          onClick={() => addQuestion(module.id, quiz.id)}
          className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Question
        </button> */}

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
          No questions yet. Click “Add Question” to begin.
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
              className="text-red-400 hover:text-red-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Question text */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Question Text
            </label>
            <textarea
              value={currentQuestion.text}
              onChange={(e) =>
                updateQuestion(
                  module.id,
                  quiz.id,
                  currentQuestion.id,
                  "text",
                  e.target.value
                )
              }
              placeholder="Enter question text"
              rows={2}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          {/* Question Type Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Question Type
            </label>
            <select
              value={currentQuestion.type}
              onChange={(e) =>
                updateQuestion(
                  module.id,
                  quiz.id,
                  currentQuestion.id,
                  "type",
                  e.target.value
                )
              }
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

          {/* Image Upload/URL */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Question Image (optional)
            </label>
            <input
              type="url"
              value={currentQuestion.imageUrl || ""}
              onChange={(e) =>
                updateQuestion(
                  module.id,
                  quiz.id,
                  currentQuestion.id,
                  "imageUrl",
                  e.target.value
                )
              }
              placeholder="Enter image URL"
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500"
            />
            {currentQuestion.imageUrl && (
              <div className="mt-2">
                <img
                  src={currentQuestion.imageUrl}
                  alt="Question"
                  className="max-w-full h-32 object-cover rounded border border-slate-600"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
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
              </label>

              {currentQuestion.type === "true-false" ? (
                // True/False specific UI
                <div className="space-y-2">
                  <div className="flex items-center gap-2 bg-slate-700/40 rounded p-2">
                    <input
                      type="radio"
                      name={`question-${currentQuestion.id}`}
                      checked={currentQuestion.correctAnswer === 0}
                      onChange={() => {
                        updateQuestion(
                          module.id,
                          quiz.id,
                          currentQuestion.id,
                          "correctAnswer",
                          0
                        );
                        updateQuestion(
                          module.id,
                          quiz.id,
                          currentQuestion.id,
                          "options",
                          ["True", "False"]
                        );
                      }}
                    />
                    <span className="text-white">True</span>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-700/40 rounded p-2">
                    <input
                      type="radio"
                      name={`question-${currentQuestion.id}`}
                      checked={currentQuestion.correctAnswer === 1}
                      onChange={() => {
                        updateQuestion(
                          module.id,
                          quiz.id,
                          currentQuestion.id,
                          "correctAnswer",
                          1
                        );
                        updateQuestion(
                          module.id,
                          quiz.id,
                          currentQuestion.id,
                          "options",
                          ["True", "False"]
                        );
                      }}
                    />
                    <span className="text-white">False</span>
                  </div>
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
                              currentQuestion.correctAnswer
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
                              newAnswers
                            );
                          } else {
                            updateQuestion(
                              module.id,
                              quiz.id,
                              currentQuestion.id,
                              "correctAnswer",
                              idx
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
                            newOptions
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
                              idx
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
                            newPairs
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
                            newPairs
                          );
                        }}
                        placeholder="Right item"
                        className="flex-1 px-3 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                      />
                      <button
                        onClick={() => {
                          const newPairs =
                            currentQuestion.matchingPairs?.filter(
                              (_: any, i: number) => i !== idx
                            ) || [];
                          updateQuestion(
                            module.id,
                            quiz.id,
                            currentQuestion.id,
                            "matchingPairs",
                            newPairs
                          );
                        }}
                        className="text-red-400 hover:text-red-300"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )
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
                      newPairs
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
                  e.target.value
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
            <label className="block text-sm text-slate-300 mb-1">Points</label>
            <input
              type="number"
              value={currentQuestion.points}
              onChange={(e) =>
                updateQuestion(
                  module.id,
                  quiz.id,
                  currentQuestion.id,
                  "points",
                  parseInt(e.target.value) || 0
                )
              }
              className="w-24 px-3 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
              min="0"
            />
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
  const { selectedItem, setSelectedItem, modules } = useCourseBuilder();
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
          />
        )}
        {selectedItem.type === "lesson" && (
          <LessonEditor
            selectedItem={selectedItem}
            modules={modules}
            updateLesson={updateLesson}
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
          />
        )}
      </div>
    </div>
  );
};
