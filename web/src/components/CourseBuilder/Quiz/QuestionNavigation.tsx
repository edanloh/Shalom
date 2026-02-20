import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "../../ui/button";

interface QuestionNavigationProps {
  currentIndex: number;
  questionsLength: number;
  handlePrev: () => void;
  handleNext: () => void;
  onAddQuestion: () => void;
}

export const QuestionNavigation = ({
  currentIndex,
  questionsLength,
  handlePrev,
  handleNext,
  onAddQuestion,
}: QuestionNavigationProps) => {
  return (
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
          Question {currentIndex + 1} of {questionsLength || 0}
        </span>
        <button
          onClick={handleNext}
          disabled={currentIndex >= questionsLength - 1}
          className="p-2 bg-slate-700 rounded disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4 text-white" />
        </button>
      </div>

      <Button onClick={onAddQuestion} className="w-auto gap-2 mt-2 mb-2">
        <Plus className="h-4 w-4" />
        Add Question
      </Button>
    </div>
  );
};
