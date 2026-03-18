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
import {
  MatchingEditor,
  OptionsEditor,
  QuizHeader,
  QuestionNavigation,
  ErrorBanner,
  QuestionImageUpload,
  QuestionCardHeader,
} from "./Quiz";
import { LessonBasicInfo, DocumentUpload, VideoUpload } from "./Lesson/index";
import { ModuleEditor } from "./Module/index";

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

  // State for video preview
  const [localVideoPreviewUrl, setLocalVideoPreviewUrl] = useState("");

  // Validation states
  const MAX_FILE_SIZE_MB = 50;
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationMessage, setValidationMessage] = useState({
    title: "",
    description: "",
  });
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
      <LessonBasicInfo
        lesson={lesson}
        moduleId={module.id}
        updateLesson={updateLesson}
        showValidationErrors={showValidationErrors}
        lessonTitleEmpty={lessonTitleEmpty}
      />

      {/* Conditional rendering based on lesson type */}
      {isDocumentLesson ? (
        <DocumentUpload
          module={module}
          lesson={lesson}
          updateLesson={updateLesson}
          showValidationErrors={showValidationErrors}
          hasPdf={hasPdf}
          setValidationMessage={setValidationMessage}
          setShowValidationModal={setShowValidationModal}
          currentCourseId={currentCourseId}
        />
      ) : (
        <VideoUpload
          module={module}
          lesson={lesson}
          updateLesson={updateLesson}
          showValidationErrors={showValidationErrors}
          hasVideo={hasVideo}
          videoInputType={videoInputType}
          setVideoInputType={setVideoInputType}
          handleVideoUrlChange={handleVideoUrlChange}
          handleVideoFileChange={handleVideoFileChange}
          clearVideo={clearVideo}
          selectedVideoFile={selectedVideoFile}
          localVideoPreviewUrl={localVideoPreviewUrl}
          setLocalVideoPreviewUrl={setLocalVideoPreviewUrl}
          isUploading={isUploading}
          extractYouTubeId={extractYouTubeId}
          setValidationMessage={setValidationMessage}
          setShowValidationModal={setShowValidationModal}
        />
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
                const seconds = hasVideo ? (lesson?.durationSeconds || 0) : 0;
                const hours = Math.floor(seconds / 3600);
                const minutes = Math.floor((seconds % 3600) / 60);
                const secs = seconds % 60;
                return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
              })()}
              style={{
                backgroundColor: Colors.textInputBg,
                borderColor: Colors.gray600,
                color: Colors.textPrimary,
              }}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:border-opacity-80"
              placeholder="00:00:00"
              readOnly
              disabled={isFetchingDuration}
              title="Duration is auto-populated from the uploaded video"
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

