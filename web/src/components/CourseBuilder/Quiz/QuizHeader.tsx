import { useEffect } from "react";

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
  // Check if quiz has short-answer questions
  const hasShortAnswerQuestions = questions.some(
    (q) => q.type === 'short-answer'
  );

  // Enforce single-attempt policy for manually graded quizzes.
  useEffect(() => {
    if (!quiz?.id) return;
    if (hasShortAnswerQuestions && quiz?.maxAttempts !== 1) {
      updateQuiz(moduleId, quiz.id, { maxAttempts: 1 });
    }
  }, [hasShortAnswerQuestions, quiz?.id, quiz?.maxAttempts, moduleId, updateQuiz]);

  return (
    <>
      {/* Short Answer Quiz Notice */}
      {hasShortAnswerQuestions && (
        <div className="bg-amber-900/20 border border-amber-600/50 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-amber-200">Manual Grading Required</p>
              <p className="text-xs text-amber-300/80 mt-1">
                This quiz contains short-answer questions requiring instructor grading. 
                Students will only be allowed <strong>1 attempt</strong> but can review their answers after grading.
              </p>
            </div>
          </div>
        </div>
      )}

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
          placeholder="Enter quiz title (e.g., 'Module 1 Quiz')"
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
              type={hasShortAnswerQuestions ? "text" : "number"}
              value={hasShortAnswerQuestions ? "-" : (quiz?.passingScore || 0)}
              onChange={(e) =>
                !hasShortAnswerQuestions &&
                updateQuiz(moduleId, quiz.id, {
                  passingScore:
                    e.target.value === ""
                      ? 0
                      : Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)),
                })
              }
              min="0"
              max="100"
              readOnly={hasShortAnswerQuestions}
              disabled={hasShortAnswerQuestions}
              className={`w-24 px-3 py-2 border rounded text-white focus:outline-none ${
                hasShortAnswerQuestions
                  ? "bg-slate-800 border-slate-700 cursor-not-allowed opacity-80"
                  : "bg-slate-700 border-slate-600 focus:border-blue-500"
              }`}
            />
            {hasShortAnswerQuestions && (
              <p className="text-xs text-amber-300/90 mt-1">
                Locked for manual grading
              </p>
            )}
            {showValidationErrors && !hasShortAnswerQuestions && passingScoreInvalid && (
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
              type={quiz?.maxAttempts === null && !hasShortAnswerQuestions ? "text" : "number"}
              value={
                hasShortAnswerQuestions
                  ? 1
                  : quiz?.maxAttempts === null
                    ? "-"
                    : (quiz?.maxAttempts ?? 1)
              }
              onChange={(e) =>
                !hasShortAnswerQuestions &&
                updateQuiz(moduleId, quiz.id, {
                  maxAttempts: Math.max(1, parseInt(e.target.value) || 1),
                })
              }
              min="1"
              readOnly={quiz?.maxAttempts === null || hasShortAnswerQuestions}
              disabled={hasShortAnswerQuestions}
              className={`w-24 px-3 py-2 border rounded text-white focus:outline-none ${
                hasShortAnswerQuestions
                  ? "bg-slate-800 border-slate-700 cursor-not-allowed opacity-80"
                  : "bg-slate-700 border-slate-600 focus:border-blue-500"
              }`}
            />
            {hasShortAnswerQuestions && (
              <p className="text-xs text-amber-300/90 mt-1">
                Locked to 1 attempt
              </p>
            )}
            {showValidationErrors && maxAttemptsInvalid && (
              <p className="text-xs text-red-400 mt-1">
                Must be at least 1 or set to unlimited.
              </p>
            )}
            {!hasShortAnswerQuestions && (
            <label className="mt-2 flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={hasShortAnswerQuestions ? false : quiz?.maxAttempts === null}
                disabled={hasShortAnswerQuestions}
                onChange={(e) =>
                  !hasShortAnswerQuestions &&
                  updateQuiz(moduleId, quiz.id, {
                    maxAttempts: e.target.checked ? null : 1,
                  })
                }
              />
              Unlimited attempts
            </label>
            )}
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
