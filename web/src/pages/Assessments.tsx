import { useState, useMemo, useEffect } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, FileText, CheckCircle, Clock, Filter, X, ChevronDown, BookOpen, Layers, Loader2, AlertCircle, TrendingUp, TrendingDown, Users, Target, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Pagination } from "@/components/Pagination";
import { courseService, Course, quizService, QuestionGrading, AnswerVariation, StudentAnswer, QuizResultsStats, StudentAttemptDetails } from "@/services";
import moduleService from "@/services/moduleService";
import { useUser } from '@/contexts/useUser';
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

const Assessments = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [courseSearchQuery, setCourseSearchQuery] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [selectedModule, setSelectedModule] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(9);
  const [isCourseDialogOpen, setIsCourseDialogOpen] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [questionGrading, setQuestionGrading] = useState<QuestionGrading[]>([]);
  const [isLoadingGrading, setIsLoadingGrading] = useState(false);
  const [gradingState, setGradingState] = useState<Record<string, { points: string; feedback: string }>>({});
  const [isSubmittingGrade, setIsSubmittingGrade] = useState(false);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const [expandedQuizzes, setExpandedQuizzes] = useState<Set<string>>(new Set());
  const [viewQuestionDialog, setViewQuestionDialog] = useState<QuestionGrading | null>(null);
  const [viewQuizResultsDialog, setViewQuizResultsDialog] = useState<any | null>(null);
  const [quizResultsData, setQuizResultsData] = useState<QuizResultsStats | null>(null);
  const [isLoadingQuizResults, setIsLoadingQuizResults] = useState(false);
  const [viewStudentAttemptDialog, setViewStudentAttemptDialog] = useState<StudentAttemptDetails | null>(null);
  const [isLoadingStudentAttempt, setIsLoadingStudentAttempt] = useState(false);
  const [resultsActiveTab, setResultsActiveTab] = useState("students");
  const [showOnlyRetakers, setShowOnlyRetakers] = useState(false);
  const [activeGradingModal, setActiveGradingModal] = useState<{ question: QuestionGrading; variationIndex: number } | null>(null);
  const [gradingSortBy, setGradingSortBy] = useState<"pending" | "oldest">("pending");
  const [explanerDismissed, setExplanerDismissed] = useState(() => localStorage.getItem("gradingExplainerDismissed") === "true");
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const { user } = useUser();
  const navigate = useNavigate();
  const [isFetchingCourse, setIsFetchingCourse] = useState(false);

  const statusColors = {
    published: "status-badge-published",
    draft: "status-badge-draft",
    archived: "bg-muted text-muted-foreground",
  };

  const fetchCourses = async () => {
    if (!user?.uuid) {
      setCourses([]);
      return;
    }
    try {
      const data = await courseService.getCourses({ instructorId: user.uuid });
      setCourses(data);
      console.log('Fetched courses:', data);
    } catch (err) {
      console.error('Error fetching courses:', err);
      toast({
        title: "Error",
        description: "Failed to load courses. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Fetch courses on mount
  useEffect(() => {
    fetchCourses();
  }, [user?.uuid]);

  useEffect(() => {
    if (selectedCourse) {
      setIsFetchingCourse(true);
      fetchCourseData().finally(() => setIsFetchingCourse(false));
    }
  }, [selectedCourse, selectedModule]);

  // Auto-fetch all pending grading on mount
  useEffect(() => {
    if (user?.uuid) {
      fetchPendingGrading();
    }
  }, [user?.uuid]);

  // Fetch quiz results when dialog opens
  useEffect(() => {
    if (viewQuizResultsDialog?.id) {
      fetchQuizResults(viewQuizResultsDialog.id);
    } else {
      setQuizResultsData(null);
      setShowOnlyRetakers(false);
      setResultsActiveTab("students");
    }
  }, [viewQuizResultsDialog]);

  const filteredCoursesForSelection = useMemo(() => {
    return courses.filter(course =>
      course.title.toLowerCase().includes(courseSearchQuery.toLowerCase())
    );
  }, [courses, courseSearchQuery]);

  const fetchCourseData = async () => {
    console.log('Fetching data for course ID:', selectedCourse);
    if (!selectedCourse) return;
    const courseId = selectedCourse;

    try {
      // Use instructor endpoint to get full course details
      // TODO: Get actual admin ID from auth context
      const adminId = user.uuid;

      const data = await moduleService.getCourseModules(courseId, adminId);
      console.log('Fetched course modules and quizzes:', data);
      
      // Set sections (modules) from the instructor API response
      if (data) {
        setModules(data);
        // Fetch quizzes for the course and its modules
        const allQuizzes = data.flatMap((module: any) => module.quizzes || []);
        console.log(`Fetched ${allQuizzes.length} quizzes for course ${courseId}`);
        
        // Fetch attempt stats for all quizzes
        if (allQuizzes.length > 0) {
          const quizIds = allQuizzes.map((q: any) => q.id);
          const { data: attemptStats, error } = await supabase
            .from('quiz_attempts')
            .select('quiz_id, user_id')
            .in('quiz_id', quizIds);

          if (!error && attemptStats) {
            // Calculate stats per quiz
            const statsMap = new Map<string, { attemptCount: number; studentCount: number }>();
            attemptStats.forEach((attempt: any) => {
              const quizId = attempt.quiz_id;
              if (!statsMap.has(quizId)) {
                statsMap.set(quizId, { attemptCount: 0, studentCount: 0 });
              }
              statsMap.get(quizId)!.attemptCount++;
            });

            // Count unique students per quiz
            quizIds.forEach((quizId: string) => {
              const quizAttempts = attemptStats.filter((a: any) => a.quiz_id === quizId);
              const uniqueStudents = new Set(quizAttempts.map((a: any) => a.user_id)).size;
              if (statsMap.has(quizId)) {
                statsMap.get(quizId)!.studentCount = uniqueStudents;
              } else if (quizAttempts.length > 0) {
                statsMap.set(quizId, { attemptCount: quizAttempts.length, studentCount: uniqueStudents });
              }
            });

            // Enrich quiz objects with stats
            allQuizzes.forEach((quiz: any) => {
              const stats = statsMap.get(quiz.id);
              quiz.attemptCount = stats?.attemptCount || 0;
              quiz.studentCount = stats?.studentCount || 0;
            });
          }
        }
        
        setQuizzes(allQuizzes);
        console.log('Quizzes set in state:', allQuizzes);
      } else {
        setModules([]);
      }

    } catch (err) {
      console.error('Error fetching course data:', err);
      toast({
        title: "Error",
        description: "Failed to load course details. Please try again.",
        variant: "destructive",
      });
    }
  };

  const fetchPendingGrading = async () => {
    if (!user?.uuid) return;
    
    setIsLoadingGrading(true);
    try {
      // Fetch all pending grading across all courses (pass undefined for courseId to get all)
      const data = await quizService.getPendingGradingByQuestion(
        user.uuid,
        undefined, // Get all courses
        undefined  // Get all modules
      );
      setQuestionGrading(data);
      
      // Auto-expand quizzes (get unique quiz IDs) if 3 or fewer
      const uniqueQuizIds = Array.from(new Set(data.map(q => q.quizId)));
      if (uniqueQuizIds.length <= 3) {
        setExpandedQuizzes(new Set(uniqueQuizIds));
      }
    } catch (error: any) {
      console.error('Error fetching pending grading:', error);
      toast({
        title: "Error",
        description: "Failed to load pending grading items. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingGrading(false);
    }
  };

  const fetchQuizResults = async (quizId: string) => {
    setIsLoadingQuizResults(true);
    try {
      const data = await quizService.getQuizResults(quizId);
      console.log('Quiz results data:', data);
      console.log('Question breakdown:', data.questionBreakdown);
      setQuizResultsData(data);
    } catch (error: any) {
      console.error('Error fetching quiz results:', error);
      toast({
        title: "Error",
        description: "Failed to load quiz results. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingQuizResults(false);
    }
  };

  const handleExportResults = () => {
    if (!quizResultsData) return;

    // Create CSV content
    const headers = ['Student Name', 'Email', 'Score (%)', 'Status', 'Attempts', 'Last Attempt'];
    const rows = quizResultsData.studentScores.map(student => [
      student.studentName,
      student.studentEmail,
      student.score,
      student.status,
      student.attempts,
      student.lastAttemptDate
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${quizResultsData.quizTitle.replace(/\s+/g, '_')}_results.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export Successful",
      description: `Exported results for ${quizResultsData.studentScores.length} students`,
    });
  };

  const handleViewStudentAttempt = async (student: any) => {
    console.log('Student object:', student);
    
    setIsLoadingStudentAttempt(true);
    console.log('Fetching attempt details...');
    
    try {
      let attemptId = student.lastAttemptId;
      
      // Fallback: if lastAttemptId is missing, fetch it from the backend
      if (!attemptId) {
        console.log('No lastAttemptId, fetching from backend for userId:', student.studentId);
        const fallbackResponse = await quizService.getStudentLatestAttempt(viewQuizResultsDialog.id, student.studentId);
        attemptId = fallbackResponse.attemptId;
        console.log('Got attemptId from fallback:', attemptId);
      }
      
      if (!attemptId) {
        throw new Error('No attempt ID found for this student');
      }
      
      const attemptDetails = await quizService.getStudentAttemptDetails(attemptId);
      console.log('Received attempt details:', attemptDetails);
      console.log('Question attempts:', attemptDetails.questionAttempts);
      attemptDetails.questionAttempts.forEach((q: any, i: number) => {
        console.log(`Question ${i + 1}:`, {
          id: q.questionId,
          text: q.questionText,
          type: q.questionType,
          hasOptions: !!q.options,
          optionsCount: q.options?.length || 0,
          options: q.options
        });
      });
      setViewStudentAttemptDialog(attemptDetails);
    } catch (error: any) {
      console.error('Error fetching student attempt details:', error);
      toast({
        title: "Error",
        description: `Failed to load student attempt details: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoadingStudentAttempt(false);
    }
  };

  const handleEditQuiz = () => {
    if (viewQuizResultsDialog?.id) {
      navigate(`/course-builder/${selectedCourse}?quizId=${viewQuizResultsDialog.id}`);
    } else {
      navigate(`/course-builder/${selectedCourse}`);
    }
  };

  const handleReviewQuestion = (questionId: string) => {
    // Close quiz results dialog and filter grading queue to this question
    setViewQuizResultsDialog(null);
    // The grading queue should already have this question if it needs grading
    // Expand the quiz and question
    const questionData = questionGrading.find(q => q.questionId === questionId);
    if (questionData) {
      setExpandedQuizzes(new Set([questionData.quizId]));
      setExpandedQuestions(new Set([questionId]));
      // Scroll to grading tab
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleViewRetakers = () => {
    setResultsActiveTab('students');
    setShowOnlyRetakers(true);
  };

  const filteredQuizzes = quizzes.filter(quiz => {
    return quiz.title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const toggleQuestionExpanded = (questionId: string) => {
    setExpandedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const toggleQuizExpanded = (quizId: string) => {
    setExpandedQuizzes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(quizId)) {
        newSet.delete(quizId);
      } else {
        newSet.add(quizId);
      }
      return newSet;
    });
  };

  const toggleStudentExpanded = (studentId: string) => {
    setExpandedStudents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
      return newSet;
    });
  };

  const getGradingKey = (questionId: string, variationId: string) => `${questionId}-${variationId}`;

  const handleGradeVariation = async (question: QuestionGrading, variation: AnswerVariation) => {
    const state = getVariationGradingState(question, variation);
    const gradingKey = getGradingKey(question.questionId, variation.variationId);

    if (!state?.points) {
      toast({
        title: "Points Required",
        description: "Please enter points to award",
        variant: "destructive",
      });
      return;
    }

    const points = parseFloat(state.points);
    if (isNaN(points) || points < 0 || points > question.maxPoints) {
      toast({
        title: "Invalid Points",
        description: `Points must be between 0 and ${question.maxPoints}`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingGrade(true);
    try {
      const attemptIds = variation.students.map(s => s.attemptId);

      await quizService.gradeAnswerVariation({
        attemptIds,
        questionId: question.questionId,
        pointsAwarded: points,
        feedback: state.feedback?.trim() || undefined,
        releaseGrades: true
      });

      toast({
        title: variation.isGraded ? "Re-Graded Successfully" : "Graded Successfully",
        description: `${variation.studentCount} student${variation.studentCount !== 1 ? 's' : ''} ${variation.isGraded ? 're-graded' : 'graded'} (${points}/${question.maxPoints} points)`
      });

      // Clear grading state for this variation
      setGradingState(prev => {
        const newState = { ...prev };
        delete newState[gradingKey];
        return newState;
      });
      
      fetchPendingGrading();
    } catch (error: any) {
      console.error('Error submitting grade:', error);
      toast({
        title: "Error",
        description: "Failed to submit grade. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingGrade(false);
    }
  };

  const updateGradingState = (questionId: string, variationId: string, field: 'points' | 'feedback', value: string) => {
    const gradingKey = getGradingKey(questionId, variationId);
    setGradingState(prev => ({
      ...prev,
      [gradingKey]: {
        ...prev[gradingKey],
        [field]: value
      }
    }));
  };

  const getVariationGradingState = (question: QuestionGrading, variation: AnswerVariation) => {
    const gradingKey = getGradingKey(question.questionId, variation.variationId);
    return gradingState[gradingKey] || {
      points: variation.isGraded && variation.gradedPoints !== null 
        ? variation.gradedPoints.toString() 
        : question.maxPoints.toString(),
      feedback: variation.isGraded && variation.gradedFeedback 
        ? variation.gradedFeedback 
        : ''
    };
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const past = new Date(dateString);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    return past.toLocaleDateString();
  };

  const handleCourseSelect = async (courseId: string) => {
    setSelectedCourse(courseId);
    setSelectedModule("");
    setIsCourseDialogOpen(false);
    setCourseSearchQuery("");
  };

  const handleClearFilters = () => {
    setSelectedCourse("");
    setSelectedModule("");
    setCourseSearchQuery("");
  };

  const dismissExplainer = () => {
    setExplanerDismissed(true);
    localStorage.setItem("gradingExplainerDismissed", "true");
  };

  const sortedQuestionGrading = useMemo(() => {
    let filtered = [...questionGrading];

    // REMOVE questions with 0 pending
    filtered = filtered.filter(q => q.totalPendingCount > 0);

    // Apply course/module filter
    if (selectedCourse) {
      filtered = filtered.filter(q => q.courseId === selectedCourse);
      if (selectedModule) {
        filtered = filtered.filter(q => q.moduleId === selectedModule);
      }
    }

    return filtered;
  }, [questionGrading, selectedCourse, selectedModule]);

  // Group questions by quiz
  const groupedByQuiz = useMemo(() => {
    const groups = new Map<string, {
      quizId: string;
      quizTitle: string;
      courseId: string;
      courseTitle: string;
      moduleId: string | null;
      moduleTitle: string | null;
      questions: QuestionGrading[];
      totalPending: number;
      totalVariations: number;
      oldestSubmission: number;
    }>();

    sortedQuestionGrading.forEach(question => {
      if (!groups.has(question.quizId)) {
        groups.set(question.quizId, {
          quizId: question.quizId,
          quizTitle: question.quizTitle,
          courseId: question.courseId,
          courseTitle: question.courseTitle,
          moduleId: question.moduleId,
          moduleTitle: question.moduleTitle,
          questions: [],
          totalPending: 0,
          totalVariations: 0,
          oldestSubmission: Infinity,
        });
      }
      
      const group = groups.get(question.quizId)!;
      group.questions.push(question);
      group.totalPending += question.totalPendingCount;
      group.totalVariations += question.variations.length;
      
      // Track oldest submission for this quiz
      const questionOldest = Math.min(...question.variations.map(v => 
        Math.min(...v.students.map(s => new Date(s.submittedAt).getTime()))
      ));
      if (questionOldest < group.oldestSubmission) {
        group.oldestSubmission = questionOldest;
      }
    });

    // Convert to array and sort by quiz-level metrics
    return Array.from(groups.values()).sort((a, b) => {
      if (gradingSortBy === "pending") {
        // Sort by total pending, then by total variations as tiebreaker
        if (a.totalPending !== b.totalPending) {
          return b.totalPending - a.totalPending;
        }
        return b.totalVariations - a.totalVariations;
      } else if (gradingSortBy === "oldest") {
        // Sort by oldest submission date
        return a.oldestSubmission - b.oldestSubmission;
      }
      return 0;
    });
  }, [sortedQuestionGrading, gradingSortBy]);

  const openGradingModal = (question: QuestionGrading, variationIndex: number) => {
    setActiveGradingModal({ question, variationIndex });
  };

  const closeGradingModal = () => {
    setActiveGradingModal(null);
  };

  const handleModalGradeSubmit = async () => {
    if (!activeGradingModal) return;
    
    const { question, variationIndex } = activeGradingModal;
    const variation = question.variations[variationIndex];
    
    await handleGradeVariation(question, variation);
    
    // Move to next variation or close if done
    if (variationIndex < question.variations.length - 1) {
      setActiveGradingModal({ question, variationIndex: variationIndex + 1 });
    } else {
      closeGradingModal();
    }
  };

  const skipToNextVariation = () => {
    if (!activeGradingModal) return;
    
    const { question, variationIndex } = activeGradingModal;
    if (variationIndex < question.variations.length - 1) {
      setActiveGradingModal({ question, variationIndex: variationIndex + 1 });
    } else {
      closeGradingModal();
    }
  };

  const selectedCourseData = courses.find(c => c.id === selectedCourse);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Assessment Center</h1>
            <p className="text-muted-foreground">Grade submissions across all courses or filter by course/module</p>
          </div>
        </div>

        {/* Compact Inline Filter */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm text-muted-foreground">Filter:</span>
          {/* Course Selector */}
          {!selectedCourse ? (
            <Dialog open={isCourseDialogOpen} onOpenChange={setIsCourseDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <BookOpen className="h-4 w-4" />
                  Select Course
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle>Select Course</DialogTitle>
                  <DialogDescription>
                    Choose a course to filter assessments and grading queue
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
                  <div className="relative flex-shrink-0">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search courses by name..."
                      className="pl-10"
                      value={courseSearchQuery}
                      onChange={(e) => setCourseSearchQuery(e.target.value)}
                      autoFocus
                    />
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2 pr-2 min-h-0">
                    {filteredCoursesForSelection.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No courses found matching "{courseSearchQuery}"</p>
                      </div>
                    ) : (
                      filteredCoursesForSelection.map(course => (
                        <button
                          key={course.id}
                          disabled={course.status !== "published"}
                          onClick={() => handleCourseSelect(course.id)}
                          className={`w-full p-4 rounded-lg border border-border transition-all text-left group ${course.status !== "published" ? "opacity-50 cursor-not-allowed" : "hover:border-primary hover:bg-primary/5"}`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <h4 className={`font-semibold text-foreground ${course.status !== "published" ? "opacity-50" : "group-hover:text-primary"} transition-colors mb-1`}>
                                {course.title}
                              </h4>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Badge className={`mr-1 ${statusColors[course.status]}`}>
                                    {course.status.toUpperCase()}
                                  </Badge>
                                  <Layers className="h-3.5 w-3.5" />
                                  {course.quizzes} quizzes
                                </span>
                                <span>{course.enrolledCount} students</span>
                              </div>
                            </div>
                            <ChevronDown className={`h-5 w-5 text-muted-foreground ${course.status !== "published" ? "opacity-50" : "group-hover:text-primary"} transition-colors rotate-[-90deg]`} />
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-primary bg-primary/5">
              <BookOpen className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm">{selectedCourseData?.title}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive ml-2"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}

          {/* Module Pills */}
          {selectedCourse && !isFetchingCourse && modules.length > 0 && (
            <>
              <div className="h-6 w-px bg-border" />
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">Module:</span>
                {modules.map(module => (
                  <Button
                    key={module.id}
                    variant={selectedModule === module.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedModule(module.id === selectedModule ? "" : module.id)}
                    className="h-8 rounded-full text-xs bg-gray-700"
                  >
                    {module.title}
                  </Button>
                ))}
              </div>
            </>
          )}

          {isFetchingCourse && selectedCourse && (
            <>
              <div className="h-6 w-px bg-border" />
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </>
          )}
        </div>

        <Tabs defaultValue="grading" className="space-y-6">
          <TabsList className="grid w-full md:w-[400px] grid-cols-2">
            <TabsTrigger value="grading">Grading Queue</TabsTrigger>
            <TabsTrigger value="quizzes">Quiz Library</TabsTrigger>
          </TabsList>

          <TabsContent value="quizzes" className="space-y-4">
            {!selectedCourse ? (
              <Card className="p-12 gradient-card border-border text-center">
                <div className="max-w-md mx-auto">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Filter className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-2">Select a Course</h3>
                  <p className="text-muted-foreground mb-6">
                    Choose a course from the filter above to browse quizzes
                  </p>
                  <Button onClick={() => setIsCourseDialogOpen(true)} className="gap-2">
                    <BookOpen className="h-4 w-4" />
                    Browse Courses
                  </Button>
                </div>
              </Card>
            ) : (
              <>
                <Card className="p-6 gradient-card border-border">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search quizzes..."
                      className="pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </Card>

                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredQuizzes.length === 0 ? (
                      <div className="col-span-full">
                        <Card className="p-12 gradient-card border-border text-center">
                          <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                          <h3 className="text-xl font-semibold mb-2">No Quizzes Found</h3>
                          <p className="text-muted-foreground">
                            {searchQuery 
                              ? `No quizzes match "${searchQuery}"`
                              : "No quizzes available for the selected filters"}
                          </p>
                        </Card>
                      </div>
                    ) : (
                      filteredQuizzes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((quiz) => (
                        <Card key={quiz.id} className="p-6 gradient-card border-border hover-lift">
                          <div className="space-y-4">
                            <div className="flex items-start justify-between">
                              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                <FileText className="h-6 w-6 text-primary" />
                              </div>
                              {/* <Badge variant={quiz.status === "published" ? "default" : "secondary"}>
                                {quiz.status}
                              </Badge> */}
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg text-foreground mb-1">{quiz.title}</h3>
                              <p className="text-sm text-muted-foreground line-clamp-1">{quiz.course}</p>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">{Array.isArray(quiz.questions) ? quiz.questions.length : (typeof quiz.questions === 'number' ? quiz.questions : 0)} questions</span>
                                <span className="text-muted-foreground">{quiz.type}</span>
                              </div>
                              {quiz.attemptCount !== undefined && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="text-muted-foreground">
                                    {quiz.attemptCount === 0 ? (
                                      <span className="text-orange-400">No attempts yet</span>
                                    ) : (
                                      <span>{quiz.studentCount || 0} {quiz.studentCount === 1 ? 'student' : 'students'} • {quiz.attemptCount} {quiz.attemptCount === 1 ? 'attempt' : 'attempts'}</span>
                                    )}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" className="flex-1" onClick={() => navigate(`/course-builder/${selectedCourse}`)}>Edit</Button>
                              <Button size="sm" className="flex-1" onClick={() => setViewQuizResultsDialog(quiz)}>View Results</Button>
                            </div>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                  {filteredQuizzes.length > 0 && (
                    <Pagination
                      currentPage={currentPage}
                      totalPages={Math.ceil(filteredQuizzes.length / itemsPerPage)}
                      onPageChange={setCurrentPage}
                      itemsPerPage={itemsPerPage}
                      totalItems={filteredQuizzes.length}
                    />
                  )}
                </>
              </>
            )}
          </TabsContent>

          <TabsContent value="grading" className="space-y-4">
            {isLoadingGrading ? (
              <Card className="p-12 gradient-card border-border text-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Loading pending grading...</p>
              </Card>
            ) : (
              <>
                {/* Dismissible Grading Explainer */}
                {!explanerDismissed && (
                  <Card className="p-4 gradient-card border-blue-500/30 bg-blue-950/20">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 text-sm text-blue-300/80">
                        <strong>Variation-based grading:</strong> Each unique answer is a variation. Grade once to apply to all students with that answer.
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={dismissExplainer}
                        className="h-6 w-6 p-0 hover:bg-blue-500/20"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </Card>
                )}

                <Card className="p-6 gradient-card border-border">
                  <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                        <Clock className="h-5 w-5 text-warning" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">
                          {sortedQuestionGrading.reduce((sum, q) => sum + q.totalPendingCount, 0)} Submission{sortedQuestionGrading.reduce((sum, q) => sum + q.totalPendingCount, 0) !== 1 ? 's' : ''} Pending
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {selectedCourse ? (
                            <>
                              {selectedCourseData?.title}{selectedModule && ` • ${modules.find(m => m.id === selectedModule)?.title}`}
                            </>
                          ) : (
                            `${groupedByQuiz.length} quiz${groupedByQuiz.length !== 1 ? 'zes' : ''} • ${sortedQuestionGrading.length} question${sortedQuestionGrading.length !== 1 ? 's' : ''}`
                          )}
                        </p>
                      </div>
                    </div>
                    
                    {sortedQuestionGrading.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Sort:</span>
                        <Button
                          variant={gradingSortBy === "pending" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setGradingSortBy("pending")}
                          className="h-8"
                          title="Sort by pending submissions, then by variation count"
                        >
                          Most Pending
                        </Button>
                        <Button
                          variant={gradingSortBy === "oldest" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setGradingSortBy("oldest")}
                          className="h-8"
                          title="Sort by oldest submission date"
                        >
                          Oldest First
                        </Button>
                      </div>
                    )}
                  </div>

                  {sortedQuestionGrading.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="h-8 w-8 text-success" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">All Caught Up!</h3>
                    <p className="text-muted-foreground">
                      {selectedCourse 
                        ? "No pending short-answer questions for selected course/module" 
                        : "No pending short-answer questions across all your courses"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {groupedByQuiz.map((quizGroup) => (
                      <div key={quizGroup.quizId} className="border border-border rounded-lg overflow-hidden">
                        {/* Quiz Group Header - Collapsible */}
                        <button
                          onClick={() => toggleQuizExpanded(quizGroup.quizId)}
                          className="w-full border-l-4 border-primary pl-4 pr-4 py-3 bg-muted/20 hover:bg-muted/40 transition-colors text-left"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-lg text-foreground mb-2">{quizGroup.quizTitle}</h3>
                              <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                                <div className="flex items-center gap-1">
                                  <BookOpen className="h-3.5 w-3.5" />
                                  <span>{quizGroup.courseTitle}</span>
                                  {quizGroup.moduleTitle && (
                                    <>
                                      <span>›</span>
                                      <span>{quizGroup.moduleTitle}</span>
                                    </>
                                  )}
                                </div>
                                <span>•</span>
                                <span>{quizGroup.questions.length} question{quizGroup.questions.length !== 1 ? 's' : ''}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <div className="flex items-center gap-2">
                                <Badge className="bg-blue-500">
                                  {quizGroup.totalVariations} variation{quizGroup.totalVariations !== 1 ? 's' : ''}
                                </Badge>
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-500 text-white text-sm font-semibold">
                                  {quizGroup.totalPending}
                                </div>
                              </div>
                              <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${expandedQuizzes.has(quizGroup.quizId) ? 'rotate-180' : ''}`} />
                            </div>
                          </div>
                        </button>

                        {/* Questions within this quiz - Conditionally rendered */}
                        {expandedQuizzes.has(quizGroup.quizId) && (
                        <div className="space-y-4 p-4 bg-background">
                          {quizGroup.questions.map((question, qIndex) => (
                          <div key={question.questionId} className="border border-border rounded-lg overflow-hidden">
                            {/* Question Header */}
                            <button
                              onClick={() => toggleQuestionExpanded(question.questionId)}
                              className="w-full p-4 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                                    <Badge variant="outline" className="font-mono">Q{qIndex + 1}</Badge>
                                    <Badge variant="secondary" className="bg-warning/20 text-warning">{question.totalPendingCount} pending</Badge>
                                    <Badge className="bg-blue-500">{question.variations.length} variation{question.variations.length !== 1 ? 's' : ''}</Badge>
                                    <span className="text-xs text-muted-foreground">• {question.maxPoints} pts</span>
                                  </div>
                                  <p className="font-medium text-foreground mb-1">{question.questionText}</p>
                                  {question.questionExplanation && (
                                    <p className="text-xs text-muted-foreground mt-1 italic">Guideline: {question.questionExplanation}</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setViewQuestionDialog(question);
                                    }}
                                    className="gap-1"
                                  >
                                    <FileText className="h-3 w-3" />
                                      View
                                  </Button>
                                  <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${expandedQuestions.has(question.questionId) ? 'rotate-180' : ''}`} />
                                </div>
                              </div>
                            </button>

                            {/* Variations List (Expandable) */}
                            {expandedQuestions.has(question.questionId) && (
                              <div className="p-4 space-y-3 bg-background">
                                {/* Expected Answer */}
                                {question.sampleAnswer && (
                                  <div className="p-3 rounded bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                                    <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1">EXPECTED ANSWER</p>
                                    <p className="text-sm text-green-900 dark:text-green-100 whitespace-pre-wrap">{question.sampleAnswer}</p>
                                  </div>
                                )}

                                {question.variations.map((variation, vIndex) => {
                                  const state = getVariationGradingState(question, variation);
                                  
                                  return (
                                    <div key={variation.variationId} className={`p-4 rounded-lg border ${
                                      variation.isGraded 
                                        ? 'border-green-300 dark:border-green-800 bg-green-50/30 dark:bg-green-950/10' 
                                        : 'border-border bg-background/50'
                                    }`}>
                                      <div className="flex items-center gap-2 mb-3">
                                        <Badge variant="outline" className="font-mono text-xs">V{vIndex + 1}</Badge>
                                        {variation.isGraded && (
                                          <Badge variant="default" className="bg-green-600 text-xs">
                                            Graded ({variation.gradedPoints} pts)
                                          </Badge>
                                        )}
                                        <Badge className="bg-blue-700 text-xs">{variation.studentCount} student{variation.studentCount !== 1 ? 's' : ''}</Badge>
                                      </div>
                                      {/* Student Answer */}
                                      <div className={`p-3 rounded border mb-3 ${
                                        variation.isGraded 
                                          ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                                          : 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'
                                      }`}>
                                        <p className={`text-sm whitespace-pre-wrap ${
                                          variation.isGraded
                                            ? 'text-green-900 dark:text-green-100'
                                            : 'text-blue-900 dark:text-blue-100'
                                        }`}>{variation.answerText}</p>
                                      </div>
                                      
                                      {/* Streamlined Grading Controls */}
                                      <div className="space-y-2">
                                        <div className="flex gap-2 items-end">
                                          <div className="flex-1">
                                            <Label className="text-xs text-muted-foreground">Points (Max: {question.maxPoints})</Label>
                                            <Input
                                              type="number"
                                              min="0"
                                              max={question.maxPoints}
                                              step="0.01"
                                              value={state.points}
                                              onChange={(e) => updateGradingState(question.questionId, variation.variationId, 'points', e.target.value)}
                                              className="text-center font-semibold mt-1"
                                            />
                                          </div>
                                          <Button
                                            size="sm"
                                            onClick={() => handleGradeVariation(question, variation)}
                                            disabled={isSubmittingGrade || !state.points}
                                            className={`gap-1 ${
                                              variation.isGraded 
                                                ? 'bg-orange-600 hover:bg-orange-700' 
                                                : ''
                                            }`}
                                          >
                                            {isSubmittingGrade ? (
                                              <Loader2 className="h-3 w-3 animate-spin" />
                                            ) : (
                                              <CheckCircle className="h-3 w-3" />
                                            )}
                                            {variation.isGraded ? 'Re-Grade' : 'Grade'}
                                          </Button>
                                        </div>
                                        <div>
                                          <Label className="text-xs text-muted-foreground">Feedback (Optional)</Label>
                                          <Textarea
                                            value={state.feedback}
                                            onChange={(e) => updateGradingState(question.questionId, variation.variationId, 'feedback', e.target.value)}
                                            placeholder="Enter feedback..."
                                            rows={2}
                                            className="text-sm resize-none mt-1"
                                          />
                                        </div>
                                      </div>
                                      
                                      {/* Student Names (Collapsible) */}
                                      <div className="text-xs text-muted-foreground pt-1">
                                        <details className="group">
                                          <summary className="cursor-pointer hover:text-foreground flex items-center gap-1">
                                            <ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" />
                                            View {variation.studentCount} student{variation.studentCount !== 1 ? 's' : ''}
                                          </summary>
                                          <div className="mt-2 ml-4 space-y-1">
                                            {variation.students.map(student => (
                                              <div key={student.attemptId} className="flex items-center gap-2">
                                                <span>• {student.studentName}</span>                                           
                                              </div>
                                            ))}
                                          </div>
                                        </details>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ))}
                        </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* View Question Dialog */}
        <Dialog open={!!viewQuestionDialog} onOpenChange={(open) => !open && setViewQuestionDialog(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Question Details</DialogTitle>
              <DialogDescription>
                {viewQuestionDialog?.quizTitle} • {viewQuestionDialog?.maxPoints} pts
              </DialogDescription>
            </DialogHeader>
            {viewQuestionDialog && (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-semibold mb-2 block">Question</Label>
                  <div className="p-4 rounded-lg bg-background border border-border">
                    <p className="text-foreground whitespace-pre-wrap">{viewQuestionDialog.questionText}</p>
                    {viewQuestionDialog.questionImageUrl && (
                      <img 
                        src={viewQuestionDialog.questionImageUrl}
                        alt="Question"
                        className="mt-3 max-w-full h-auto rounded border border-border"
                      />
                    )}
                  </div>
                </div>
                {viewQuestionDialog.questionExplanation && (
                  <div>
                    <Label className="text-sm font-semibold mb-2 block">Explanation</Label>
                    <div className="p-4 rounded-lg bg-muted/30 border border-border">
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{viewQuestionDialog.questionExplanation}</p>
                    </div>
                  </div>
                )}
                {viewQuestionDialog.sampleAnswer && (
                  <div>
                    <Label className="text-sm font-semibold mb-2 block">Expected Answer</Label>
                    <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                      <p className="text-sm text-green-900 dark:text-green-100 whitespace-pre-wrap">{viewQuestionDialog.sampleAnswer}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Comprehensive Quiz Results Dialog */}
        <Dialog open={!!viewQuizResultsDialog} onOpenChange={(open) => !open && setViewQuizResultsDialog(null)}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">{viewQuizResultsDialog?.title}</DialogTitle>
              <DialogDescription>
                {viewQuizResultsDialog?.course || selectedCourseData?.title} • {Array.isArray(viewQuizResultsDialog?.questions) ? viewQuizResultsDialog.questions.length : (typeof viewQuizResultsDialog?.questions === 'number' ? viewQuizResultsDialog.questions : 0)} Questions
              </DialogDescription>
            </DialogHeader>
            {viewQuizResultsDialog && (
              <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                {isLoadingQuizResults ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : quizResultsData ? (
                  <>
                    {quizResultsData.overallStats.totalAttempts === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 space-y-4">
                        <div className="w-20 h-20 rounded-full bg-muted/20 flex items-center justify-center">
                          <Users className="h-10 w-10 text-muted-foreground opacity-50" />
                        </div>
                        <div className="text-center">
                          <h3 className="text-xl font-semibold mb-2">No Attempts Yet</h3>
                          <p className="text-muted-foreground max-w-md">
                            No students have attempted this quiz yet. Once students start taking the quiz, their results will appear here.
                          </p>
                        </div>
                        <Button variant="outline" onClick={handleEditQuiz}>
                          <FileText className="h-4 w-4 mr-2" />
                          Edit Quiz
                        </Button>
                      </div>
                    ) : (
                      <>
                        {/* Overall Stats Summary */}
                        <div>
                          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <Target className="h-4 w-4" />
                            Overall Performance
                          </h3>
                      <div className="grid grid-cols-4 gap-3">
                        <Card className="p-4 gradient-card border-border">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                              <TrendingUp className="h-5 w-5 text-blue-500" />
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Avg Score</p>
                              <p className="text-2xl font-bold">{quizResultsData.overallStats.avgScore.toFixed(1)}%</p>
                            </div>
                          </div>
                        </Card>
                        <Card className="p-4 gradient-card border-border">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Pass Rate</p>
                              <p className="text-2xl font-bold">{quizResultsData.overallStats.passRate}%</p>
                            </div>
                          </div>
                        </Card>
                        <Card className="p-4 gradient-card border-border">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                              <Users className="h-5 w-5 text-purple-500" />
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Attempts</p>
                              <p className="text-2xl font-bold">{quizResultsData.overallStats.totalAttempts}</p>
                            </div>
                          </div>
                        </Card>
                        <Card className="p-4 gradient-card border-border">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                              <BarChart3 className="h-5 w-5 text-orange-500" />
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Range</p>
                              <p className="text-xl font-bold">{quizResultsData.overallStats.lowScore}-{quizResultsData.overallStats.highScore}%</p>
                            </div>
                          </div>
                        </Card>
                      </div>
                    </div>

                    {/* Score Distribution */}
                    <div>
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Score Distribution
                      </h3>
                      <Card className="p-6 gradient-card border-border">
                        <div className="flex items-end justify-between gap-2 h-48">
                          {quizResultsData.scoreDistribution.map((bucket) => {
                            const maxCount = Math.max(...quizResultsData.scoreDistribution.map(b => b.count), 1);
                            // Calculate height in pixels (max 176px to leave room for count label)
                            const maxHeight = 176;
                            const heightPx = bucket.count > 0 ? Math.max((bucket.count / maxCount) * maxHeight, 8) : 0;
                            const colorMap: Record<string, string> = {
                              "0-20%": "bg-red-500",
                              "20-40%": "bg-orange-500",
                              "40-60%": "bg-yellow-500",
                              "60-80%": "bg-blue-500",
                              "80-100%": "bg-green-500",
                            };
                            return (
                              <div key={bucket.range} className="flex-1 flex flex-col items-center justify-end gap-2 h-full">
                                <div className="text-sm font-semibold">{bucket.count}</div>
                                <div 
                                  className={`w-full ${colorMap[bucket.range] || 'bg-gray-500'} rounded-t transition-all hover:opacity-80`} 
                                  style={{ height: `${heightPx}px` }}
                                />
                                <div className="text-xs text-muted-foreground">{bucket.range}</div>
                              </div>
                            );
                          })}
                        </div>
                      </Card>
                    </div>

                    {/* Student Scores Section */}
                    <div className="space-y-3 mt-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        All Student Scores
                      </h3>
                        {showOnlyRetakers && (
                          <div className="flex items-center justify-between p-3 bg-blue-950/20 border border-blue-500/30 rounded-lg">
                            <div className="flex items-center gap-2 text-sm text-blue-300">
                              <Filter className="h-4 w-4" />
                              <span>Showing only students with multiple attempts</span>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => setShowOnlyRetakers(false)}
                              className="h-7 text-xs"
                            >
                              <X className="h-3 w-3 mr-1" />
                              Clear Filter
                            </Button>
                          </div>
                        )}
                        <div className="rounded-lg border border-border overflow-hidden">
                          <table className="w-full">
                            <thead className="bg-muted/50">
                              <tr className="border-b border-border">
                                <th className="text-left text-xs font-semibold p-3 w-8"></th>
                                <th className="text-left text-xs font-semibold p-3">Student</th>
                                <th className="text-center text-xs font-semibold p-3">Highest Score</th>
                                <th className="text-center text-xs font-semibold p-3">Status</th>
                                <th className="text-center text-xs font-semibold p-3">Attempts</th>
                                <th className="text-left text-xs font-semibold p-3">Last Attempt</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(showOnlyRetakers 
                                ? quizResultsData.studentScores.filter(s => s.attempts > 1)
                                : quizResultsData.studentScores
                              ).map((student, idx) => {
                                const isExpanded = expandedStudents.has(student.studentId);
                                return (
                                  <>
                                    <tr 
                                      key={`student-${student.studentId}`} 
                                      className="border-b border-border hover:bg-muted/30 transition-colors cursor-pointer"
                                      onClick={() => toggleStudentExpanded(student.studentId)}
                                    >
                                      <td className="p-3">
                                        <ChevronDown 
                                          className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                        />
                                      </td>
                                      <td className="p-3 text-sm font-medium">{student.studentName}</td>
                                      <td className="p-3 text-center">
                                        <span className={`text-sm font-bold ${student.score >= 80 ? 'text-green-500' : student.score >= 60 ? 'text-blue-500' : 'text-orange-500'}`}>
                                          {student.score}%
                                        </span>
                                      </td>
                                      <td className="p-3 text-center">
                                        <Badge variant={student.status === "Passed" ? "default" : "destructive"} className="text-xs">
                                          {student.status}
                                        </Badge>
                                      </td>
                                      <td className="p-3 text-center text-sm text-muted-foreground">{student.attempts}</td>
                                      <td className="p-3 text-sm text-muted-foreground">{student.lastAttemptDate}</td>
                                    </tr>
                                    
                                    {isExpanded && student.allAttempts && student.allAttempts.length > 0 && (
                                      <tr key={`attempts-${student.studentId}`} className="bg-muted/20">
                                        <td colSpan={6} className="p-0">
                                          <div className="p-4 pl-12">
                                            <div className="space-y-2">
                                              <h4 className="text-xs font-semibold text-muted-foreground mb-3">All Attempts</h4>
                                              {student.allAttempts.map((attempt, attemptIdx) => (
                                                <div 
                                                  key={attempt.attemptId}
                                                  className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-border hover:bg-muted/30 transition-colors"
                                                >
                                                  <div className="flex items-center gap-4 flex-1">
                                                    <div className="text-xs font-medium text-muted-foreground min-w-[80px]">
                                                      Attempt {attempt.attemptNumber}
                                                    </div>
                                                    <div className="text-center min-w-[60px]">
                                                      <span className={`text-sm font-bold ${attempt.score >= 80 ? 'text-green-500' : attempt.score >= 60 ? 'text-blue-500' : 'text-orange-500'}`}>
                                                        {attempt.score}%
                                                      </span>
                                                    </div>
                                                    <Badge 
                                                      variant={attempt.status === "Passed" ? "default" : "destructive"} 
                                                      className="text-xs"
                                                    >
                                                      {attempt.status}
                                                    </Badge>
                                                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                                                      <Clock className="h-3 w-3" />
                                                      {attempt.completedAt}
                                                    </div>
                                                  </div>
                                                  <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className="text-xs h-8"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleViewStudentAttempt({ ...student, lastAttemptId: attempt.attemptId });
                                                    }}
                                                  >
                                                    View Details
                                                  </Button>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        </td>
                                      </tr>
                                    )}
                                  </>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                        <p className="text-xs text-muted-foreground text-center">
                          Showing {showOnlyRetakers ? quizResultsData.studentScores.filter(s => s.attempts > 1).length : quizResultsData.studentScores.length} student{(showOnlyRetakers ? quizResultsData.studentScores.filter(s => s.attempts > 1).length : quizResultsData.studentScores.length) !== 1 ? 's' : ''} • Click on a student row to expand and see all attempts
                        </p>
                      </div>

                      {/* Retake Insights */}
                      {quizResultsData.studentScores.filter(s => s.attempts > 1).length > 0 && (
                        <Card className="p-4 gradient-card border-blue-500/30 bg-blue-950/20">
                          <div className="flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <div className="text-sm text-blue-300/80">
                                <strong>Retake Insights:</strong> {Math.round((quizResultsData.studentScores.filter(s => s.attempts > 1).length / quizResultsData.studentScores.length) * 100)}% of students attempted this quiz more than once.
                              </div>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="mt-2 text-xs h-7"
                                onClick={handleViewRetakers}
                              >
                                View Retakers
                              </Button>
                            </div>
                          </div>
                        </Card>
                      )}

                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-4 border-t border-border">
                          <Button variant="outline" onClick={handleEditQuiz}>
                            <FileText className="h-4 w-4 mr-2" />
                            Edit Quiz
                          </Button>
                          <Button variant="outline" className="flex-1" onClick={handleExportResults}>
                            Export Results
                          </Button>
                          <Button onClick={() => setViewQuizResultsDialog(null)}>
                            Close
                          </Button>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-sm text-muted-foreground">No results data available for this quiz yet.</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Student Attempt Details Dialog */}
        <Dialog open={!!viewStudentAttemptDialog || isLoadingStudentAttempt} onOpenChange={() => setViewStudentAttemptDialog(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            {isLoadingStudentAttempt ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-sm text-muted-foreground">Loading student attempt details...</p>
              </div>
            ) : viewStudentAttemptDialog && (
              <div className="space-y-6">
                <DialogHeader>
                  <DialogTitle className="text-2xl">Student Attempt Details</DialogTitle>
                  <DialogDescription>
                    {viewStudentAttemptDialog.quizTitle} - {viewStudentAttemptDialog.courseTitle}
                  </DialogDescription>
                </DialogHeader>

                {/* Student Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="p-4 gradient-card border-border">
                    <div className="text-xs text-muted-foreground mb-1">Student</div>
                    <div className="text-lg font-bold">{viewStudentAttemptDialog.studentName}</div>
                    <div className="text-xs text-muted-foreground">{viewStudentAttemptDialog.studentEmail}</div>
                  </Card>
                  <Card className="p-4 gradient-card border-border">
                    <div className="text-xs text-muted-foreground mb-1">Score</div>
                    <div className={`text-2xl font-bold ${viewStudentAttemptDialog.score >= 80 ? 'text-green-500' : viewStudentAttemptDialog.score >= 60 ? 'text-blue-500' : 'text-orange-500'}`}>
                      {viewStudentAttemptDialog.score}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {viewStudentAttemptDialog.totalPointsEarned}/{viewStudentAttemptDialog.totalMaxPoints} points
                    </div>
                  </Card>
                  <Card className="p-4 gradient-card border-border">
                    <div className="text-xs text-muted-foreground mb-1">Status</div>
                    <Badge variant={viewStudentAttemptDialog.isPassed ? "default" : "destructive"} className="mt-1">
                      {viewStudentAttemptDialog.isPassed ? "Passed" : "Failed"}
                    </Badge>
                  </Card>
                  <Card className="p-4 gradient-card border-border">
                    <div className="text-xs text-muted-foreground mb-1">Submitted</div>
                    <div className="text-sm font-medium">
                      {new Date(viewStudentAttemptDialog.submittedAt).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(viewStudentAttemptDialog.submittedAt).toLocaleTimeString()}
                    </div>
                  </Card>
                </div>

                {/* Question Breakdown */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Question Breakdown ({viewStudentAttemptDialog.questionAttempts.length} questions)
                  </h4>
                  
                  {viewStudentAttemptDialog.questionAttempts.map((question) => (
                    <Card key={question.questionId} className="p-4 gradient-card border-border">
                      <div className="space-y-3">
                        {/* Question Header */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="text-xs">
                                Q{question.questionNumber}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {question.questionType === 'mcq' ? 'Multiple Choice' : 
                                 question.questionType === 'true_false' ? 'True/False' : 
                                 question.questionType === 'matching' ? 'Matching' :
                                 'Short Answer'}
                              </Badge>
                              {question.isCorrect !== null && (
                                <Badge variant={question.isCorrect ? "default" : "destructive"} className="text-xs">
                                  {question.isCorrect ? 'Correct' : 'Incorrect'}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-xl font-bold ${question.pointsEarned === question.maxPoints ? 'text-green-500' : question.pointsEarned > 0 ? 'text-blue-500' : 'text-orange-500'}`}>
                              {question.pointsEarned}/{question.maxPoints}
                            </div>
                            <div className="text-xs text-muted-foreground">points</div>
                          </div>
                        </div>

                        {/* Question Text */}
                        {question.questionText && (
                          <div className="p-3 bg-blue-950/20 border border-blue-500/30 rounded-lg">
                            <div className="text-xs font-semibold text-blue-400 mb-1">Question:</div>
                            <div className="text-sm text-foreground font-medium">{question.questionText}</div>
                          </div>
                        )}

                        {/* Options (only for MCQ and True/False) */}
                        {(() => {
                          const qType = (question.questionType || '').toLowerCase().replace(/[_-]/g, '');
                          const isMCQ = qType === 'mcq' || qType === 'multiplechoice';
                          const isTrueFalse = qType === 'truefalse';
                          const hasOptions = question.options && Array.isArray(question.options) && question.options.length > 0;
                          
                          console.log('Options display check:', {
                            questionId: question.questionId,
                            questionType: question.questionType,
                            normalizedType: qType,
                            isMCQ,
                            isTrueFalse,
                            hasOptions,
                            optionsLength: question.options?.length,
                            options: question.options
                          });
                          
                          return (isMCQ || isTrueFalse) && hasOptions ? (
                            <div className="p-3 bg-muted/20 rounded-lg">
                              <div className="text-xs font-semibold text-muted-foreground mb-2">Available Options:</div>
                              <ul className="space-y-1">
                                {question.options.map((option: any, idx: number) => (
                                  <li key={idx} className="text-sm flex items-start gap-2">
                                    <span className="text-muted-foreground">•</span>
                                    <span>{typeof option === 'string' ? option : option.text || option.value || String(option)}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null;
                        })()}

                        {/* Matching Question Pairs */}
                        {(() => {
                          if (question.questionType !== 'matching') return null;
                          
                          let pairsToDisplay = [];
                          if (Array.isArray(question.correctAnswer)) {
                            pairsToDisplay = question.correctAnswer;
                          } else if (typeof question.correctAnswer === 'string') {
                            try {
                              const parsed = JSON.parse(question.correctAnswer);
                              if (Array.isArray(parsed)) {
                                pairsToDisplay = parsed;
                              }
                            } catch (e) {
                              console.error('Failed to parse correctAnswer:', e);
                            }
                          }
                          
                          if (pairsToDisplay.length === 0) return null;
                          
                          return (
                            <div className="p-4 rounded-lg border border-border bg-muted/5">
                              <div className="text-xs font-semibold text-muted-foreground mb-3">Expected Pairs:</div>
                              <div className="space-y-3">
                                {pairsToDisplay.map((pair: any, idx: number) => (
                                  <div key={idx} className="relative">
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
                            </div>
                          );
                        })()}

                        {/* Student Answer */}
                        <div className="p-3 bg-muted/30 rounded-lg">
                          <div className="text-xs font-semibold text-muted-foreground mb-1">Student Answer:</div>
                          <div className="text-sm">
                            {(() => {
                              if (question.questionType === 'matching') {
                                let pairsToDisplay = [];
                                if (Array.isArray(question.studentAnswer)) {
                                  pairsToDisplay = question.studentAnswer;
                                } else if (typeof question.studentAnswer === 'string') {
                                  try {
                                    const parsed = JSON.parse(question.studentAnswer);
                                    if (Array.isArray(parsed)) {
                                      pairsToDisplay = parsed;
                                    }
                                  } catch (e) {
                                    return String(question.studentAnswer);
                                  }
                                }
                                
                                if (pairsToDisplay.length > 0) {
                                  return (
                                    <div className="space-y-3 mt-2">
                                      {pairsToDisplay.map((pair: any, idx: number) => (
                                        <div key={idx} className="relative">
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
                                }
                              }
                              return String(question.studentAnswer);
                            })()}
                          </div>
                        </div>

                        {/* Feedback (if available) */}
                        {question.feedback && (
                          <div className="p-3 bg-blue-950/20 border border-blue-500/30 rounded-lg">
                            <div className="text-xs font-semibold text-blue-400 mb-1">Instructor Feedback:</div>
                            <div className="text-sm text-blue-300">{question.feedback}</div>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Close Button */}
                <div className="flex justify-end pt-4 border-t border-border">
                  <Button onClick={() => setViewStudentAttemptDialog(null)}>
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default Assessments;
