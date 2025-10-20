import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, Clock, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const QuizTaking = () => {
  const { courseId, moduleId, quizId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeRemaining, setTimeRemaining] = useState(1800); // 30 minutes

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

  const handleSubmit = () => {
    toast({
      title: "Quiz Submitted",
      description: "Your answers have been submitted for grading",
    });
    navigate(`/course/${courseId}`);
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
              <Button onClick={handleSubmit} className="bg-success hover:bg-success/90">
                Submit Quiz
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default QuizTaking;
