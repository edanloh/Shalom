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
  type: 'video' | 'quiz' | 'pdf';
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

  // Instructor view - show answers and explanations
  const isInstructorView = true;
  
  const quiz = {
    id: quizId,
    title: "React Basics Assessment",
    totalQuestions: 3, // Will be updated to questions.length below
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
        correctAnswer: 0,
        explanation: "React is a popular JavaScript library developed by Facebook for building user interfaces, particularly single-page applications."
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
        correctAnswer: 1,
        explanation: "useState is the primary hook for adding state to functional components in React. It returns the current state and a function to update it."
      },
      {
        id: 3,
        type: "short_answer",
        question: "Explain the difference between props and state in React.",
        image: null,
        explanation: "Props are read-only data passed from parent to child components, while state is mutable data managed within a component. Props enable component reusability, while state manages dynamic data that changes over time."
      },
      // ... more questions
    ],
  };
  
  // Update totalQuestions to match actual questions array
  quiz.totalQuestions = quiz.questions.length;

  const currentQ = quiz.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / quiz.totalQuestions) * 100;

  // Fetch course sections on mount to enable navigation
  useEffect(() => {
    const fetchCourseSections = async () => {
      if (!courseId) {
        console.log('❌ Missing courseId');
        return;
      }
      
      // Use hardcoded admin ID for instructor view (same as CourseDetail)
      const adminId = user?.id || user?.sub || (user as any)?.['cognito:username'] || '550e8400-e29b-41d4-a716-446655440101';
      
      try {
        console.log('🔄 Fetching course sections for:', courseId, 'with adminId:', adminId);
        const response = await apiService.get(`/getModuleDetailInstructor/${adminId}/${courseId}`);
        console.log('📦 API Response:', response);
        console.log('📦 Response data:', response?.data);
        console.log('📦 Sections:', response?.data?.sections);
        console.log('📦 Sections length:', response?.data?.sections?.length || 0);
        
        if (response?.data?.sections) {
          setCourseSections(response.data.sections);
          console.log('✅ Course sections set:', response.data.sections.length);
        } else {
          console.log('⚠️ No sections found in response');
        }
      } catch (error) {
        console.error('❌ Error fetching course sections:', error);
      }
    };

    fetchCourseSections();
  }, [courseId]);

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
                  Question {currentQuestion + 1} of {quiz.totalQuestions} • Instructor View
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
              <div className="space-y-3">
                {currentQ.options.map((option, index) => {
                  const isCorrect = currentQ.correctAnswer === index;
                  return (
                    <div
                      key={index}
                      className={`flex items-center space-x-3 p-4 rounded-lg border ${
                        isCorrect 
                          ? 'border-success bg-success/10' 
                          : 'border-border'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 ${
                        isCorrect 
                          ? 'border-success bg-success text-success-foreground' 
                          : 'border-muted-foreground'
                      }`}>
                        {isCorrect && '✓'}
                      </div>
                      <Label className="flex-1">
                        {option}
                        {isCorrect && (
                          <span className="ml-2 text-xs font-semibold text-success">
                            (Correct Answer)
                          </span>
                        )}
                      </Label>
                    </div>
                  );
                })}
              </div>
            )}

            {currentQ.type === "short_answer" && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg border border-border bg-muted/5">
                  <p className="text-sm font-semibold text-muted-foreground mb-2">Sample Answer:</p>
                  <p className="text-foreground">{(currentQ as any).explanation || 'No sample answer provided.'}</p>
                </div>
              </div>
            )}
            
            {/* Explanation Section */}
            {(currentQ as any).explanation && currentQ.type === "mcq" && (
              <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-sm font-semibold text-primary mb-2">Explanation:</p>
                <p className="text-foreground">{(currentQ as any).explanation}</p>
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
                  console.log('🔍 Navigation Debug:', {
                    currentQuizId: quizId,
                    currentModuleId: moduleId,
                    courseSections: courseSections.length,
                    nextItem: nextItem ? {
                      id: nextItem.item.id,
                      type: nextItem.item.type,
                      title: nextItem.item.title,
                      sectionId: nextItem.sectionId
                    } : null
                  });
                  
                  if (nextItem) {
                    if (nextItem.item.type === 'video' || nextItem.item.type === 'pdf') {
                      navigate(`/course/${courseId}/module/${nextItem.sectionId}/lesson/${nextItem.item.id}`);
                    } else if (nextItem.item.type === 'quiz') {
                      navigate(`/course/${courseId}/module/${nextItem.sectionId}/quiz/${nextItem.item.id}`);
                    }
                  } else {
                    console.log('❌ No next item found, navigating back to course');
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
