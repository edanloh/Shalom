import { X } from "lucide-react";

interface QuestionCardHeaderProps {
  currentIndex: number;
  currentQuestion: any;
  showValidationErrors: boolean;
  questionErrorsMap: Map<string, string[]>;
  onDeleteQuestion: () => void;
}

export const QuestionCardHeader = ({
  currentIndex,
  currentQuestion,
  showValidationErrors,
  questionErrorsMap,
  onDeleteQuestion,
}: QuestionCardHeaderProps) => {
  return (
    <>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-white">
            Question {currentIndex + 1}
          </h3>
          {/* Error pill badge */}
          {showValidationErrors &&
            questionErrorsMap.has(currentQuestion.id) && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-900/40 text-red-300 border border-red-700/50">
                {questionErrorsMap.get(currentQuestion.id)!.length}{" "}
                {questionErrorsMap.get(currentQuestion.id)!.length === 1
                  ? "error"
                  : "errors"}
              </span>
            )}
        </div>
        <button
          onClick={onDeleteQuestion}
          className="text-black hover:text-black"
        >
          <X className="h-5 w-5" style={{ color: "white" }} />
        </button>
      </div>

      {/* Inline question errors */}
      {showValidationErrors && questionErrorsMap.has(currentQuestion.id) && (
        <div className="bg-red-900/20 border border-red-700/50 rounded p-3">
          <ul className="text-xs text-red-300 space-y-1">
            {questionErrorsMap
              .get(currentQuestion.id)!
              .map((error, idx) => (
                <li key={idx}>• {error}</li>
              ))}
          </ul>
        </div>
      )}
    </>
  );
};
