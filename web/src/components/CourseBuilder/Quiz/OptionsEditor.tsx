import { X } from "lucide-react";

interface OptionsEditorProps {
  currentQuestion: any;
  showValidationErrors: boolean;
  updateQuestion: (
    moduleId: string,
    quizId: string,
    questionId: string,
    field: string,
    value: any,
  ) => void;
  addOption: (moduleId: string, quizId: string, questionId: string) => void;
  removeOption: (
    moduleId: string,
    quizId: string,
    questionId: string,
    index: number,
  ) => void;
  moduleId: string;
  quizId: string;
}

export const OptionsEditor = ({
  currentQuestion,
  showValidationErrors,
  updateQuestion,
  addOption,
  removeOption,
  moduleId,
  quizId,
}: OptionsEditorProps) => {
  if (
    currentQuestion.type !== "multiple-choice" &&
    currentQuestion.type !== "multiple-correct" &&
    currentQuestion.type !== "true-false"
  ) {
    return null;
  }

  const getMultipleCorrectIndices = () => {
    const rawAnswers = Array.isArray(currentQuestion.correctAnswer)
      ? currentQuestion.correctAnswer
      : [currentQuestion.correctAnswer];

    const mapped = rawAnswers
      .map((answer: any) => {
        if (Number.isInteger(answer) && answer >= 0) return answer as number;
        if (typeof answer === "string") {
          return currentQuestion.options?.findIndex(
            (opt: any) => String(opt).trim() === answer.trim(),
          );
        }
        return -1;
      })
      .filter((idx: number) => Number.isInteger(idx) && idx >= 0);

    return Array.from(new Set(mapped));
  };

  return (
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
          currentQuestion.options.filter((opt: any) => String(opt).trim())
            .length === 0) && (
          <p className="text-xs text-red-400">
            At least two options required.
          </p>
        )}

      {currentQuestion.type === "true-false" ? (
        // True/False specific UI
        <div className="space-y-2">
          <label className="flex items-center gap-2 bg-slate-700/40 rounded p-2 cursor-pointer hover:bg-slate-700/60 transition-colors">
            <input
              type="radio"
              name={`question-${currentQuestion.id}`}
              checked={currentQuestion.correctAnswer === 0}
              onChange={() => {
                updateQuestion(
                  moduleId,
                  quizId,
                  currentQuestion.id,
                  "correctAnswer",
                  0,
                );
              }}
              className="w-4 h-4 accent-primary"
            />
            <span className="text-white flex-1">True</span>
          </label>
          <label className="flex items-center gap-2 bg-slate-700/40 rounded p-2 cursor-pointer hover:bg-slate-700/60 transition-colors">
            <input
              type="radio"
              name={`question-${currentQuestion.id}`}
              checked={currentQuestion.correctAnswer === 1}
              onChange={() => {
                updateQuestion(
                  moduleId,
                  quizId,
                  currentQuestion.id,
                  "correctAnswer",
                  1,
                );
              }}
              className="w-4 h-4 accent-primary"
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
                    ? getMultipleCorrectIndices().includes(idx)
                    : currentQuestion.correctAnswer === idx
                }
                onChange={() => {
                  if (currentQuestion.type === "multiple-correct") {
                    const currentAnswers = getMultipleCorrectIndices();
                    const newAnswers = currentAnswers.includes(idx)
                      ? currentAnswers.filter((i) => i !== idx)
                      : [...currentAnswers, idx];
                    updateQuestion(
                      moduleId,
                      quizId,
                      currentQuestion.id,
                      "correctAnswer",
                      newAnswers,
                    );
                  } else {
                    updateQuestion(
                      moduleId,
                      quizId,
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
                    moduleId,
                    quizId,
                    currentQuestion.id,
                    "options",
                    newOptions,
                  );
                }}
                className={`flex-1 px-3 py-1 bg-slate-700 border rounded text-white text-sm focus:outline-none ${
                  showValidationErrors && !String(option).trim()
                    ? "border-red-500 focus:border-red-500"
                    : "border-slate-600 focus:border-blue-500"
                }`}
                placeholder={`Option ${idx + 1}`}
              />
              {currentQuestion.options.length > 2 && (
                <button
                  onClick={() =>
                    removeOption(moduleId, quizId, currentQuestion.id, idx)
                  }
                  className="text-red-400 hover:text-red-300"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={() => addOption(moduleId, quizId, currentQuestion.id)}
            className="text-blue-400 hover:text-blue-300 text-sm"
          >
            + Add Option
          </button>
        </div>
      )}
    </div>
  );
};
