import { X } from "lucide-react";

interface MatchingEditorProps {
  currentQuestion: any;
  showValidationErrors: boolean;
  updateQuestion: (
    moduleId: string,
    quizId: string,
    questionId: string,
    field: string,
    value: any,
  ) => void;
  moduleId: string;
  quizId: string;
}

export const MatchingEditor = ({
  currentQuestion,
  showValidationErrors,
  updateQuestion,
  moduleId,
  quizId,
}: MatchingEditorProps) => {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-300 mb-2">
        Matching Pairs
      </label>
      <div className="space-y-2">
        {currentQuestion.matchingPairs?.map((pair: any, idx: number) => (
          <div
            key={idx}
            className="flex items-center gap-2 bg-slate-700/40 rounded p-2"
          >
            <input
              type="text"
              value={pair.left || ""}
              onChange={(e) => {
                const newPairs = [...(currentQuestion.matchingPairs || [])];
                newPairs[idx] = {
                  ...newPairs[idx],
                  left: e.target.value,
                };
                updateQuestion(
                  moduleId,
                  quizId,
                  currentQuestion.id,
                  "matchingPairs",
                  newPairs,
                );
              }}
              placeholder="Left item"
              className={`flex-1 px-3 py-1 bg-slate-700 border rounded text-white text-sm focus:outline-none ${
                showValidationErrors && !pair.left?.trim()
                  ? "border-red-500 focus:border-red-500"
                  : "border-slate-600 focus:border-blue-500"
              }`}
            />
            <span className="text-slate-400">↔</span>
            <input
              type="text"
              value={pair.right || ""}
              onChange={(e) => {
                const newPairs = [...(currentQuestion.matchingPairs || [])];
                newPairs[idx] = {
                  ...newPairs[idx],
                  right: e.target.value,
                };
                updateQuestion(
                  moduleId,
                  quizId,
                  currentQuestion.id,
                  "matchingPairs",
                  newPairs,
                );
              }}
              placeholder="Right item"
              className={`flex-1 px-3 py-1 bg-slate-700 border rounded text-white text-sm focus:outline-none ${
                showValidationErrors && !pair.right?.trim()
                  ? "border-red-500 focus:border-red-500"
                  : "border-slate-600 focus:border-blue-500"
              }`}
            />
            <button
              onClick={() => {
                const newPairs =
                  currentQuestion.matchingPairs?.filter(
                    (_: any, i: number) => i !== idx,
                  ) || [];
                updateQuestion(
                  moduleId,
                  quizId,
                  currentQuestion.id,
                  "matchingPairs",
                  newPairs,
                );
              }}
              className="text-red-400 hover:text-red-300"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        <button
          onClick={() => {
            const newPairs = [
              ...(currentQuestion.matchingPairs || []),
              { left: "", right: "" },
            ];
            updateQuestion(
              moduleId,
              quizId,
              currentQuestion.id,
              "matchingPairs",
              newPairs,
            );
          }}
          className="text-blue-400 hover:text-blue-300 text-sm"
        >
          + Add Matching Pair
        </button>
      </div>
    </div>
  );
};