// Helper: Get errors for a single question
const getQuestionErrors = (question: any): string[] => {
  const errors: string[] = [];
  const options = Array.isArray(question.options) ? question.options : [];

  const resolveAnswerIndex = (answer: any): number => {
    if (Number.isInteger(answer)) return answer;
    if (typeof answer === "string") {
      return options.findIndex(
        (opt: any) => String(opt).trim() === answer.trim(),
      );
    }
    return -1;
  };

  const resolveAnswerIndices = (answer: any): number[] => {
    const raw = Array.isArray(answer) ? answer : [answer];
    const mapped = raw
      .map((item: any) => resolveAnswerIndex(item))
      .filter((idx: number) => Number.isInteger(idx) && idx >= 0);
    return Array.from(new Set(mapped));
  };

  if (!question.text?.trim()) {
    errors.push("Question text is required");
  }

  // Points validation - catch NaN properly
  const points = Number(question.points);
  if (isNaN(points) || points < 1) {
    errors.push("Points must be at least 1");
  }

  // Type-specific validation
  if (question.type === "multiple-choice") {
    const answerIndex = resolveAnswerIndex(question.correctAnswer);

    // Must have a correct answer selected and resolvable to an option index
    if (answerIndex < 0) {
      errors.push("Select a correct answer");
    }

    // The selected answer must point to a non-empty option
    const selectedOption = options[answerIndex];
    if (answerIndex >= 0 && (!selectedOption || !String(selectedOption).trim())) {
      errors.push("Correct answer points to an empty option");
    }

    // At least two non-empty options
    const nonEmptyOptionCount = options.filter((opt: any) => String(opt).trim()).length;
    if (nonEmptyOptionCount < 2) {
      errors.push("At least two options required");
    }
  }

  if (question.type === "multiple-correct") {
    // Must have at least one answer checked
    const checkedAnswers = resolveAnswerIndices(question.correctAnswer);
    if (checkedAnswers.length === 0) {
      errors.push("Select at least one correct answer");
    }
    // None of the checked answers should point to empty options
    for (const idx of checkedAnswers) {
      const option = options[idx];
      if (!option || !String(option).trim()) {
        errors.push("A correct answer points to an empty option");
        break;
      }
    }
    // At least two non-empty options
    const nonEmptyOptionCount = options.filter((opt: any) => String(opt).trim()).length;
    if (nonEmptyOptionCount < 2) {
      errors.push("At least two options required");
    }
  }

  if (question.type === "true-false") {
    // correctAnswer must be explicitly 0 or 1
    if (question.correctAnswer !== 0 && question.correctAnswer !== 1) {
      errors.push("Select either True or False");
    }
  }

  if (question.type === "short-answer") {
    // sampleAnswer (Explanation) is required as grading guideline
    if (!question.sampleAnswer?.trim()) {
      errors.push(
        "Explanation/Sample Answer is required for short-answer questions",
      );
    }
  }

  if (question.type === "matching") {
    // Must have at least 1 pair
    if (!question.matchingPairs || question.matchingPairs.length === 0) {
      errors.push("At least one matching pair is required");
    }
    // Every pair must have both left and right filled
    const hasMissingFields = question.matchingPairs?.some(
      (pair: any) => !pair.left?.trim() || !pair.right?.trim(),
    );
    if (hasMissingFields) {
      errors.push(
        "All matching pairs must have both left and right items filled",
      );
    }
  }

  return errors;
};

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

  // Enhanced passing score validation
  const passingScoreValue = Number(quiz?.passingScore);
  const passingScoreInvalid =
    quiz?.passingScore === undefined ||
    quiz?.passingScore === null ||
    Number.isNaN(passingScoreValue) ||
    passingScoreValue < 0 ||
    passingScoreValue > 100;

  const maxAttemptsInvalid =
    quiz?.maxAttempts !== null &&
    quiz?.maxAttempts !== undefined &&
    Number(quiz?.maxAttempts) < 1;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  // FIX 1: Declare questionImagePreviewUrl state here in QuizEditor (not LessonEditor)
  const [questionImagePreviewUrl, setQuestionImagePreviewUrl] =
    useState<string>("");

  // Calculate errors for all questions
  const questions = quiz?.questions || [];
  const questionErrorsMap = new Map<string, string[]>();
  questions.forEach((q: any) => {
    const errors = getQuestionErrors(q);
    if (errors.length > 0) {
      questionErrorsMap.set(q.id, errors);
    }
  });
  const totalErrorCount = Array.from(questionErrorsMap.values()).reduce(
    (sum, errors) => sum + errors.length,
    0,
  );

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

  const currentQuestion = questions[currentIndex];

  // Effect to sync options/correctAnswer when question type changes.
  // This runs AFTER the render where type was updated, so it always sees the new type
  // and can reliably reset dependent fields without racing the type update.
  const prevQuestionTypeRef = React.useRef<string | undefined>(undefined);
  const prevQuestionIdRef = React.useRef<string | undefined>(undefined);
  useEffect(() => {
    // eslint-disable-line react-hooks/rules-of-hooks
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
          updateQuestion(module.id, quiz.id, currentQuestion.id, "options", [
            "True",
            "False",
          ]);
        }
        if (
          currentQuestion.correctAnswer !== 0 &&
          currentQuestion.correctAnswer !== 1
        ) {
          updateQuestion(
            module.id,
            quiz.id,
            currentQuestion.id,
            "correctAnswer",
            0,
          );
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
      updateQuestion(module.id, quiz.id, currentQuestion.id, "options", [
        "True",
        "False",
      ]);
      if (
        currentQuestion.correctAnswer !== 0 &&
        currentQuestion.correctAnswer !== 1
      ) {
        updateQuestion(
          module.id,
          quiz.id,
          currentQuestion.id,
          "correctAnswer",
          0,
        );
      }
    } else if (prevType === "true-false") {
      // Leaving true-false: clear the True/False options so the new type starts blank
      updateQuestion(module.id, quiz.id, currentQuestion.id, "options", [
        "",
        "",
      ]);
      updateQuestion(
        module.id,
        quiz.id,
        currentQuestion.id,
        "correctAnswer",
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
      return () => {
        URL.revokeObjectURL(url);
      };
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

  return (
    <div className="space-y-6">
      {/* Quiz Header */}
      <QuizHeader
        quiz={quiz}
        questions={questions}
        showValidationErrors={showValidationErrors}
        quizTitleEmpty={quizTitleEmpty}
        passingScoreInvalid={passingScoreInvalid}
        maxAttemptsInvalid={maxAttemptsInvalid}
        updateQuiz={updateQuiz}
        moduleId={module.id}
      />

      {/* Cross-Question Error Banner */}
      <ErrorBanner
        showValidationErrors={showValidationErrors}
        totalErrorCount={totalErrorCount}
        questionErrorsMap={questionErrorsMap}
        questions={questions}
        onNavigateToQuestion={setCurrentIndex}
      />

      {/* Question Navigation */}
      <QuestionNavigation
        currentIndex={currentIndex}
        questionsLength={questions.length}
        handlePrev={handlePrev}
        handleNext={handleNext}
        onAddQuestion={() => {
          addQuestion(module.id, quiz.id);
          setCurrentIndex(questions.length);
        }}
      />

      {/* Empty State */}
      {!currentQuestion && (
        <div className="text-slate-400 text-center py-8">
          No questions yet. Click "Add Question" to begin.
        </div>
      )}

      {/* Question Page */}
      {currentQuestion && (
        <div
          className={`relative bg-slate-800 rounded-xl p-6 shadow-md space-y-6 ${
            showValidationErrors && questionErrorsMap.has(currentQuestion.id)
              ? "border-2 border-red-500"
              : "border border-slate-700"
          }`}
        >
          <QuestionCardHeader
            currentIndex={currentIndex}
            currentQuestion={currentQuestion}
            showValidationErrors={showValidationErrors}
            questionErrorsMap={questionErrorsMap}
            onDeleteQuestion={handleDeleteQuestion}
          />

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
                updateQuestion(
                  module.id,
                  quiz.id,
                  currentQuestion.id,
                  "type",
                  e.target.value,
                );
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
          <QuestionImageUpload
            currentQuestion={currentQuestion}
            updateQuestion={updateQuestion}
            moduleId={module.id}
            quizId={quiz.id}
            questionImagePreviewUrl={questionImagePreviewUrl}
          />

          {/* Options - Only show for certain question types */}
          <OptionsEditor
            currentQuestion={currentQuestion}
            showValidationErrors={showValidationErrors}
            updateQuestion={updateQuestion}
            addOption={addOption}
            removeOption={removeOption}
            moduleId={module.id}
            quizId={quiz.id}
          />

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
            <MatchingEditor
              currentQuestion={currentQuestion}
              showValidationErrors={showValidationErrors}
              updateQuestion={updateQuestion}
              moduleId={module.id}
              quizId={quiz.id}
            />
          )}

          {/* Explanation/Feedback Section - For all question types */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Explanation / Feedback
              {currentQuestion.type === "short-answer" && (
                <span className="text-red-500 ml-1">*</span>
              )}
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
              className={`w-full px-3 py-2 bg-slate-700 border rounded text-white focus:outline-none resize-none ${
                showValidationErrors &&
                currentQuestion.type === "short-answer" &&
                !currentQuestion.sampleAnswer?.trim()
                  ? "border-red-500 focus:border-red-500"
                  : "border-slate-600 focus:border-blue-500"
              }`}
            />
            <p className="text-xs text-slate-400 mt-1">
              This explanation helps students understand why the answer is
              correct
              {currentQuestion.type === "short-answer" && (
                <span className="text-yellow-400 font-medium">
                  {" "}
                  (Required for grading guidelines)
                </span>
              )}
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
              className={`w-24 px-3 py-1 bg-slate-700 border rounded text-white text-sm focus:outline-none ${
                showValidationErrors &&
                (isNaN(Number(currentQuestion.points)) ||
                  Number(currentQuestion.points) < 1)
                  ? "border-red-500 focus:border-red-500"
                  : "border-slate-600 focus:border-blue-500"
              }`}
              min="1"
            />
            {showValidationErrors &&
              (isNaN(Number(currentQuestion.points)) ||
                Number(currentQuestion.points) < 1) && (
                <p className="text-xs text-red-400 mt-1">
                  Points must be at least 1.
                </p>
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
