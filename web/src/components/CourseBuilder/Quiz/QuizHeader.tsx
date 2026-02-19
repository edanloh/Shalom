interface QuizHeaderProps {
  quiz: any;
  questions: any[];
  showValidationErrors: boolean;
  quizTitleEmpty: boolean;
  passingScoreInvalid: boolean;
  maxAttemptsInvalid: boolean;
  updateQuiz: (moduleId: string, quizId: string, updates: any) => void;
  moduleId: string;
}

export const QuizHeader = ({
  quiz,
  questions,
  showValidationErrors,
  quizTitleEmpty,
  passingScoreInvalid,
  maxAttemptsInvalid,
  updateQuiz,
  moduleId,
}: QuizHeaderProps) => {
  return (
    <>
      {/* Quiz Title */}
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
            updateQuiz(moduleId, quiz.id, { baseTitle: e.target.value })
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
                updateQuiz(moduleId, quiz.id, {
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
                updateQuiz(moduleId, quiz.id, {
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
                  updateQuiz(moduleId, quiz.id, {
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
    </>
  );
};
