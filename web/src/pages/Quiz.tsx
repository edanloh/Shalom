import { useState, useMemo, useEffect, useRef } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Search,
  FileText,
  CheckCircle,
  Clock,
  X,
  ChevronDown,
  BookOpen,
  Layers,
  Loader2,
  AlertCircle,
  TrendingUp,
  Users,
  Target,
  BarChart3,
  Edit2,
  Download,
  Filter,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Pagination } from "@/components/Pagination";
import {
  courseService,
  Course,
  quizService,
  QuestionGrading,
  AnswerVariation,
  QuizResultsStats,
  StudentAttemptDetails,
} from "@/services";
import moduleService from "@/services/moduleService";
import { useUser } from "@/contexts/useUser";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Colors } from "@/constants/Colors";

type TabId = "grading" | "variations" | "library";
type VarViewMode = "all" | "graded" | "ungraded";
type GradingSortBy = "pending" | "oldest";

type VariationRowProps = {
  question: QuestionGrading;
  variation: AnswerVariation;
  vIndex: number;
  withGrading: boolean;
  isSubmittingGrade: boolean;
  state: { points: string; feedback: string };
  updateGradingState: (
    qId: string,
    vId: string,
    field: "points" | "feedback",
    value: string,
  ) => void;
  onGrade: (points: string, feedback: string) => void;
};

