import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import courseService, {
  CourseSection,
  Quiz,
  CourseSectionItem,
} from "@/services/courseService";

const QuizTaking = () => {
  const { courseId, moduleId, quizId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeRemaining, setTimeRemaining] = useState(1800);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [courseSections, setCourseSections] = useState<CourseSection[]>([]);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Instructor view - show answers and explanations
  const isInstructorView = true;

  // Fetch quiz data and course sections on mount
  useEffect(() => {
    const fetchQuizData = async () => {
      if (!courseId || !moduleId || !quizId) {
        console.log("❌ Missing required params:", {
          courseId,
          moduleId,
          quizId,
        });
        toast({
          title: "Error",
          description: "Missing required parameters",
          variant: "destructive",
        });
        return;
      }

      const adminId =
        user?.id ||
        (user as any)?.sub ||
        (user as any)?.["cognito:username"] ||
        "550e8400-e29b-41d4-a716-446655440101";

      try {
        setIsLoading(true);
        console.log("🔄 Fetching quiz data...");

        const { quiz: quizData, sections } = await courseService.getQuizData(
          courseId,
          moduleId,
          quizId,
          adminId,
        );

        setQuiz(quizData);
        setCourseSections(sections);

        if (quizData.timeLimit) {
          setTimeRemaining(quizData.timeLimit * 60);
        }

        console.log("✅ Quiz data loaded:", quizData);
        console.log("✅ Course sections loaded:", sections.length);
      } catch (error) {
        console.error("❌ Error fetching quiz data:", error);
        toast({
          title: "Error",
          description:
            error instanceof Error ? error.message : "Failed to load quiz data",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuizData();
  }, [courseId, moduleId, quizId]);

  if (isLoading || !quiz) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading quiz...</p>
          </div>
        </div>
      </div>
    );
  }

  const currentQ = quiz.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / quiz.totalQuestions) * 100;

  // Debug current question
  console.log("Current Question:", {
    question: currentQ.question || currentQ.text,
    correctAnswer: currentQ.correctAnswer,
    correct_answer: currentQ.correct_answer,
    options: currentQ.options,
  });

  const findNextItemAcrossModules = (): {
    item: CourseSectionItem;
    sectionId: string;
  } | null => {
    if (!moduleId || courseSections.length === 0) return null;

    const currentSectionIndex = courseSections.findIndex(
      (section) => section.id === moduleId,
    );

    if (currentSectionIndex === -1) return null;

    const currentSection = courseSections[currentSectionIndex];

    if (currentSection.items && currentSection.items.length > 0) {
      const currentItemIndex = currentSection.items.findIndex(
        (item) => item.id === quizId && item.type === "quiz",
      );

      if (
        currentItemIndex !== -1 &&
        currentItemIndex < currentSection.items.length - 1
      ) {
        return {
          item: currentSection.items[currentItemIndex + 1],
          sectionId: currentSection.id,
        };
      }
    }

    for (let i = currentSectionIndex + 1; i < courseSections.length; i++) {
      const section = courseSections[i];
      if (section.items && section.items.length > 0) {
        return {
          item: section.items[0],
          sectionId: section.id,
        };
      }
    }

    return null;
  };

  const handleNext = () => {
    if (currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate(`/course/${courseId}`)}
            className="mb-4"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Exit Quiz
          </Button>

          {/* Quiz Header */}
          <div className="gradient-card border border-border rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold">{quiz.title}</h1>
                <p className="text-sm text-muted-foreground">
                  Question {currentQuestion + 1} of {quiz.totalQuestions} •
                  Instructor View
                </p>
              </div>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Question */}
          <div className="gradient-card border border-border rounded-xl p-8 mb-6">
            <div className="mb-6">
              <div className="flex items-start gap-2 mb-4">
                <span className="px-3 py-1 rounded-full bg-accent/20 text-accent text-sm font-semibold">
                  Q{currentQuestion + 1}
                </span>
                <h2 className="text-xl font-semibold flex-1">
                  {currentQ.question || currentQ.text}
                </h2>
              </div>
              {(currentQ.image || currentQ.image_url || currentQ.imageUrl) && (
                <img
                  src={currentQ.image || currentQ.image_url || currentQ.imageUrl}
                  alt="Question"
                  className="w-full max-w-2xl rounded-lg mb-4 border border-border"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              )}
            </div>

            {/* Multiple Choice (Single Answer) */}
            {(currentQ.type === "mcq" || currentQ.type === "multiple-choice") &&
              currentQ.options && (
                <div className="space-y-3">
                  {currentQ.options.map((option, index) => {
                    // Handle different correctAnswer formats
                    let isCorrect = false;
                    const correctAns =
                      currentQ.correctAnswer ?? currentQ.correct_answer;

                    if (typeof correctAns === "number") {
                      isCorrect = correctAns === index;
                    } else if (typeof correctAns === "string") {
                      isCorrect =
                        correctAns === option || parseInt(correctAns) === index;
                    } else if (Array.isArray(correctAns)) {
                      isCorrect =
                        correctAns.includes(index) ||
                        (correctAns as any[]).includes(option);
                    }

                    return (
                      <div
                        key={index}
                        className={`flex items-center space-x-3 p-4 rounded-lg border transition-all ${isCorrect ? "border-green-500 bg-green-500/10" : "border-border bg-background"}`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center border-2 text-xs font-bold ${isCorrect ? "border-green-500 bg-green-500 text-white" : "border-muted-foreground bg-transparent text-muted-foreground"}`}
                        >
                          {isCorrect ? "✓" : index + 1}
                        </div>
                        <Label
                          className={`flex-1 cursor-pointer font-medium ${
                            isCorrect
                              ? "text-green-600"
                              : ""
                          }`}
                        >
                          {option}
                          {isCorrect && (
                            <span className="ml-2 text-xs font-semibold text-green-600">
                              (Correct Answer)
                            </span>
                          )}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              )}

            {/* Multiple Correct Answers */}
            {currentQ.type === "multiple-correct" && currentQ.options && (
              <div className="space-y-3">
                {currentQ.options.map((option, index) => {
                  let isCorrect = false;
                  let correctIndices: number[] = [];
                  
                  const correctAns = currentQ.correctAnswer ?? currentQ.correct_answer;
                  
                  // Parse correct answers - these are option VALUES, map to indices
                  if (Array.isArray(correctAns)) {
                    // Map each correct answer value to its index in options array
                    correctIndices = correctAns
                      .map(ansValue => currentQ.options.findIndex((opt: any) => String(opt).trim() === String(ansValue).trim()))
                      .filter((idx: number) => idx !== -1);
                  } else if (typeof correctAns === "string") {
                    try {
                      const parsed = JSON.parse(correctAns);
                      if (Array.isArray(parsed)) {
                        // Map parsed values to indices
                        correctIndices = parsed
                          .map(ansValue => currentQ.options.findIndex((opt: any) => String(opt).trim() === String(ansValue).trim()))
                          .filter((idx: number) => idx !== -1);
                      } else {
                        // Single value - find its index
                        const idx = currentQ.options.findIndex((opt: any) => String(opt).trim() === String(correctAns).trim());
                        if (idx !== -1) correctIndices = [idx];
                      }
                    } catch {
                      // Single value - find its index
                      const idx = currentQ.options.findIndex((opt: any) => String(opt).trim() === String(correctAns).trim());
                      if (idx !== -1) correctIndices = [idx];
                    }
                  } else if (typeof correctAns === "number") {
                    // If it's a number, it's already an index
                    correctIndices = [correctAns];
                  }

                  isCorrect = correctIndices.includes(index);

                  return (
                    <div
                      key={index}
                      className={`flex items-center space-x-3 p-4 rounded-lg border transition-all ${isCorrect ? "border-green-500 bg-green-500/10" : "border-border bg-background"}`}
                    >
                      <div
                        className={`w-5 h-5 rounded flex items-center justify-center border-2 text-xs font-bold ${isCorrect ? "border-green-500 bg-green-500 text-white" : "border-muted-foreground bg-transparent text-muted-foreground"}`}
                      >
                        {isCorrect && "✓"}
                      </div>
                      <Label
                        className={`flex-1 cursor-pointer font-medium ${
                          isCorrect ? "text-green-600" : ""
                        }`}
                      >
                        {option}
                        {isCorrect && (
                          <span className="ml-2 text-xs font-semibold text-green-600">
                            (Correct)
                          </span>
                        )}
                      </Label>
                    </div>
                  );
                })}
                <p className="text-xs text-muted-foreground mt-2">
                  ℹ️ Multiple answers are correct for this question
                </p>
              </div>
            )}

            {/* True/False */}
            {currentQ.type === "true-false" && currentQ.options && (
              <div className="space-y-3">
                {currentQ.options.map((option, index) => {
                  let isCorrect = false;
                  const correctAns = currentQ.correctAnswer ?? currentQ.correct_answer;
                  
                  if (typeof correctAns === "number") {
                    isCorrect = correctAns === index;
                  } else if (typeof correctAns === "string") {
                    // For true-false, correct_answer might be "True" or "False" (the actual text)
                    // or "0"/"1" (index as string)
                    const parsedIndex = parseInt(correctAns);
                    if (!isNaN(parsedIndex)) {
                      isCorrect = parsedIndex === index;
                    } else {
                      // Match the actual option text ("True" or "False")
                      isCorrect = correctAns === option;
                    }
                  }

                  return (
                    <div
                      key={index}
                      className={`flex items-center space-x-3 p-4 rounded-lg border transition-all ${isCorrect ? "border-green-500 bg-green-500/10" : "border-border bg-background"}`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center border-2 text-xs font-bold ${isCorrect ? "border-green-500 bg-green-500 text-white" : "border-muted-foreground bg-transparent text-muted-foreground"}`}
                      >
                        {isCorrect && "✓"}
                      </div>
                      <Label
                        className={`flex-1 cursor-pointer font-medium ${
                          isCorrect ? "text-green-600" : ""
                        }`}
                      >
                        {option}
                        {isCorrect && (
                          <span className="ml-2 text-xs font-semibold text-green-600">
                            (Correct Answer)
                          </span>
                        )}
                      </Label>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Short Answer */}
            {(currentQ.type === "short-answer" || currentQ.type === "short_answer") && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg border border-border bg-muted/5">
                  <p className="text-sm font-semibold text-muted-foreground mb-2">
                    Sample Answer:
                  </p>
                  <p className="text-foreground">
                    {currentQ.explanation || currentQ.sampleAnswer || "No sample answer provided."}
                  </p>
                </div>
              </div>
            )}

            {/* Matching */}
            {currentQ.type === "matching" && (
              <div className="space-y-4">
                <div className="p-6 rounded-lg border border-border bg-muted/5">
                  <p className="text-sm font-semibold text-muted-foreground mb-4">
                    Correct Matches:
                  </p>
                  {(() => {
                    let matchingPairs: any[] = [];
                    const correctAns = currentQ.correctAnswer ?? currentQ.correct_answer;
                    
                    if (Array.isArray(correctAns)) {
                      matchingPairs = correctAns;
                    } else if (typeof correctAns === "string") {
                      try {
                        matchingPairs = JSON.parse(correctAns);
                      } catch {
                        matchingPairs = [];
                      }
                    }

                    return (
                      <div className="space-y-3">
                        {matchingPairs.map((pair, index) => (
                          <div key={index} className="relative">
                            <div className="flex items-center gap-4">
                              {/* Left side */}
                              <div className="flex-1 bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                                <span className="text-foreground font-medium">{pair.left}</span>
                              </div>
                              
                              {/* Connection line */}
                              <div className="flex items-center gap-1">
                                <div className="h-0.5 w-8 bg-gradient-to-r from-blue-500 to-green-500"></div>
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                              </div>
                              
                              {/* Right side */}
                              <div className="flex-1 bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                                <span className="text-foreground font-medium">{pair.right}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Explanation Section */}
            {currentQ.explanation &&
              (currentQ.type === "mcq" ||
                currentQ.type === "multiple-choice" ||
                currentQ.type === "multiple-correct" ||
                currentQ.type === "true-false") && (
                <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-sm font-semibold text-primary mb-2">
                    Explanation:
                  </p>
                  <p className="text-foreground">{currentQ.explanation}</p>
                </div>
              )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentQuestion === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous Question
            </Button>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              Question {currentQuestion + 1} of {quiz.totalQuestions}
            </div>

            {currentQuestion < quiz.questions.length - 1 ? (
              <Button onClick={handleNext}>
                Next Question
                <ChevronLeft className="h-4 w-4 ml-2 rotate-180" />
              </Button>
            ) : (
              <Button
                onClick={() => {
                  const nextItem = findNextItemAcrossModules();

                  if (nextItem) {
                    if (
                      nextItem.item.type === "video" ||
                      nextItem.item.type === "pdf"
                    ) {
                      navigate(
                        `/course/${courseId}/module/${nextItem.sectionId}/lesson/${nextItem.item.id}`,
                      );
                    } else if (nextItem.item.type === "quiz") {
                      navigate(
                        `/course/${courseId}/module/${nextItem.sectionId}/quiz/${nextItem.item.id}`,
                      );
                    }
                  } else {
                    navigate(`/course/${courseId}`);
                  }
                }}
                className="bg-primary hover:bg-primary/90"
              >
                Next Item
                <ChevronLeft className="h-4 w-4 ml-2 rotate-180" />
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default QuizTaking;
