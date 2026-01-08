import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, Clock, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { moduleService } from "@/services/moduleService";
import apiService from "@/services/apiService";

interface CourseSection {
  id: string;
  title: string;
  description?: string;
  order_index: number;
  items: ModuleItem[];
}

interface ModuleItem {
  id: string;
  type: 'video' | 'quiz';
  title: string;
  description?: string;
  order_index: number;
  duration_seconds?: number;
  video_url?: string;
  thumbnail_url?: string;
}

const QuizTaking = () => {
  const { courseId, moduleId, quizId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeRemaining, setTimeRemaining] = useState(1800); // 30 minutes
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [courseSections, setCourseSections] = useState<CourseSection[]>([]);

  const quiz = {
    id: quizId,
    title: "React Basics Assessment",
    totalQuestions: 10,
    passingScore: 70,
    timeLimit: 30,
    questions: [
      {
        id: 1,
        type: "mcq",
        question: "What is React?",
        image: null,
        options: [
          "A JavaScript library for building user interfaces",
          "A database management system",
          "A CSS framework",
          "A server-side language"
        ],
        correctAnswer: 0
      },
      {
        id: 2,
        type: "mcq",
        question: "Which hook is used for state management in functional components?",
        image: null,
        options: [
          "useEffect",
          "useState",
          "useContext",
          "useReducer"
        ],
        correctAnswer: 1
      },
      {
        id: 3,
        type: "short_answer",
        question: "Explain the difference between props and state in React.",
        image: null,
      },
      // ... more questions
    ],
  };

  const currentQ = quiz.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / quiz.totalQuestions) * 100;

  // Fetch course sections on mount to enable navigation
  useEffect(() => {
    const fetchCourseSections = async () => {
      if (!courseId || !user?.sub) return;
      
      try {
        const response = await apiService.get(`/getModuleDetail/${courseId}?userId=${user.sub}`);
        if (response?.data?.sections) {
          setCourseSections(response.data.sections);
        }
      } catch (error) {
        console.error('Error fetching course sections:', error);
      }
    };

    fetchCourseSections();
  }, [courseId, user?.sub]);

  const findNextItemAcrossModules = (): { item: ModuleItem; sectionId: string } | null => {
    if (!moduleId || courseSections.length === 0) return null;

    // Find current section
    const currentSectionIndex = courseSections.findIndex(
      (section) => section.id === moduleId
    );

    if (currentSectionIndex === -1) return null;

    const currentSection = courseSections[currentSectionIndex];
    
    // First, try to find next item in CURRENT module
    if (currentSection.items && currentSection.items.length > 0) {
      const currentItemIndex = currentSection.items.findIndex(
        (item) => item.id === quizId && item.type === 'quiz'
      );
      
      // If current quiz found and there's a next item in this module
      if (currentItemIndex !== -1 && currentItemIndex < currentSection.items.length - 1) {
        return {
          item: currentSection.items[currentItemIndex + 1],
          sectionId: currentSection.id,
        };
      }
    }

    // If no next item in current module, look through remaining sections
    for (let i = currentSectionIndex + 1; i < courseSections.length; i++) {
      const section = courseSections[i];
      if (section.items && section.items.length > 0) {
        // Return the first item (video or quiz) in the next module
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

  const handleSubmit = async () => {
    if (!user?.sub || !quizId) {
      toast({
        title: "Error",
        description: "User information or quiz ID is missing",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Transform answers from { [index]: value } to [{ questionId, answer }]
      const answersArray = Object.entries(answers).map(([index, answer]) => ({
        questionId: quiz.questions[parseInt(index)].id.toString(),
        answer: answer
      }));

      // Calculate time taken in minutes
      const timeTakenMinutes = Math.floor((1800 - timeRemaining) / 60);

      const result = await moduleService.submitQuiz(
        quizId,
        user.sub,
        answersArray,
        timeTakenMinutes
      );

      toast({
        title: "Quiz Submitted Successfully",
        description: `You scored ${result.data.score}% (${result.data.correctAnswers}/${result.data.totalQuestions} correct)`,
        variant: result.data.isPassed ? "default" : "destructive",
      });

      // Only navigate to next item if user passed the quiz
      if (result.data.isPassed) {
        // Find next item to navigate to
        const nextItem = findNextItemAcrossModules();
        
        console.log('🎯 Quiz passed! Finding next item...', {
          currentQuizId: quizId,
          currentModuleId: moduleId,
          nextItem: nextItem ? {
            id: nextItem.item.id,
            type: nextItem.item.type,
            title: nextItem.item.title
          } : null
        });
        
        if (nextItem) {
          // Navigate to next item (video or quiz)
          if (nextItem.item.type === 'video') {
            navigate(`/course/${courseId}/module/${nextItem.sectionId}/lesson/${nextItem.item.id}`);
          } else if (nextItem.item.type === 'quiz') {
            navigate(`/course/${courseId}/module/${nextItem.sectionId}/quiz/${nextItem.item.id}`);
          }
        } else {
          // No next item, navigate back to course with state to trigger refresh
          navigate(`/course/${courseId}`, { 
            state: { 
              quizCompleted: true, 
              quizId,
              isPassed: true 
            } 
          });
        }
      } else {
        // Quiz failed, navigate back to course detail
        navigate(`/course/${courseId}`, { 
          state: { 
            quizCompleted: true, 
            quizId,
            isPassed: false 
          } 
        });
      }
    } catch (error: any) {
      console.error('Error submitting quiz:', error);
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit quiz. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
                  Question {currentQuestion + 1} of {quiz.totalQuestions}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-warning">
                  <Clock className="h-5 w-5" />
                  <span className="font-semibold">{formatTime(timeRemaining)}</span>
                </div>
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
                <h2 className="text-xl font-semibold flex-1">{currentQ.question}</h2>
              </div>
              {currentQ.image && (
                <img 
                  src={currentQ.image} 
                  alt="Question" 
                  className="w-full max-w-2xl rounded-lg mb-4"
                />
              )}
            </div>

            {currentQ.type === "mcq" && currentQ.options && (
              <RadioGroup
                value={answers[currentQuestion]}
                onValueChange={(value) => setAnswers({ ...answers, [currentQuestion]: value })}
                className="space-y-3"
              >
                {currentQ.options.map((option, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-3 p-4 rounded-lg border border-border hover:bg-muted/10 cursor-pointer"
                  >
                    <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                    <Label
                      htmlFor={`option-${index}`}
                      className="flex-1 cursor-pointer"
                    >
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {currentQ.type === "short_answer" && (
              <Textarea
                placeholder="Type your answer here..."
                value={answers[currentQuestion] || ""}
                onChange={(e) => setAnswers({ ...answers, [currentQuestion]: e.target.value })}
                rows={6}
                className="w-full"
              />
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
              Previous
            </Button>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              {Object.keys(answers).length} of {quiz.totalQuestions} answered
            </div>

            {currentQuestion < quiz.questions.length - 1 ? (
              <Button onClick={handleNext}>
                Next
                <ChevronLeft className="h-4 w-4 ml-2 rotate-180" />
              </Button>
            ) : (
              <Button 
                onClick={handleSubmit} 
                className="bg-success hover:bg-success/90"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Submit Quiz"}
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default QuizTaking;