const VariationRow = ({
  question,
  variation,
  vIndex,
  withGrading,
  isSubmittingGrade,
  state,
  updateGradingState,
  onGrade,
}: VariationRowProps) => {
  const [pointsInput, setPointsInput] = useState(state.points ?? "");
  const [feedbackInput, setFeedbackInput] = useState(state.feedback ?? "");
  const feedbackRef = useRef<HTMLTextAreaElement | null>(null);

  const resizeFeedback = () => {
    const el = feedbackRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  useEffect(() => {
    setPointsInput(state.points ?? "");
    setFeedbackInput(state.feedback ?? "");
  }, [
    state.points,
    state.feedback,
    question.questionId,
    variation.variationId,
  ]);

  useEffect(() => {
    resizeFeedback();
  }, [feedbackInput]);

  return (
    <div
      className={`px-4 py-3 border-b border-border last:border-0 ${
        variation.isGraded
          ? "bg-green-50/30 dark:bg-green-950/10"
          : "bg-amber-50/30 dark:bg-amber-950/10"
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-xs font-mono text-muted-foreground pt-1 min-w-[20px]">
          V{vIndex + 1}
        </span>
        <div className="flex-1 min-w-0 space-y-2">
          <div
            className={`px-3 py-2 rounded-lg text-sm border ${
              variation.isGraded
                ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-900 dark:text-green-100"
                : "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100"
            }`}
          >
            {variation.answerText}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs">
              {variation.studentCount} student
              {variation.studentCount !== 1 ? "s" : ""}
            </Badge>
            {variation.isGraded ? (
              <Badge className="bg-green-600 text-xs gap-1">
                <CheckCircle className="h-3 w-3" />
                {variation.gradedPoints} / {question.maxPoints} pts
              </Badge>
            ) : (
              <Badge
                variant="secondary"
                className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 text-xs"
              >
                Ungraded
              </Badge>
            )}
          </div>
          {withGrading && (
            <div className="flex flex-nowrap gap-2 items-center pt-1">
              <div className="flex items-center gap-2 flex-shrink-0">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">
                  Points (/{question.maxPoints})
                </Label>
                <Input
                  type="number"
                  min="0"
                  max={question.maxPoints}
                  value={pointsInput}
                  onChange={(e) => setPointsInput(e.target.value)}
                  onBlur={() =>
                    updateGradingState(
                      question.questionId,
                      variation.variationId,
                      "points",
                      pointsInput,
                    )
                  }
                  className="w-20 h-8 text-sm text-center font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">
                  Feedback
                </Label>
                <Textarea
                  ref={feedbackRef}
                  value={feedbackInput}
                  onChange={(e) => setFeedbackInput(e.target.value)}
                  onInput={resizeFeedback}
                  onBlur={() =>
                    updateGradingState(
                      question.questionId,
                      variation.variationId,
                      "feedback",
                      feedbackInput,
                    )
                  }
                  placeholder="Feedback sent to students..."
                  rows={1}
                  className="text-sm resize-none min-h-[2rem] py-1 flex-1 overflow-hidden"
                />
              </div>
              <Button
                size="sm"
                disabled={
                  isSubmittingGrade || !String(pointsInput ?? "").trim()
                }
                onClick={() => onGrade(pointsInput, feedbackInput)}
                className="h-8 flex-shrink-0 gap-1"
              >
                {isSubmittingGrade ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <CheckCircle className="h-3 w-3" />
                )}
                Grade
              </Button>
            </div>
          )}
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer hover:text-foreground list-none flex items-center gap-1 select-none">
              <ChevronDown className="h-3 w-3" />
              Show {variation.studentCount} student
              {variation.studentCount !== 1 ? "s" : ""}
            </summary>
            <div className="mt-1 ml-3 space-y-0.5">
              {variation.students.map((s) => (
                <div key={s.attemptId}>· {s.studentName}</div>
              ))}
            </div>
          </details>
        </div>
      </div>
    </div>
  );
};

const Quiz = () => {
  // ── Navigation ────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabId>("grading");

  // ── Data ──────────────────────────────────────────────────────────────────────
  const [courses, setCourses] = useState<Course[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [questionGrading, setQuestionGrading] = useState<QuestionGrading[]>([]);
  const [isLoadingGrading, setIsLoadingGrading] = useState(false);
  const [isFetchingCourse, setIsFetchingCourse] = useState(false);

  // ── Grading Queue state ───────────────────────────────────────────────────────
  const [gradingState, setGradingState] = useState<
    Record<string, { points: string; feedback: string }>
  >({});
  const [isSubmittingGrade, setIsSubmittingGrade] = useState(false);
  const [expandedGradingQuizzes, setExpandedGradingQuizzes] = useState<
    Set<string>
  >(new Set());
  const [expandedGradingQuestions, setExpandedGradingQuestions] = useState<
    Set<string>
  >(new Set());
  const [gradingSortBy, setGradingSortBy] = useState<GradingSortBy>("pending");
  const [gradingSearch, setGradingSearch] = useState("");

  // ── Variations Library state ──────────────────────────────────────────────────
  const [varViewMode, setVarViewMode] = useState<VarViewMode>("all");
  const [varSearch, setVarSearch] = useState("");
  const [selectedVarCourse, setSelectedVarCourse] = useState<string>("all");
  const [selectedVarModule, setSelectedVarModule] = useState<string>("all");
  const [expandedVarCourses, setExpandedVarCourses] = useState<Set<string>>(
    new Set(),
  );
  const [expandedVarModules, setExpandedVarModules] = useState<Set<string>>(
    new Set(),
  );
  const [expandedVarQuizzes, setExpandedVarQuizzes] = useState<Set<string>>(
    new Set(),
  );
  const [expandedVarQuestions, setExpandedVarQuestions] = useState<Set<string>>(
    new Set(),
  );

  // ── Quiz Library state ────────────────────────────────────────────────────────
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [selectedModule, setSelectedModule] = useState<string>("");
  const [isCourseDialogOpen, setIsCourseDialogOpen] = useState(false);
  const [courseSearchQuery, setCourseSearchQuery] = useState("");
  const [libSearchQuery, setLibSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(9);

  // ── Dialogs ───────────────────────────────────────────────────────────────────
  const [viewQuestionDialog, setViewQuestionDialog] =
    useState<QuestionGrading | null>(null);
  const [viewQuizResultsDialog, setViewQuizResultsDialog] = useState<
    any | null
  >(null);
  const [quizResultsData, setQuizResultsData] =
    useState<QuizResultsStats | null>(null);
  const [isLoadingQuizResults, setIsLoadingQuizResults] = useState(false);
  const [viewStudentAttemptDialog, setViewStudentAttemptDialog] =
    useState<StudentAttemptDetails | null>(null);
  const [isLoadingStudentAttempt, setIsLoadingStudentAttempt] = useState(false);
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(
    new Set(),
  );
  const [showOnlyRetakers, setShowOnlyRetakers] = useState(false);

  const { toast } = useToast();
  const { user } = useUser();
  const navigate = useNavigate();

  // ── Fetch helpers ─────────────────────────────────────────────────────────────
  const fetchCourses = async () => {
    if (!user?.uuid) {
      setCourses([]);
      return;
    }
    try {
      const data = await courseService.getCourses({ instructorId: user.uuid });
      setCourses(data);
    } catch {
      toast({
        title: "Error",
        description: "Failed to load courses.",
        variant: "destructive",
      });
    }
  };

  const fetchCourseData = async () => {
    if (!selectedCourse) return;
    try {
      const data = await moduleService.getCourseModules(
        selectedCourse,
        user.uuid,
      );
      if (data) {
        setModules(data);
        const allQuizzes = data.flatMap((m: any) => m.quizzes || []);
        if (allQuizzes.length > 0) {
          const quizIds = allQuizzes.map((q: any) => q.id);
          const { data: attemptStats } = await supabase
            .from("quiz_attempts")
            .select("quiz_id, user_id, score")
            .in("quiz_id", quizIds);
          if (attemptStats) {
            const statsMap = new Map<
              string,
              { attemptCount: number; studentCount: number; totalScore: number }
            >();
            attemptStats.forEach((a: any) => {
              if (!statsMap.has(a.quiz_id))
                statsMap.set(a.quiz_id, {
                  attemptCount: 0,
                  studentCount: 0,
                  totalScore: 0,
                });
              statsMap.get(a.quiz_id)!.attemptCount++;
              const score = Number(a.score);
              if (Number.isFinite(score)) {
                statsMap.get(a.quiz_id)!.totalScore += score;
              }
            });
            quizIds.forEach((qid: string) => {
              const qa = attemptStats.filter((a: any) => a.quiz_id === qid);
              const unique = new Set(qa.map((a: any) => a.user_id)).size;
              if (statsMap.has(qid)) statsMap.get(qid)!.studentCount = unique;
              else if (qa.length > 0)
                statsMap.set(qid, {
                  attemptCount: qa.length,
                  studentCount: unique,
                  totalScore: qa.reduce((sum: number, a: any) => {
                    const score = Number(a.score);
                    return Number.isFinite(score) ? sum + score : sum;
                  }, 0),
                });
            });
            allQuizzes.forEach((quiz: any) => {
              const s = statsMap.get(quiz.id);
              quiz.attemptCount = s?.attemptCount || 0;
              quiz.studentCount = s?.studentCount || 0;
              quiz.avgScore =
                s && s.attemptCount > 0
                  ? Number((s.totalScore / s.attemptCount).toFixed(1))
                  : null;
            });
          }
        }
        setQuizzes(allQuizzes);
      } else {
        setModules([]);
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to load course details.",
        variant: "destructive",
      });
    }
  };

  const fetchPendingGrading = async () => {
    if (!user?.uuid) return;
    setIsLoadingGrading(true);
    try {
      const data = await quizService.getPendingGradingByQuestion(
        user.uuid,
        undefined,
        undefined,
      );
      setQuestionGrading(data);
      const pendingQuizIds = Array.from(
        new Set(
          data.filter((q) => q.totalPendingCount > 0).map((q) => q.quizId),
        ),
      ).slice(0, 3);
      setExpandedGradingQuizzes(new Set(pendingQuizIds));
    } catch {
      toast({
        title: "Error",
        description: "Failed to load grading queue.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingGrading(false);
    }
  };

  const fetchQuizResults = async (quizId: string) => {
    setIsLoadingQuizResults(true);
    try {
      setQuizResultsData(await quizService.getQuizResults(quizId));
    } catch {
      toast({
        title: "Error",
        description: "Failed to load quiz results.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingQuizResults(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [user?.uuid]);
  useEffect(() => {
    if (user?.uuid) fetchPendingGrading();
  }, [user?.uuid]);
  useEffect(() => {
    if (selectedCourse) {
      setIsFetchingCourse(true);
      fetchCourseData().finally(() => setIsFetchingCourse(false));
    }
  }, [selectedCourse, selectedModule]);
  useEffect(() => {
    if (viewQuizResultsDialog?.id) fetchQuizResults(viewQuizResultsDialog.id);
    else {
      setQuizResultsData(null);
      setShowOnlyRetakers(false);
    }
  }, [viewQuizResultsDialog]);

  // ── Grading helpers ───────────────────────────────────────────────────────────
  const getGradingKey = (qId: string, vId: string) => `${qId}-${vId}`;

  const getVariationGradingState = (
    question: QuestionGrading,
    variation: AnswerVariation,
  ) => {
    const key = getGradingKey(question.questionId, variation.variationId);
    return (
      gradingState[key] || {
        points:
          variation.isGraded && variation.gradedPoints !== null
            ? variation.gradedPoints.toString()
            : question.maxPoints.toString(),
        feedback:
          variation.isGraded && variation.gradedFeedback
            ? variation.gradedFeedback
            : "",
      }
    );
  };

  const updateGradingState = (
    qId: string,
    vId: string,
    field: "points" | "feedback",
    value: string,
  ) => {
    const key = getGradingKey(qId, vId);
    setGradingState((prev) => {
      const existing = prev[key] || { points: "", feedback: "" };
      return {
        ...prev,
        [key]: {
          points: existing.points ?? "",
          feedback: existing.feedback ?? "",
          [field]: value,
        },
      };
    });
  };

  const handleGradeVariation = async (
    question: QuestionGrading,
    variation: AnswerVariation,
    overrideState?: { points: string; feedback: string },
  ) => {
    const state =
      overrideState || getVariationGradingState(question, variation);
    const key = getGradingKey(question.questionId, variation.variationId);
    if (!state?.points) {
      toast({
        title: "Points required",
        description: "Please enter points to award.",
        variant: "destructive",
      });
      return;
    }
    const points = parseFloat(state.points);
    if (isNaN(points) || points < 0 || points > question.maxPoints) {
      toast({
        title: "Invalid points",
        description: `Must be 0–${question.maxPoints}`,
        variant: "destructive",
      });
      return;
    }
    setIsSubmittingGrade(true);
    try {
      await quizService.gradeAnswerVariation({
        attemptIds: variation.students.map((s) => s.attemptId),
        questionId: question.questionId,
        pointsAwarded: points,
        feedback: state.feedback?.trim() || undefined,
        releaseGrades: true,
      });
      toast({
        title: variation.isGraded ? "Re-graded" : "Graded",
        description: `${variation.studentCount} student${variation.studentCount !== 1 ? "s" : ""} graded — ${points}/${question.maxPoints} pts`,
      });
      setGradingState((prev) => {
        const n = { ...prev };
        delete n[key];
        return n;
      });
      fetchPendingGrading();
    } catch {
      toast({
        title: "Error",
        description: "Failed to submit grade.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingGrade(false);
    }
  };

  // ── Toggle helper ─────────────────────────────────────────────────────────────
  const toggleSet = (
    setter: React.Dispatch<React.SetStateAction<Set<string>>>,
    id: string,
  ) =>
    setter((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });

  // ── Computed: Grading Queue (pending only) ────────────────────────────────────
  const pendingGrading = useMemo(() => {
    const sq = gradingSearch.trim().toLowerCase();
    return questionGrading
      .filter((q) => q.totalPendingCount > 0)
      .filter(
        (q) =>
          !sq ||
          (q.questionText || "").toLowerCase().includes(sq) ||
          (q.quizTitle || "").toLowerCase().includes(sq) ||
          (q.moduleTitle || "").toLowerCase().includes(sq) ||
          (q.courseTitle || "").toLowerCase().includes(sq),
      );
  }, [questionGrading, gradingSearch]);

  const pendingGroupedByQuiz = useMemo(() => {
    const groups = new Map<string, any>();
    pendingGrading.forEach((q) => {
      if (!groups.has(q.quizId))
        groups.set(q.quizId, {
          quizId: q.quizId,
          quizTitle: q.quizTitle,
          courseTitle: q.courseTitle,
          moduleTitle: q.moduleTitle,
          questions: [],
          totalPending: 0,
          oldestSubmission: Infinity,
        });
      const g = groups.get(q.quizId)!;
      g.questions.push(q);
      g.totalPending += q.totalPendingCount;
      const pendingVars = q.variations.filter((v) => !v.isGraded);
      if (pendingVars.length > 0) {
        const oldest = Math.min(
          ...pendingVars.flatMap((v) =>
            v.students.map((s) => new Date(s.submittedAt).getTime()),
          ),
        );
        if (oldest < g.oldestSubmission) g.oldestSubmission = oldest;
      }
    });
    return Array.from(groups.values()).sort((a, b) =>
      gradingSortBy === "oldest"
        ? a.oldestSubmission - b.oldestSubmission
        : b.totalPending - a.totalPending,
    );
  }, [pendingGrading, gradingSortBy]);

  const gradingTotals = useMemo(
    () => ({
      pending: questionGrading.reduce((s, q) => s + q.totalPendingCount, 0),
      quizzes: new Set(
        questionGrading
          .filter((q) => q.totalPendingCount > 0)
          .map((q) => q.quizId),
      ).size,
      questions: questionGrading.filter((q) => q.totalPendingCount > 0).length,
    }),
    [questionGrading],
  );

  // ── Computed: Variations Library — Course > Module > Quiz > Question ──────────
  const varGroupedByCourse = useMemo(() => {
    const courseMap = new Map<string, any>();
    questionGrading.forEach((q) => {
      const cId = q.courseId;
      const mId = q.moduleId || "unknown";
      const mTitle = q.moduleTitle || "Unknown module";
      if (!courseMap.has(cId))
        courseMap.set(cId, {
          courseId: cId,
          courseTitle: q.courseTitle,
          modules: new Map(),
        });
      const course = courseMap.get(cId)!;
      if (!course.modules.has(mId))
        course.modules.set(mId, {
          moduleId: mId,
          moduleTitle: mTitle,
          quizzes: new Map(),
        });
      const mod = course.modules.get(mId)!;
      if (!mod.quizzes.has(q.quizId))
        mod.quizzes.set(q.quizId, {
          quizId: q.quizId,
          quizTitle: q.quizTitle,
          questions: [],
        });
      mod.quizzes.get(q.quizId)!.questions.push(q);
    });
    return Array.from(courseMap.values()).map((c) => ({
      ...c,
      modules: Array.from(c.modules.values()).map((m: any) => ({
        ...m,
        quizzes: Array.from(m.quizzes.values()),
      })),
    }));
  }, [questionGrading]);

  const filteredVarTree = useMemo(() => {
    const sq = varSearch.trim().toLowerCase();
    return varGroupedByCourse
      .filter(
        (c) => selectedVarCourse === "all" || c.courseId === selectedVarCourse,
      )
      .map((course) => ({
        ...course,
        modules: course.modules
          .filter(
            (m: any) =>
              selectedVarModule === "all" || m.moduleId === selectedVarModule,
          )
          .map((mod: any) => ({
            ...mod,
            quizzes: mod.quizzes
              .map((quiz: any) => ({
                ...quiz,
                questions: quiz.questions
                  .map((q: QuestionGrading) => ({
                    ...q,
                    variations: q.variations.filter((v: AnswerVariation) => {
                      const modeOk =
                        varViewMode === "all" ||
                        (varViewMode === "graded" ? v.isGraded : !v.isGraded);
                      const searchOk =
                        !sq ||
                        (v.answerText || "").toLowerCase().includes(sq) ||
                        (q.questionText || "").toLowerCase().includes(sq) ||
                        (quiz.quizTitle || "").toLowerCase().includes(sq) ||
                        (mod.moduleTitle || "").toLowerCase().includes(sq) ||
                        (course.courseTitle || "").toLowerCase().includes(sq);
                      return modeOk && searchOk;
                    }),
                  }))
                  .filter((q: any) => q.variations.length > 0),
              }))
              .filter((quiz: any) => quiz.questions.length > 0),
          }))
          .filter((m: any) => m.quizzes.length > 0),
      }))
      .filter((c) => c.modules.length > 0);
  }, [
    varGroupedByCourse,
    varViewMode,
    varSearch,
    selectedVarCourse,
    selectedVarModule,
  ]);

  const varCourseOptions = useMemo(
    () =>
      varGroupedByCourse.map((c) => ({ id: c.courseId, title: c.courseTitle })),
    [varGroupedByCourse],
  );
  const varModuleOptions = useMemo(() => {
    if (selectedVarCourse === "all") {
      const all = varGroupedByCourse.flatMap((c) =>
        c.modules.map((m: any) => ({ id: m.moduleId, title: m.moduleTitle })),
      );
      return Array.from(new Map(all.map((m) => [m.id, m])).values());
    }
    return (
      varGroupedByCourse
        .find((c) => c.courseId === selectedVarCourse)
        ?.modules.map((m: any) => ({ id: m.moduleId, title: m.moduleTitle })) ||
      []
    );
  }, [varGroupedByCourse, selectedVarCourse]);

  const varTotals = useMemo(() => {
    const all = questionGrading.flatMap((q) => q.variations);
    return {
      total: all.length,
      graded: all.filter((v) => v.isGraded).length,
      ungraded: all.filter((v) => !v.isGraded).length,
    };
  }, [questionGrading]);

  // ── Computed: Quiz Library ────────────────────────────────────────────────────
  const filteredQuizzes = useMemo(
    () =>
      quizzes.filter((q) =>
        q.title.toLowerCase().includes(libSearchQuery.toLowerCase()),
      ),
    [quizzes, libSearchQuery],
  );
  const selectedCourseData = courses.find((c) => c.id === selectedCourse);

  // ── Export ────────────────────────────────────────────────────────────────────
  const handleExportResults = () => {
    if (!quizResultsData) return;
    const csv = [
      [
        "Student Name",
        "Email",
        "Score (%)",
        "Status",
        "Attempts",
        "Last Attempt",
      ],
      ...quizResultsData.studentScores.map((s) => [
        s.studentName,
        s.studentEmail,
        s.score,
        s.status,
        s.attempts,
        s.lastAttemptDate,
      ]),
    ]
      .map((r) => r.map((c) => `"${c}"`).join(","))
      .join("\n");
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(
        new Blob([csv], { type: "text/csv;charset=utf-8;" }),
      ),
      download: `${quizResultsData.quizTitle.replace(/\s+/g, "_")}_results.csv`,
      style: "visibility:hidden",
    });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast({
      title: "Exported",
      description: `${quizResultsData.studentScores.length} students exported`,
    });
  };

  const handleViewStudentAttempt = async (student: any) => {
    setIsLoadingStudentAttempt(true);
    try {
      let attemptId = student.lastAttemptId;
      if (!attemptId) {
        const r = await quizService.getStudentLatestAttempt(
          viewQuizResultsDialog.id,
          student.studentId,
        );
        attemptId = r.attemptId;
      }
      if (!attemptId) throw new Error("No attempt ID found");
      setViewStudentAttemptDialog(
        await quizService.getStudentAttemptDetails(attemptId),
      );
    } catch (e: any) {
      toast({
        title: "Error",
        description: `Failed to load attempt: ${e.message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoadingStudentAttempt(false);
    }
  };

  // ── Shared components ─────────────────────────────────────────────────────────
  const ChevIcon = ({ open }: { open: boolean }) => (
    <ChevronDown
      className={`h-4 w-4 text-muted-foreground transition-transform flex-shrink-0 ${open ? "rotate-180" : ""}`}
    />
  );

  const parseMaybeJson = (value: any): any => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    if (!trimmed) return value;
    if (
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]"))
    ) {
      try {
        return JSON.parse(trimmed);
      } catch {
        return value;
      }
    }
    return value;
  };

  const normalizeOptionText = (option: any): string => {
    if (typeof option === "string") return option;
    if (typeof option === "number" || typeof option === "boolean")
      return String(option);
    if (option && typeof option === "object") {
      if (typeof option.option_text === "string") return option.option_text;
      if (typeof option.text === "string") return option.text;
      if (typeof option.label === "string") return option.label;
      if (typeof option.value === "string") return option.value;
    }
    return String(option ?? "");
  };

  const getOptionTexts = (q: any): string[] => {
    const parsed = parseMaybeJson(q?.options);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((opt) => normalizeOptionText(opt).trim()).filter(Boolean);
  };

  const normalizeCompare = (value: string) => value.trim().toLowerCase();

  const resolveAnswerToken = (token: any, q: any): string => {
    const questionType = String(q?.questionType || "").toLowerCase();
    const options = getOptionTexts(q);

    if (questionType === "true-false") {
      if (
        token === true ||
        token === 1 ||
        token === "1" ||
        String(token).toLowerCase() === "true"
      )
        return "True";
      if (
        token === false ||
        token === 0 ||
        token === "0" ||
        String(token).toLowerCase() === "false"
      )
        return "False";
    }

    if (
      typeof token === "number" &&
      Number.isInteger(token) &&
      options[token] !== undefined
    ) {
      return options[token];
    }

    if (typeof token === "string") {
      const trimmed = token.trim();
      if (/^\d+$/.test(trimmed)) {
        const idx = Number(trimmed);
        if (options[idx] !== undefined) return options[idx];
      }
      return trimmed;
    }

    if (token && typeof token === "object") {
      return normalizeOptionText(token).trim();
    }

    return String(token ?? "").trim();
  };

  const answerToLines = (value: any, q: any): string[] => {
    const questionType = String(q?.questionType || "").toLowerCase();
    const parsed = parseMaybeJson(value);

    if (questionType === "matching") {
      if (Array.isArray(parsed)) {
        return parsed
          .map((pair) => {
            if (pair && typeof pair === "object") {
              const left = String(pair.left ?? pair.source ?? "").trim();
              const right = String(pair.right ?? pair.target ?? "").trim();
              if (left || right) return `${left} -> ${right}`.trim();
            }
            return "";
          })
          .filter(Boolean);
      }
      if (parsed && typeof parsed === "object") {
        return Object.entries(parsed)
          .map(([left, right]) =>
            `${String(left).trim()} -> ${String(right ?? "").trim()}`.trim(),
          )
          .filter(Boolean);
      }
    }

    if (Array.isArray(parsed)) {
      return parsed.map((item) => resolveAnswerToken(item, q)).filter(Boolean);
    }

    if (
      parsed === null ||
      parsed === undefined ||
      String(parsed).trim() === ""
    ) {
      return [];
    }

    return [resolveAnswerToken(parsed, q)].filter(Boolean);
  };

  const isOptionBasedQuestionType = (questionType: string) =>
    ["multiple-choice", "multiple-correct", "true-false"].includes(
      questionType,
    );

  const getMatchingPairs = (
    value: any,
  ): Array<{ left: string; right: string }> => {
    const parsed = parseMaybeJson(value);

    if (Array.isArray(parsed)) {
      return parsed
        .map((pair) => {
          if (!pair || typeof pair !== "object") return null;
          const left = String(
            (pair as any).left ?? (pair as any).source ?? "",
          ).trim();
          const right = String(
            (pair as any).right ?? (pair as any).target ?? "",
          ).trim();
          if (!left && !right) return null;
          return { left, right };
        })
        .filter((pair): pair is { left: string; right: string } => !!pair);
    }

    if (parsed && typeof parsed === "object") {
      return Object.entries(parsed)
        .map(([left, right]) => ({
          left: String(left ?? "").trim(),
          right: String(right ?? "").trim(),
        }))
        .filter((pair) => pair.left || pair.right);
    }

    return [];
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-6 py-8 space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold">Quiz center</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Grade pending submissions, review answer variations, and track quiz
            performance
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-border">
          <div className="flex">
            {[
              {
                id: "grading" as TabId,
                label: "Grading queue",
                badge:
                  gradingTotals.pending > 0
                    ? {
                        count: gradingTotals.pending,
                        color: "bg-destructive/15 text-destructive",
                      }
                    : null,
              },
              {
                id: "variations" as TabId,
                label: "Variations library",
                badge:
                  varTotals.ungraded > 0
                    ? {
                        count: varTotals.ungraded,
                        color:
                          "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
                      }
                    : null,
              },
              { id: "library" as TabId, label: "Quiz library", badge: null },
            ].map(({ id, label, badge }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`px-5 py-3 text-sm border-b-2 -mb-px transition-colors ${
                  activeTab === id
                    ? "border-foreground text-foreground font-medium"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
                {badge && (
                  <span
                    className={`ml-2 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full text-[11px] font-medium ${badge.color}`}
                  >
                    {badge.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            TAB 1 — GRADING QUEUE (pending submissions only)
        ══════════════════════════════════════════════ */}
        {activeTab === "grading" && (
          <div className="space-y-4">
            {isLoadingGrading ? (
              <Card className="p-12 text-center border-border">
                <Loader2 className="h-9 w-9 animate-spin text-primary mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Loading grading queue…
                </p>
              </Card>
            ) : (
              <>
                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    {
                      label: "Pending submissions",
                      value: gradingTotals.pending,
                      warn: gradingTotals.pending > 0,
                    },
                    { label: "Quizzes affected", value: gradingTotals.quizzes },
                    {
                      label: "Questions to grade",
                      value: gradingTotals.questions,
                    },
                  ].map((s) => (
                    <Card key={s.label} className="p-4 border-border">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        {s.label}
                      </p>
                      <p
                        className={`text-3xl font-semibold mt-1 ${s.warn ? "text-amber-500" : "text-foreground"}`}
                      >
                        {s.value}
                      </p>
                    </Card>
                  ))}
                </div>

                {gradingTotals.pending === 0 ? (
                  <Card className="p-14 text-center border-border">
                    <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
                      <CheckCircle className="h-7 w-7 text-green-500" />
                    </div>
                    <h3 className="text-lg font-semibold mb-1">
                      All caught up
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      No pending submissions to grade right now.
                    </p>
                  </Card>
                ) : (
                  <>
                    {/* Toolbar */}
                    <div className="flex gap-3 items-center flex-wrap">
                      <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          value={gradingSearch}
                          onChange={(e) => setGradingSearch(e.target.value)}
                          placeholder="Search by question, quiz, module, or course…"
                          className="pl-9 h-9"
                        />
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-sm text-muted-foreground">
                          Sort:
                        </span>
                        <select
                          value={gradingSortBy}
                          onChange={(e) =>
                            setGradingSortBy(e.target.value as GradingSortBy)
                          }
                          className="h-9 px-3 rounded-md bg-background border border-border text-sm text-foreground"
                        >
                          <option value="pending">Most pending first</option>
                          <option value="oldest">
                            Oldest submission first
                          </option>
                        </select>
                      </div>
                    </div>

                    {pendingGroupedByQuiz.length === 0 ? (
                      <Card className="p-10 text-center border-border">
                        <p className="text-sm text-muted-foreground">
                          No results match "{gradingSearch}"
                        </p>
                      </Card>
                    ) : (
                      <div className="space-y-3">
                        {pendingGroupedByQuiz.map((quizGroup) => (
                          <div
                            key={quizGroup.quizId}
                            className="border border-border rounded-xl overflow-hidden"
                          >
                            {/* Quiz header */}
                            <button
                              onClick={() =>
                                toggleSet(
                                  setExpandedGradingQuizzes,
                                  quizGroup.quizId,
                                )
                              }
                              className="w-full flex items-start gap-3 p-4 bg-muted/20 hover:bg-muted/40 transition-colors text-left border-l-4 border-primary"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold">
                                  {quizGroup.quizTitle}
                                </p>
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1 flex-wrap">
                                  <BookOpen className="h-3 w-3" />
                                  {quizGroup.courseTitle}
                                  {quizGroup.moduleTitle && (
                                    <>
                                      <span>›</span>
                                      <span>{quizGroup.moduleTitle}</span>
                                    </>
                                  )}
                                  <span>
                                    · {quizGroup.questions.length} question
                                    {quizGroup.questions.length !== 1
                                      ? "s"
                                      : ""}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <Badge
                                  variant="destructive"
                                  className="text-xs"
                                >
                                  {quizGroup.totalPending} pending
                                </Badge>
                                <ChevIcon
                                  open={expandedGradingQuizzes.has(
                                    quizGroup.quizId,
                                  )}
                                />
                              </div>
                            </button>

                            {/* Questions */}
                            {expandedGradingQuizzes.has(quizGroup.quizId) && (
                              <div className="divide-y divide-border bg-background">
                                {quizGroup.questions.map(
                                  (question: QuestionGrading, qIdx: number) => {
                                    const pendingVars =
                                      question.variations.filter(
                                        (v: AnswerVariation) => !v.isGraded,
                                      );
                                    return (
                                      <div key={question.questionId}>
                                        <button
                                          onClick={() =>
                                            toggleSet(
                                              setExpandedGradingQuestions,
                                              question.questionId,
                                            )
                                          }
                                          className="w-full flex items-start gap-3 px-4 py-3 hover:bg-muted/20 transition-colors text-left"
                                        >
                                          <div className="min-w-[26px] h-6 rounded bg-muted flex items-center justify-center text-xs font-mono font-medium text-muted-foreground flex-shrink-0 mt-0.5">
                                            Q{qIdx + 1}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm">
                                              {question.questionText}
                                            </p>
                                            {question.questionExplanation && (
                                              <p className="text-xs text-muted-foreground mt-0.5 italic">
                                                Guideline:{" "}
                                                {question.questionExplanation}
                                              </p>
                                            )}
                                            <div className="flex gap-2 mt-1.5 flex-wrap">
                                              <Badge
                                                variant="outline"
                                                className="text-xs"
                                              >
                                                {question.maxPoints} pt
                                                {question.maxPoints !== 1
                                                  ? "s"
                                                  : ""}
                                              </Badge>
                                              <Badge
                                                variant="secondary"
                                                className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 text-xs"
                                              >
                                                {pendingVars.length} variation
                                                {pendingVars.length !== 1
                                                  ? "s"
                                                  : ""}{" "}
                                                to grade
                                              </Badge>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2 flex-shrink-0">
                                            <button
                                              className="text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-2 py-1 transition-colors"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setViewQuestionDialog(question);
                                              }}
                                            >
                                              View
                                            </button>
                                            <ChevIcon
                                              open={expandedGradingQuestions.has(
                                                question.questionId,
                                              )}
                                            />
                                          </div>
                                        </button>

                                        {expandedGradingQuestions.has(
                                          question.questionId,
                                        ) && (
                                          <div className="bg-background border-t border-border">
                                            {question.sampleAnswer && (
                                              <div className="mx-4 mt-3 mb-1 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                                                <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1">
                                                  Expected answer
                                                </p>
                                                <p className="text-sm text-green-900 dark:text-green-100 whitespace-pre-wrap">
                                                  {question.sampleAnswer}
                                                </p>
                                              </div>
                                            )}
                                            {pendingVars.map(
                                              (
                                                v: AnswerVariation,
                                                vi: number,
                                              ) => (
                                                <VariationRow
                                                  key={v.variationId}
                                                  question={question}
                                                  variation={v}
                                                  vIndex={vi}
                                                  withGrading
                                                  isSubmittingGrade={
                                                    isSubmittingGrade
                                                  }
                                                  state={getVariationGradingState(
                                                    question,
                                                    v,
                                                  )}
                                                  updateGradingState={
                                                    updateGradingState
                                                  }
                                                  onGrade={(points, feedback) =>
                                                    handleGradeVariation(
                                                      question,
                                                      v,
                                                      { points, feedback },
                                                    )
                                                  }
                                                />
                                              ),
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  },
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════
            TAB 2 — VARIATIONS LIBRARY
            Course > Module > Quiz > Question > Variations
        ══════════════════════════════════════════════ */}
        {activeTab === "variations" && (
          <div className="space-y-4">
            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Total variations", value: varTotals.total },
                { label: "Graded", value: varTotals.graded },
                {
                  label: "Ungraded",
                  value: varTotals.ungraded,
                  warn: varTotals.ungraded > 0,
                },
              ].map((s) => (
                <Card key={s.label} className="p-4 border-border">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    {s.label}
                  </p>
                  <p
                    className={`text-3xl font-semibold mt-1 ${s.warn ? "text-amber-500" : "text-foreground"}`}
                  >
                    {s.value}
                  </p>
                </Card>
              ))}
            </div>

            {/* Filters */}
            <div className="flex gap-3 flex-wrap items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={varSearch}
                  onChange={(e) => setVarSearch(e.target.value)}
                  placeholder="Search answer text, question, quiz, module, or course…"
                  className="pl-9 h-9"
                />
              </div>
              <select
                value={selectedVarCourse}
                onChange={(e) => {
                  setSelectedVarCourse(e.target.value);
                  setSelectedVarModule("all");
                }}
                className="h-9 px-3 rounded-md bg-background border border-border text-sm text-foreground"
              >
                <option value="all">All courses</option>
                {varCourseOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
              <select
                value={selectedVarModule}
                onChange={(e) => setSelectedVarModule(e.target.value)}
                disabled={varModuleOptions.length === 0}
                className="h-9 px-3 rounded-md bg-background border border-border text-sm text-foreground disabled:opacity-50"
              >
                <option value="all">All modules</option>
                {varModuleOptions.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </select>
              <div className="flex gap-1">
                {(["all", "graded", "ungraded"] as VarViewMode[]).map((m) => (
                  <Button
                    key={m}
                    size="sm"
                    variant={varViewMode === m ? "default" : "outline"}
                    onClick={() => setVarViewMode(m)}
                    className="h-9 capitalize"
                  >
                    {m}
                  </Button>
                ))}
              </div>
            </div>

            {filteredVarTree.length === 0 ? (
              <Card className="p-12 text-center border-border">
                <div className="w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-3">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-1">No variations found</h3>
                <p className="text-sm text-muted-foreground">
                  Adjust your filters or search query.
                </p>
              </Card>
            ) : (
              <div className="space-y-2">
                {filteredVarTree.map((course) => (
                  <div
                    key={course.courseId}
                    className="border border-border rounded-xl overflow-hidden"
                  >
                    {/* Course */}
                    <button
                      onClick={() =>
                        toggleSet(setExpandedVarCourses, course.courseId)
                      }
                      className="w-full flex items-center gap-3 px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                    >
                      <BookOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="flex-1 font-semibold text-sm">
                        {course.courseTitle}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {course.modules.length} module
                        {course.modules.length !== 1 ? "s" : ""}
                      </Badge>
                      <ChevIcon
                        open={expandedVarCourses.has(course.courseId)}
                      />
                    </button>

                    {expandedVarCourses.has(course.courseId) && (
                      <div className="divide-y divide-border">
                        {course.modules.map((mod: any) => (
                          <div key={mod.moduleId}>
                            {/* Module */}
                            <button
                              onClick={() =>
                                toggleSet(setExpandedVarModules, mod.moduleId)
                              }
                              className="w-full flex items-center gap-3 px-6 py-2.5 bg-muted/10 hover:bg-muted/25 transition-colors text-left"
                            >
                              <Layers className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                              <span className="flex-1 text-sm font-medium text-muted-foreground">
                                {mod.moduleTitle}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {mod.quizzes.length} quiz
                                {mod.quizzes.length !== 1 ? "zes" : ""}
                              </Badge>
                              <ChevIcon
                                open={expandedVarModules.has(mod.moduleId)}
                              />
                            </button>

                            {expandedVarModules.has(mod.moduleId) && (
                              <div className="divide-y divide-border">
                                {mod.quizzes.map((quiz: any) => {
                                  const allVars = quiz.questions.flatMap(
                                    (q: QuestionGrading) => q.variations,
                                  );
                                  const graded = allVars.filter(
                                    (v: AnswerVariation) => v.isGraded,
                                  ).length;
                                  const ungraded = allVars.length - graded;
                                  return (
                                    <div key={quiz.quizId}>
                                      {/* Quiz */}
                                      <button
                                        onClick={() =>
                                          toggleSet(
                                            setExpandedVarQuizzes,
                                            quiz.quizId,
                                          )
                                        }
                                        className="w-full flex items-center gap-3 px-8 py-2.5 bg-background hover:bg-muted/15 transition-colors text-left border-l-2 border-primary/30"
                                      >
                                        <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                        <span className="flex-1 text-sm font-medium">
                                          {quiz.quizTitle}
                                        </span>
                                        <div className="flex gap-1.5">
                                          <Badge className="bg-green-600 text-xs">
                                            {graded} graded
                                          </Badge>
                                          {ungraded > 0 && (
                                            <Badge className="bg-amber-500 text-xs">
                                              {ungraded} ungraded
                                            </Badge>
                                          )}
                                        </div>
                                        <ChevIcon
                                          open={expandedVarQuizzes.has(
                                            quiz.quizId,
                                          )}
                                        />
                                      </button>

                                      {expandedVarQuizzes.has(quiz.quizId) && (
                                        <div className="divide-y divide-border">
                                          {quiz.questions.map(
                                            (
                                              question: QuestionGrading,
                                              qIdx: number,
                                            ) => (
                                              <div key={question.questionId}>
                                                {/* Question */}
                                                <button
                                                  onClick={() =>
                                                    toggleSet(
                                                      setExpandedVarQuestions,
                                                      question.questionId,
                                                    )
                                                  }
                                                  className="w-full flex items-start gap-3 px-10 py-2.5 hover:bg-muted/10 transition-colors text-left"
                                                >
                                                  <div className="min-w-[24px] h-5 rounded bg-muted flex items-center justify-center text-[10px] font-mono font-medium text-muted-foreground flex-shrink-0 mt-0.5">
                                                    Q{qIdx + 1}
                                                  </div>
                                                  <div className="flex-1 min-w-0">
                                                    <p className="text-sm">
                                                      {question.questionText}
                                                    </p>
                                                    <div className="flex gap-1.5 mt-1 flex-wrap">
                                                      <Badge
                                                        variant="outline"
                                                        className="text-xs"
                                                      >
                                                        {question.maxPoints} pt
                                                        {question.maxPoints !==
                                                        1
                                                          ? "s"
                                                          : ""}
                                                      </Badge>
                                                      <Badge
                                                        variant="outline"
                                                        className="text-xs"
                                                      >
                                                        {
                                                          question.variations
                                                            .length
                                                        }{" "}
                                                        variation
                                                        {question.variations
                                                          .length !== 1
                                                          ? "s"
                                                          : ""}
                                                      </Badge>
                                                    </div>
                                                  </div>
                                                  <ChevIcon
                                                    open={expandedVarQuestions.has(
                                                      question.questionId,
                                                    )}
                                                  />
                                                </button>

                                                {expandedVarQuestions.has(
                                                  question.questionId,
                                                ) && (
                                                  <div className="bg-muted/5">
                                                    {question.sampleAnswer && (
                                                      <div className="mx-10 mt-2 mb-1 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                                                        <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-0.5">
                                                          Expected answer
                                                        </p>
                                                        <p className="text-sm text-green-900 dark:text-green-100">
                                                          {
                                                            question.sampleAnswer
                                                          }
                                                        </p>
                                                      </div>
                                                    )}
                                                    {question.variations.map(
                                                      (
                                                        v: AnswerVariation,
                                                        vi: number,
                                                      ) => (
                                                        <VariationRow
                                                          key={v.variationId}
                                                          question={question}
                                                          variation={v}
                                                          vIndex={vi}
                                                          withGrading={false}
                                                          isSubmittingGrade={
                                                            isSubmittingGrade
                                                          }
                                                          state={getVariationGradingState(
                                                            question,
                                                            v,
                                                          )}
                                                          updateGradingState={
                                                            updateGradingState
                                                          }
                                                          onGrade={() =>
                                                            undefined
                                                          }
                                                        />
                                                      ),
                                                    )}
                                                  </div>
                                                )}
                                              </div>
                                            ),
                                          )}
                                        </div>
                                      )}
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
          </div>
        )}

        {/* ══════════════════════════════════════════════
            TAB 3 — QUIZ LIBRARY
        ══════════════════════════════════════════════ */}
        {activeTab === "library" && (
          <div className="space-y-4">
            {!selectedCourse ? (
              <Card className="p-14 text-center border-border">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Filter className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-1">Select a course</h3>
                <p className="text-sm text-muted-foreground mb-5">
                  Choose a course to browse its quizzes and view results.
                </p>
                <Button
                  onClick={() => setIsCourseDialogOpen(true)}
                  className="gap-2"
                >
                  <BookOpen className="h-4 w-4" />
                  Browse courses
                </Button>
              </Card>
            ) : (
              <>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 border-primary bg-primary/5">
                    <BookOpen className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">
                      {selectedCourseData?.title}
                    </span>
                    <button
                      onClick={() => {
                        setSelectedCourse("");
                        setSelectedModule("");
                      }}
                      className="ml-1 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {!isFetchingCourse &&
                    modules.map((m) => (
                      <Button
                        key={m.id}
                        variant={
                          selectedModule === m.id ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() =>
                          setSelectedModule(m.id === selectedModule ? "" : m.id)
                        }
                        className="h-7 rounded-full text-xs"
                      >
                        {m.title}
                      </Button>
                    ))}
                  {isFetchingCourse && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search quizzes…"
                    value={libSearchQuery}
                    onChange={(e) => setLibSearchQuery(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>

                {filteredQuizzes.length === 0 ? (
                  <Card className="p-12 text-center border-border">
                    <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-40" />
                    <h3 className="font-semibold mb-1">No quizzes found</h3>
                    <p className="text-sm text-muted-foreground">
                      {libSearchQuery
                        ? `No quizzes match "${libSearchQuery}"`
                        : "No quizzes for this course."}
                    </p>
                  </Card>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredQuizzes
                        .slice(
                          (currentPage - 1) * itemsPerPage,
                          currentPage * itemsPerPage,
                        )
                        .map((quiz) => (
                          <Card
                            key={quiz.id}
                            className="p-5 border-border flex flex-col gap-4"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <FileText className="h-5 w-5 text-primary" />
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {quiz.type || "quiz"}
                              </Badge>
                            </div>
                            <div>
                              <h3 className="font-semibold leading-snug">
                                {quiz.title}
                              </h3>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                {quiz.course}
                              </p>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                {
                                  label: "Questions",
                                  value: Array.isArray(quiz.questions)
                                    ? quiz.questions.length
                                    : quiz.questions || 0,
                                },
                                {
                                  label: "Students",
                                  value: quiz.studentCount ?? "—",
                                },
                                {
                                  label: "Attempts",
                                  value: quiz.attemptCount ?? "—",
                                },
                                {
                                  label: "Avg score",
                                  value:
                                    typeof quiz.avgScore === "number"
                                      ? `${quiz.avgScore}%`
                                      : "—",
                                },
                              ].map((s) => (
                                <div
                                  key={s.label}
                                  className="bg-muted/40 rounded-lg px-3 py-2"
                                >
                                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                    {s.label}
                                  </p>
                                  <p className="text-lg font-semibold mt-0.5">
                                    {s.value}
                                  </p>
                                </div>
                              ))}
                            </div>
                            {quiz.attemptCount === 0 && (
                              <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 -mt-1">
                                <AlertCircle className="h-3 w-3" />
                                No attempts yet
                              </p>
                            )}
                            <div className="flex gap-2 mt-auto">
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 gap-1"
                                onClick={() =>
                                  navigate(`/course-builder/${selectedCourse}`)
                                }
                              >
                                <Edit2 className="h-3 w-3" />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                className="flex-1 gap-1"
                                onClick={() => setViewQuizResultsDialog(quiz)}
                              >
                                <BarChart3 className="h-3 w-3" />
                                Results
                              </Button>
                            </div>
                          </Card>
                        ))}
                    </div>
                    {filteredQuizzes.length > itemsPerPage && (
                      <Pagination
                        currentPage={currentPage}
                        totalPages={Math.ceil(
                          filteredQuizzes.length / itemsPerPage,
                        )}
                        onPageChange={setCurrentPage}
                        itemsPerPage={itemsPerPage}
                        totalItems={filteredQuizzes.length}
                      />
                    )}
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════
            DIALOGS
        ══════════════════════════════════════════════ */}

        {/* Course selector */}
        <Dialog open={isCourseDialogOpen} onOpenChange={setIsCourseDialogOpen}>
          <DialogContent className="max-w-xl max-h-[80vh] flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Select course</DialogTitle>
              <DialogDescription>
                Filter the quiz library by course
              </DialogDescription>
            </DialogHeader>
            <div className="relative flex-shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search courses…"
                className="pl-9"
                value={courseSearchQuery}
                onChange={(e) => setCourseSearchQuery(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
              {courses
                .filter((c) =>
                  c.title
                    .toLowerCase()
                    .includes(courseSearchQuery.toLowerCase()),
                )
                .map((course) => (
                  <button
                    key={course.id}
                    disabled={course.status !== "published"}
                    onClick={() => {
                      setSelectedCourse(course.id);
                      setSelectedModule("");
                      setIsCourseDialogOpen(false);
                      setCourseSearchQuery("");
                    }}
                    className={`w-full p-4 rounded-xl border text-left transition-all group ${course.status !== "published" ? "opacity-40 cursor-not-allowed border-border" : "border-border hover:border-primary hover:bg-primary/5"}`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium group-hover:text-primary transition-colors">
                          {course.title}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <Badge className="text-[10px]">{course.status}</Badge>
                          <span className="flex items-center gap-1">
                            <Layers className="h-3 w-3" />
                            {course.quizzes} quizzes
                          </span>
                          <span>{course.enrolledCount} students</span>
                        </div>
                      </div>
                      <ChevronDown className="h-4 w-4 text-muted-foreground -rotate-90" />
                    </div>
                  </button>
                ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* Question details */}
        <Dialog
          open={!!viewQuestionDialog}
          onOpenChange={(o) => !o && setViewQuestionDialog(null)}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Question details</DialogTitle>
              <DialogDescription>
                {viewQuestionDialog?.quizTitle} ·{" "}
                {viewQuestionDialog?.maxPoints} pts
              </DialogDescription>
            </DialogHeader>
            {viewQuestionDialog && (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    Question
                  </Label>
                  <div className="p-4 rounded-xl bg-muted/30 border border-border text-sm whitespace-pre-wrap">
                    {viewQuestionDialog.questionText}
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
                    <Label className="text-sm font-medium mb-2 block">
                      Explanation / guideline
                    </Label>
                    <div className="p-4 rounded-xl bg-muted/30 border border-border text-sm text-muted-foreground whitespace-pre-wrap">
                      {viewQuestionDialog.questionExplanation}
                    </div>
                  </div>
                )}
                {viewQuestionDialog.sampleAnswer && (
                  <div>
                    <Label className="text-sm font-medium mb-2 block">
                      Expected answer
                    </Label>
                    <div className="p-4 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 text-sm text-green-900 dark:text-green-100 whitespace-pre-wrap">
                      {viewQuestionDialog.sampleAnswer}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Quiz results */}
        <Dialog
          open={!!viewQuizResultsDialog}
          onOpenChange={(o) => !o && setViewQuizResultsDialog(null)}
        >
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">
                {viewQuizResultsDialog?.title}
              </DialogTitle>
              <DialogDescription>
                {viewQuizResultsDialog?.course || selectedCourseData?.title} ·{" "}
                {Array.isArray(viewQuizResultsDialog?.questions)
                  ? viewQuizResultsDialog.questions.length
                  : viewQuizResultsDialog?.questions || 0}{" "}
                questions
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto space-y-6 pr-1">
              {isLoadingQuizResults ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : quizResultsData ? (
                quizResultsData.overallStats.totalAttempts === 0 ? (
                  <div className="flex flex-col items-center py-16 text-center space-y-4">
                    <Users className="h-14 w-14 text-muted-foreground opacity-30" />
                    <div>
                      <h3 className="text-lg font-semibold mb-1">
                        No attempts yet
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Students haven't taken this quiz yet.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() =>
                        navigate(`/course-builder/${selectedCourse}`)
                      }
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit quiz
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* Performance stats */}
                    <div>
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Overall performance
                      </h3>
                      <div className="grid grid-cols-4 gap-3">
                        {[
                          {
                            icon: (
                              <TrendingUp className="h-5 w-5 text-blue-500" />
                            ),
                            bg: "bg-blue-500/10",
                            label: "Avg score",
                            value: `${quizResultsData.overallStats.avgScore.toFixed(1)}%`,
                          },
                          {
                            icon: (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ),
                            bg: "bg-green-500/10",
                            label: "Pass rate",
                            value: `${quizResultsData.overallStats.passRate}%`,
                          },
                          {
                            icon: <Users className="h-5 w-5 text-purple-500" />,
                            bg: "bg-purple-500/10",
                            label: "Total attempts",
                            value: quizResultsData.overallStats.totalAttempts,
                          },
                          {
                            icon: (
                              <BarChart3 className="h-5 w-5 text-orange-500" />
                            ),
                            bg: "bg-orange-500/10",
                            label: "Score range",
                            value: `${quizResultsData.overallStats.lowScore}–${quizResultsData.overallStats.highScore}%`,
                          },
                        ].map((s) => (
                          <Card key={s.label} className="p-4 border-border">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center flex-shrink-0`}
                              >
                                {s.icon}
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  {s.label}
                                </p>
                                <p className="text-xl font-bold mt-0.5">
                                  {s.value}
                                </p>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>

                    {/* Score distribution */}
                    <div>
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Score distribution
                      </h3>
                      <Card className="p-5 border-border">
                        <div className="flex items-end justify-between gap-2 h-44">
                          {quizResultsData.scoreDistribution.map((bucket) => {
                            const maxCount = Math.max(
                              ...quizResultsData.scoreDistribution.map(
                                (b) => b.count,
                              ),
                              1,
                            );
                            const h =
                              bucket.count > 0
                                ? Math.max((bucket.count / maxCount) * 160, 8)
                                : 0;
                            const colors: Record<string, string> = {
                              "0-20%": "bg-red-500",
                              "20-40%": "bg-orange-500",
                              "40-60%": "bg-yellow-500",
                              "60-80%": "bg-blue-500",
                              "80-100%": "bg-green-500",
                            };
                            return (
                              <div
                                key={bucket.range}
                                className="flex-1 flex flex-col items-center justify-end gap-1.5 h-full"
                              >
                                <span className="text-sm font-medium">
                                  {bucket.count}
                                </span>
                                <div
                                  className={`w-full ${colors[bucket.range] || "bg-muted"} rounded-t`}
                                  style={{ height: `${h}px` }}
                                />
                                <span className="text-[11px] text-muted-foreground">
                                  {bucket.range}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </Card>
                    </div>

                    {/* Students table */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Student scores
                        </h3>
                        {showOnlyRetakers && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => setShowOnlyRetakers(false)}
                          >
                            <X className="h-3 w-3" />
                            Clear filter
                          </Button>
                        )}
                      </div>
                      <div className="rounded-xl border border-border overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-muted/40 text-xs font-medium text-muted-foreground">
                            <tr className="border-b border-border">
                              <th className="p-3 w-8"></th>
                              <th className="p-3 text-left">Student</th>
                              <th className="p-3 text-center">Score</th>
                              <th className="p-3 text-center">Status</th>
                              <th className="p-3 text-center">Attempts</th>
                              <th className="p-3 text-left">Last attempt</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(showOnlyRetakers
                              ? quizResultsData.studentScores.filter(
                                  (s) => s.attempts > 1,
                                )
                              : quizResultsData.studentScores
                            ).map((student) => {
                              const isExp = expandedStudents.has(
                                student.studentId,
                              );
                              return (
                                <>
                                  <tr
                                    key={student.studentId}
                                    onClick={() =>
                                      toggleSet(
                                        setExpandedStudents,
                                        student.studentId,
                                      )
                                    }
                                    className="border-b border-border hover:bg-muted/20 cursor-pointer transition-colors"
                                  >
                                    <td className="p-3">
                                      <ChevronDown
                                        className={`h-4 w-4 text-muted-foreground transition-transform ${isExp ? "rotate-180" : ""}`}
                                      />
                                    </td>
                                    <td className="p-3 text-sm font-medium">
                                      {student.studentName}
                                    </td>
                                    <td className="p-3 text-center">
                                      <span
                                        className={`text-sm font-bold ${student.score >= 80 ? "text-green-500" : student.score >= 60 ? "text-blue-500" : "text-orange-500"}`}
                                      >
                                        {student.score}%
                                      </span>
                                    </td>
                                    <td className="p-3 text-center">
                                      <Badge
                                        variant={
                                          student.status === "Passed"
                                            ? "default"
                                            : "destructive"
                                        }
                                        className="text-xs"
                                      >
                                        {student.status}
                                      </Badge>
                                    </td>
                                    <td className="p-3 text-center text-sm text-muted-foreground">
                                      {student.attempts}
                                    </td>
                                    <td className="p-3 text-sm text-muted-foreground">
                                      {student.lastAttemptDate}
                                    </td>
                                  </tr>
                                  {isExp && student.allAttempts?.length > 0 && (
                                    <tr
                                      key={`exp-${student.studentId}`}
                                      className="bg-muted/10"
                                    >
                                      <td colSpan={6} className="p-0">
                                        <div className="p-4 pl-12 space-y-2">
                                          <p className="text-xs font-medium text-muted-foreground mb-2">
                                            All attempts
                                          </p>
                                          {student.allAttempts.map(
                                            (attempt: any) => (
                                              <div
                                                key={attempt.attemptId}
                                                className="flex items-center justify-between p-3 bg-background rounded-lg border border-border"
                                              >
                                                <div className="flex items-center gap-4">
                                                  <span className="text-xs text-muted-foreground min-w-[80px]">
                                                    Attempt{" "}
                                                    {attempt.attemptNumber}
                                                  </span>
                                                  <span
                                                    className={`text-sm font-bold ${attempt.score >= 80 ? "text-green-500" : attempt.score >= 60 ? "text-blue-500" : "text-orange-500"}`}
                                                  >
                                                    {attempt.score}%
                                                  </span>
                                                  <Badge
                                                    variant={
                                                      attempt.status ===
                                                      "Passed"
                                                        ? "default"
                                                        : "destructive"
                                                    }
                                                    className="text-xs"
                                                  >
                                                    {attempt.status}
                                                  </Badge>
                                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {attempt.completedAt}
                                                  </span>
                                                </div>
                                                <Button
                                                  variant="secondary"
                                                  size="sm"
                                                  className="text-xs h-7"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleViewStudentAttempt({
                                                      ...student,
                                                      lastAttemptId:
                                                        attempt.attemptId,
                                                    });
                                                  }}
                                                >
                                                  View details
                                                </Button>
                                              </div>
                                            ),
                                          )}
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
                        Click a row to expand all attempts
                      </p>

                      {quizResultsData.studentScores.filter(
                        (s) => s.attempts > 1,
                      ).length > 0 && (
                        <Card className="p-4 border-blue-800 bg-blue-500/10">
                          <div className="flex items-start gap-3">
                            <AlertCircle className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                            <div className="flex-1 text-sm text-blue-300">
                              {Math.round(
                                (quizResultsData.studentScores.filter(
                                  (s) => s.attempts > 1,
                                ).length /
                                  quizResultsData.studentScores.length) *
                                  100,
                              )}
                              % of students took this quiz more than once.
                              <Button
                                variant="outline"
                                size="sm"
                                className="mt-2 h-7 text-xs block bg-purple-600 text-white hover:bg-purple-700"
                                onClick={() => setShowOnlyRetakers(true)}
                              >
                                View retakers only
                              </Button>
                            </div>
                          </div>
                        </Card>
                      )}
                    </div>

                    <div className="flex gap-2 pt-2 border-border">
                      <Button
                        variant="secondary"
                        onClick={() =>
                          navigate(`/course-builder/${selectedCourse}`)
                        }
                      >
                        <Edit2 className="h-4 w-4 mr-2" />
                        Edit quiz
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={handleExportResults}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export results
                      </Button>
                      <Button onClick={() => setViewQuizResultsDialog(null)}>
                        Close
                      </Button>
                    </div>
                  </>
                )
              ) : (
                <div className="flex flex-col items-center py-12 text-center">
                  <AlertCircle className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No results data available yet.
                  </p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Student attempt details */}
        <Dialog
          open={!!viewStudentAttemptDialog || isLoadingStudentAttempt}
          onOpenChange={() => setViewStudentAttemptDialog(null)}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Student attempt details</DialogTitle>
              {viewStudentAttemptDialog && (
                <DialogDescription>
                  {viewStudentAttemptDialog.quizTitle} ·{" "}
                  {viewStudentAttemptDialog.courseTitle}
                </DialogDescription>
              )}
            </DialogHeader>
            {isLoadingStudentAttempt ? (
              <div className="flex flex-col items-center py-12">
                <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
                <p className="text-sm text-muted-foreground">
                  Loading attempt details…
                </p>
              </div>
            ) : (
              viewStudentAttemptDialog && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Card className="p-4 border-border">
                      <p className="text-xs text-muted-foreground">Student</p>
                      <p className="font-bold mt-1">
                        {viewStudentAttemptDialog.studentName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {viewStudentAttemptDialog.studentEmail}
                      </p>
                    </Card>
                    <Card className="p-4 border-border">
                      <p className="text-xs text-muted-foreground">Score</p>
                      <p
                        className={`text-2xl font-bold mt-1 ${viewStudentAttemptDialog.score >= 80 ? "text-green-500" : viewStudentAttemptDialog.score >= 60 ? "text-blue-500" : "text-orange-500"}`}
                      >
                        {viewStudentAttemptDialog.score}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {viewStudentAttemptDialog.totalPointsEarned}/
                        {viewStudentAttemptDialog.totalMaxPoints} pts
                      </p>
                    </Card>
                    <Card className="p-4 border-border">
                      <p className="text-xs text-muted-foreground">Status</p>
                      <Badge
                        variant={
                          viewStudentAttemptDialog.isPassed
                            ? "default"
                            : "destructive"
                        }
                        className="mt-2"
                      >
                        {viewStudentAttemptDialog.isPassed
                          ? "Passed"
                          : "Failed"}
                      </Badge>
                    </Card>
                    <Card className="p-4 border-border">
                      <p className="text-xs text-muted-foreground">Submitted</p>
                      <p className="text-sm font-medium mt-1">
                        {new Date(
                          viewStudentAttemptDialog.submittedAt,
                        ).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(
                          viewStudentAttemptDialog.submittedAt,
                        ).toLocaleTimeString()}
                      </p>
                    </Card>
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Question breakdown (
                      {viewStudentAttemptDialog.questionAttempts.length})
                    </h4>
                    {viewStudentAttemptDialog.questionAttempts.map((q: any) => (
                      <Card
                        key={q.questionId}
                        className="p-4 border-border space-y-3"
                      >
                        {(() => {
                          const questionType = String(
                            q?.questionType || "",
                          ).toLowerCase();
                          const allOptions = getOptionTexts(q);
                          const studentAnswerLines = answerToLines(
                            q.studentAnswer,
                            q,
                          );
                          const correctAnswerLines = answerToLines(
                            q.correctAnswer,
                            q,
                          );
                          const studentSet = new Set(
                            studentAnswerLines.map(normalizeCompare),
                          );
                          const correctSet = new Set(
                            correctAnswerLines.map(normalizeCompare),
                          );
                          const showAllOptions =
                            isOptionBasedQuestionType(questionType) &&
                            allOptions.length > 0;
                          const studentMatchingPairs =
                            questionType === "matching"
                              ? getMatchingPairs(q.studentAnswer)
                              : [];
                          const correctMatchingPairs =
                            questionType === "matching"
                              ? getMatchingPairs(q.correctAnswer)
                              : [];
                          const correctMatchByLeft = new Map(
                            correctMatchingPairs.map((pair) => [
                              normalizeCompare(pair.left),
                              pair.right,
                            ]),
                          );

                          return (
                            <>
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge
                                    variant="outline"
                                    className="font-mono text-xs"
                                  >
                                    Q{q.questionNumber}
                                  </Badge>
                                  <Badge
                                    variant="secondary"
                                    className="text-xs capitalize"
                                  >
                                    {q.questionType?.replace(/_/g, " ")}
                                  </Badge>
                                  {q.isCorrect !== null && (
                                    <Badge
                                      variant={
                                        q.isCorrect ? "default" : "destructive"
                                      }
                                      className="text-xs"
                                    >
                                      {q.isCorrect ? "Correct" : "Incorrect"}
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <span
                                    className={`text-xl font-bold ${q.pointsEarned === q.maxPoints ? "text-green-500" : q.pointsEarned > 0 ? "text-blue-500" : "text-orange-500"}`}
                                  >
                                    {q.pointsEarned}/{q.maxPoints}
                                  </span>
                                  <p className="text-xs text-muted-foreground">
                                    pts
                                  </p>
                                </div>
                              </div>
                              {q.questionText && (
                                <div
                                  className="p-3 rounded-lg border"
                                  style={{
                                    backgroundColor: Colors.textInputBg,
                                    borderColor: Colors.purple300,
                                  }}
                                >
                                  <p
                                    className="text-xs font-semibold mb-1"
                                    style={{ color: Colors.purple200 }}
                                  >
                                    Question
                                  </p>
                                  <p
                                    className="text-sm whitespace-pre-wrap"
                                    style={{ color: Colors.textPrimary }}
                                  >
                                    {q.questionText}
                                  </p>
                                </div>
                              )}

                              {showAllOptions && (
                                <div
                                  className="p-3 rounded-lg border"
                                  style={{
                                    backgroundColor: Colors.textInputBg,
                                    borderColor: Colors.gray500,
                                  }}
                                >
                                  <p
                                    className="text-xs font-semibold mb-2"
                                    style={{ color: Colors.textSecondary }}
                                  >
                                    All options
                                  </p>
                                  <div className="space-y-1.5">
                                    {allOptions.map((opt, index) => {
                                      const key = normalizeCompare(opt);
                                      const isStudentChoice =
                                        studentSet.has(key);
                                      const isCorrectChoice =
                                        correctSet.has(key);
                                      return (
                                        <div
                                          key={`${q.questionId}-opt-${index}`}
                                          className="px-2 py-1.5 rounded border text-sm flex items-center justify-between gap-2"
                                          style={
                                            isCorrectChoice
                                              ? {
                                                  borderColor: Colors.green,
                                                  backgroundColor:
                                                    "rgba(73, 172, 51, 0.14)",
                                                }
                                              : {
                                                  borderColor: Colors.gray500,
                                                  backgroundColor:
                                                    Colors.backgroundGray,
                                                }
                                          }
                                        >
                                          <span
                                            style={{
                                              color: Colors.textPrimary,
                                            }}
                                          >
                                            {opt}
                                          </span>
                                          <div className="flex items-center gap-1">
                                            {isCorrectChoice && (
                                              <Badge
                                                variant="outline"
                                                className="text-[10px]"
                                                style={{
                                                  borderColor: Colors.green,
                                                  color: Colors.darkGreen,
                                                  backgroundColor:
                                                    "rgba(73, 172, 51, 0.15)",
                                                  zIndex: 10,
                                                }}
                                              >
                                                Correct
                                              </Badge>
                                            )}
                                            {isStudentChoice && (
                                              <Badge
                                                variant="outline"
                                                className="text-[10px]"
                                                style={{
                                                  borderColor: Colors.purple400,
                                                  color: Colors.purple350,
                                                  backgroundColor:
                                                    "rgba(86, 75, 235, 0.15)",
                                                  zIndex: 10,
                                                }}
                                              >
                                                Student
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {questionType === "matching" && (
                                <div
                                  className="p-3 rounded-lg border"
                                  style={{
                                    backgroundColor: Colors.textInputBg,
                                    borderColor: Colors.gray500,
                                  }}
                                >
                                  <p
                                    className="text-xs font-semibold mb-2"
                                    style={{ color: Colors.textSecondary }}
                                  >
                                    Matching comparison
                                  </p>
                                  {studentMatchingPairs.length > 0 ? (
                                    <div className="space-y-2">
                                      {studentMatchingPairs.map(
                                        (pair, index) => {
                                          const expected =
                                            correctMatchByLeft.get(
                                              normalizeCompare(pair.left),
                                            ) ?? "";
                                          const isMatch =
                                            !!expected &&
                                            normalizeCompare(pair.right) ===
                                              normalizeCompare(expected);

                                          return (
                                            <div
                                              key={`${q.questionId}-match-${index}`}
                                              className="rounded border p-2 space-y-1"
                                              style={{
                                                borderColor: isMatch
                                                  ? Colors.green
                                                  : Colors.gray500,
                                                backgroundColor:
                                                  Colors.backgroundGray,
                                              }}
                                            >
                                              <p
                                                className="text-xs"
                                                style={{
                                                  color: Colors.textSecondary,
                                                }}
                                              >
                                                <span
                                                  className="font-semibold"
                                                  style={{
                                                    color: Colors.textPrimary,
                                                  }}
                                                >
                                                  {pair.left || "(blank)"}
                                                </span>
                                              </p>
                                              <p
                                                className="text-sm"
                                                style={{
                                                  color: Colors.textPrimary,
                                                }}
                                              >
                                                Student:{" "}
                                                {pair.right || "(blank)"}
                                              </p>
                                              <p
                                                className="text-sm"
                                                style={{
                                                  color: Colors.textSecondary,
                                                }}
                                              >
                                                Expected:{" "}
                                                {expected || "No mapped answer"}
                                              </p>
                                              <div>
                                                <Badge
                                                  variant="outline"
                                                  className="text-[10px]"
                                                  style={{
                                                    borderColor: isMatch
                                                      ? Colors.green
                                                      : Colors.purple400,
                                                    color: isMatch
                                                      ? Colors.green
                                                      : Colors.purple400,
                                                  }}
                                                >
                                                  {isMatch
                                                    ? "Match"
                                                    : "Mismatch"}
                                                </Badge>
                                              </div>
                                            </div>
                                          );
                                        },
                                      )}
                                    </div>
                                  ) : (
                                    <p
                                      className="text-sm"
                                      style={{ color: Colors.textSecondary }}
                                    >
                                      No matching response submitted
                                    </p>
                                  )}
                                </div>
                              )}
                              {questionType == "short-answer" && (
                                <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                                  <p className="text-xs font-semibold text-green-600 mb-1">
                                    Explanation
                                  </p>
                                  <p className="text-sm text-green-900">
                                    {q.explanation}
                                  </p>
                                </div>
                              )}

                              {/* <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                        <p className="text-xs font-semibold text-green-600 mb-1">Explanation</p>
                        {correctAnswerLines.length > 0 ? (
                          <div className="space-y-1">
                            {correctAnswerLines.map((line, index) => (
                              <p key={`${q.questionId}-correct-${index}`} className="text-sm whitespace-pre-wrap text-green-900">
                                {line}
                              </p>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-green-900 ">No Guideline/Explanation configured</p>
                        )}
                      </div> */}

                              {q.feedback && (
                                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                                  <p className="text-xs font-semibold text-blue-500 mb-1">
                                    Instructor feedback
                                  </p>
                                  <p className="text-sm text-blue-800 dark:text-blue-200">
                                    {q.feedback}
                                  </p>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </Card>
                    ))}
                  </div>
                  <div className="flex justify-end pt-2 border-border">
                    <Button onClick={() => setViewStudentAttemptDialog(null)}>
                      Close
                    </Button>
                  </div>
                </div>
              )
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default Quiz;
