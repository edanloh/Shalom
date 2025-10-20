import React, { useState } from "react";
import { X, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { useCourseBuilder } from "./CourseBuilderContext";
import { useContentManagement } from "./useContentManagement";
import { Button } from "../ui/button";

/* ------------------------- MODULE EDITOR ------------------------- */
const ModuleEditor = ({ selectedItem, modules, updateModule }: any) => {
  const module = modules.find((m: any) => m.id === selectedItem.id);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Module Title
        </label>
        <input
          type="text"
          value={module?.title || ""}
          onChange={(e) =>
            updateModule(selectedItem.id, { title: e.target.value })
          }
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
          <option value="draft">Draft</option>
          <option value="published">Published</option>
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

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Lesson Title
        </label>
        <input
          type="text"
          value={lesson?.title || ""}
          onChange={(e) =>
            updateLesson(module.id, lesson.id, { title: e.target.value })
          }
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Content
        </label>
        <textarea
          value={lesson?.content || ""}
          onChange={(e) =>
            updateLesson(module.id, lesson.id, { content: e.target.value })
          }
          rows={8}
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500 resize-none"
          placeholder="Enter lesson content..."
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Video URL (optional)
        </label>
        <input
          type="url"
          value={lesson?.videoUrl || ""}
          onChange={(e) =>
            updateLesson(module.id, lesson.id, { videoUrl: e.target.value })
          }
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500"
          placeholder="https://..."
        />
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
  const module = modules.find((m: any) =>
    m.quizzes.some((q: any) => q.id === selectedItem.id)
  );
  const quiz = module?.quizzes.find((q: any) => q.id === selectedItem.id);

  const [currentIndex, setCurrentIndex] = useState(0);

  const questions = quiz?.questions || [];
  const currentQuestion = questions[currentIndex];

  const handleNext = () => {
    if (currentIndex < questions.length - 1) setCurrentIndex(currentIndex + 1);
  };

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  return (
    <div className="space-y-6">
      {/* Quiz Header */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Quiz Title
        </label>
        <input
          type="text"
          value={quiz?.title || ""}
          onChange={(e) =>
            updateQuiz(module.id, quiz.id, { title: e.target.value })
          }
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Quiz Settings */}
      <div className="space-y-4 mb-6">
        <div>
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
          onClick={() => addQuestion(module.id, quiz.id)}
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
              onClick={() =>
                deleteQuestion(module.id, quiz.id, currentQuestion.id)
              }
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

          {/* Short Answer UI */}
          {currentQuestion.type === "short-answer" && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Sample Answer (for grading reference)
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
                placeholder="Enter a sample correct answer for reference"
                rows={3}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500 resize-none"
              />
              <p className="text-xs text-slate-400">
                Short answer questions will require manual grading
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
