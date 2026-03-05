/*
- Displays cross-question validation errors with total count
- Shows clickable links to navigate to questions with errors
- Conditionally renders based on validation state
*/

interface ErrorBannerProps {
  showValidationErrors: boolean;
  totalErrorCount: number;
  questionErrorsMap: Map<string, string[]>;
  questions: any[];
  onNavigateToQuestion: (index: number) => void;
}

export const ErrorBanner = ({
  showValidationErrors,
  totalErrorCount,
  questionErrorsMap,
  questions,
  onNavigateToQuestion,
}: ErrorBannerProps) => {
  if (!showValidationErrors || totalErrorCount === 0) {
    return null;
  }

  return (
    <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <svg
            className="w-5 h-5 text-red-400"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-red-300 mb-1">
            {totalErrorCount} {totalErrorCount === 1 ? "error" : "errors"} found
            in questions
          </h4>
          <div className="text-xs text-red-200 space-y-1">
            {Array.from(questionErrorsMap.entries()).map(
              ([questionId, errors]) => {
                const qIndex = questions.findIndex(
                  (q: any) => q.id === questionId,
                );
                return (
                  <div key={questionId}>
                    <button
                      onClick={() => onNavigateToQuestion(qIndex)}
                      className="text-red-300 hover:text-red-100 underline font-medium"
                    >
                      Question {qIndex + 1}
                    </button>
                    : {errors.join(", ")}
                  </div>
                );
              },
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
