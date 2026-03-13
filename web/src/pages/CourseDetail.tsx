import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Colors } from "@/constants";
import { DEFAULT_COURSE_THUMBNAIL } from "@/constants/images";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Edit,
  Users,
  UserPlus,
  Star,
  Clock,
  BookOpen,
  Award,
  ChevronRight,
  ChevronDown,
  Video,
  FileText,
  MessageSquare,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { courseService, Course, Module, Review, Student } from "@/services";
import moduleService from "@/services/moduleService";
import { useUser } from '@/contexts/useUser';
import { getCourseNotifications, postNotification } from "@/services/notificationService";
import { Megaphone } from "lucide-react";

const REVIEW_PAGE_SIZE = 20;

const CourseDetail = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as {
    quizCompleted?: boolean;
    quizId?: string;
    isPassed?: boolean;
  } | null;
  const { toast } = useToast();
  const [isEnrollDialogOpen, setIsEnrollDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedModules, setExpandedModules] = useState<string[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<"all" | "visible" | "hidden" | "flagged" | "resolved">("all");
  const [reviewSort, setReviewSort] = useState<"latest" | "lowest" | "highest">("latest");
  const [reviewSearchQuery, setReviewSearchQuery] = useState("");
  const [debouncedReviewSearchQuery, setDebouncedReviewSearchQuery] = useState("");
  const [reviewOffset, setReviewOffset] = useState(0);
  const [reviewTotal, setReviewTotal] = useState(0);
  const [reviewHasMore, setReviewHasMore] = useState(false);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewActionId, setReviewActionId] = useState<string | null>(null);
  const [isReviewActionDialogOpen, setIsReviewActionDialogOpen] = useState(false);
  const [pendingReviewAction, setPendingReviewAction] = useState<{
    review: Review;
    action:
      | "hide"
      | "unhide"
      | "flag"
      | "resolve"
      | "acknowledge"
      | "reply"
      | "pin"
      | "unpin";
  } | null>(null);
  const [reviewActionNote, setReviewActionNote] = useState("");
  const [reviewActionFlagReason, setReviewActionFlagReason] = useState("");
  const [reviewActionReply, setReviewActionReply] = useState("");

  // API state
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<any[]>([]); // Use any[] for now to handle different module structures
  const [reviews, setReviews] = useState<Review[]>([]);
  const [enrolledStudents, setEnrolledStudents] = useState<Student[]>([]);
  const [availableStudents, setAvailableStudents] = useState<
    Array<{
      id: string;
      name: string;
      email: string;
      totalEnrollments?: number;
      averageProgress?: number;
    }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useUser();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isMessageAllDialogOpen, setIsMessageAllDialogOpen] = useState(false);
  const [messageToAll, setMessageToAll] = useState("");

  // Fetch course data
  useEffect(() => {
    if (courseId) {
      fetchCourseData();
      // Fetch notifications for this course
      getCourseNotifications(courseId).then(data => {
        // Group by notification ID to avoid duplicates
        const uniqueNotifications = Array.from(new Map(data.map(item => [item.type, item])).values());
        setNotifications(uniqueNotifications);
      }).catch(err => {
        console.error('Error fetching notifications:', err);
      });
    }
  }, [courseId, user?.uuid]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedReviewSearchQuery(reviewSearchQuery.trim());
    }, 400);
    return () => window.clearTimeout(handle);
  }, [reviewSearchQuery]);

  useEffect(() => {
    if (!courseId || !user?.uuid) return;
    fetchReviews();
  }, [courseId, user?.uuid, reviewFilter, reviewSort, debouncedReviewSearchQuery, reviewOffset]);

  useEffect(() => {
    setReviewOffset(0);
  }, [reviewFilter, reviewSort, debouncedReviewSearchQuery]);

  // Refresh data when returning from quiz
  useEffect(() => {
    if (locationState?.quizCompleted && courseId) {
      console.log("Quiz completed, refreshing course data...");
      // Clear the location state to prevent refetching on subsequent renders
      window.history.replaceState({}, document.title);
      // Refetch course data to get updated progress
      fetchCourseData();
    }
  }, [locationState?.quizCompleted]);

  const fetchCourseData = async () => {
    if (!courseId) return;
    if (!user?.uuid) return;

    try {
      setLoading(true);
      setError(null);

      const adminId = user.uuid;

      // Fetch course details.
      const courseData = await courseService.getCourseDetailData(courseId, adminId);
      const { course, modules, enrolledStudents, availableStudents } = courseData;

      // Set all state from the service response
      setCourse(course);
      setModules(modules);
      setEnrolledStudents(enrolledStudents);
      setAvailableStudents(availableStudents);
    } catch (err) {
      console.error("Error fetching course data:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch course data",
      );
      toast({
        title: "Error",
        description: "Failed to load course details. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    if (!courseId || !user?.uuid) return;
    try {
      setReviewsLoading(true);
      const backendSort =
        reviewSort === "lowest"
          ? "lowest_rating"
          : reviewSort === "highest"
            ? "highest_rating"
            : "latest";
      const response = await courseService.getInstructorReviews({
        instructorId: user.uuid,
        courseId,
        sort: backendSort,
        status: reviewFilter,
        q: debouncedReviewSearchQuery,
        limit: REVIEW_PAGE_SIZE,
        offset: reviewOffset,
      });
      setReviews(response.reviews);
      setReviewTotal(response.pagination.total);
      setReviewHasMore(response.pagination.has_more);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch reviews";
      toast({
        title: "Review data unavailable",
        description: message,
        variant: "destructive",
      });
    } finally {
      setReviewsLoading(false);
    }
  };

  const reviewCounts = useMemo(
    () =>
      reviews.reduce(
        (acc, review) => {
          const status = review.reviewStatus || "visible";
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        },
        { visible: 0, hidden: 0, flagged: 0, resolved: 0 } as Record<string, number>
      ),
    [reviews]
  );
  const hasActiveReviewFilters =
    reviewFilter !== "all" || reviewSearchQuery.trim().length > 0;

  const openReviewActionDialog = (
    review: Review,
    action:
      | "hide"
      | "unhide"
      | "flag"
      | "resolve"
      | "acknowledge"
      | "reply"
      | "pin"
      | "unpin"
  ) => {
    setPendingReviewAction({ review, action });
    setReviewActionNote("");
    setReviewActionFlagReason(
      action === "flag" ? review.flagReason || "Needs instructor follow-up" : ""
    );
    setReviewActionReply(action === "reply" ? review.instructorReply || "" : "");
    setIsReviewActionDialogOpen(true);
  };

  const handleReviewAction = async () => {
    if (!courseId || !pendingReviewAction || !user?.uuid) return;
    const { review, action } = pendingReviewAction;
    const reviewId = String(review.id);
    const instructorId = user.uuid;
    const trimmedReply = reviewActionReply.trim();

    if (action === "reply" && !trimmedReply) {
      toast({
        title: "Reply required",
        description: "Please enter an instructor reply before submitting.",
        variant: "destructive",
      });
      return;
    }

    try {
      setReviewActionId(reviewId);
      await courseService.applyInstructorReviewAction({
        instructorId,
        reviewId,
        action,
        moderationNote: reviewActionNote.trim() || undefined,
        flagReason:
          action === "flag" ? reviewActionFlagReason.trim() || undefined : undefined,
        instructorReply: action === "reply" ? trimmedReply : undefined,
      });
      toast({
        title: "Review updated",
        description:
          action === "acknowledge"
            ? "Review acknowledged."
            : action === "reply"
              ? "Instructor reply saved."
              : action === "pin"
                ? "Review pinned."
                : action === "unpin"
                  ? "Review unpinned."
              : `Review marked as ${
                  action === "hide"
                    ? "hidden"
                    : action === "unhide"
                    ? "visible"
                    : action === "flag"
                    ? "flagged"
                    : "resolved"
                }.`,
      });
      setIsReviewActionDialogOpen(false);
      setPendingReviewAction(null);
      await fetchReviews();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update review";
      toast({
        title: "Action failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setReviewActionId(null);
    }
  };

  // Transform API sections to UI-friendly format
  const modulesList =
    modules.length > 0
      ? modules.map((section: any) => {
          const items = section.items || [];
          const videos = items.filter((item: any) => item.type === "video");
          const documents = items.filter((item: any) =>
            ["pdf", "document", "slides", "pptx", "docx", "ppt"].includes(
              item.type,
            ),
          );
          const quizzes = items.filter((item: any) => item.type === "quiz");

          return {
            id: section.id,
            title: section.title,
            lessons: videos.length + documents.length,
            quizzes: quizzes.length,
            duration: section.total_duration_seconds
              ? `${Math.floor(section.total_duration_seconds / 60)} min`
              : section.duration_minutes
                ? `${section.duration_minutes} min`
                : "N/A",
            isCompleted: false,
            completedAt: null,
            // Map items directly to preserve order_index sequence from backend
            items: items.map((item: any) => {
              if (item.type === "video") {
                return {
                  id: item.id,
                  type: "lesson" as const,
                  title: item.title,
                  duration: item.duration_seconds
                    ? `${Math.floor(item.duration_seconds / 60)} min`
                    : "N/A",
                };
              } else if (
                ["pdf", "document", "slides", "pptx", "docx", "ppt"].includes(
                  item.type,
                )
              ) {
                return {
                  id: item.id,
                  type: "document" as const,
                  title: item.title,
                  fileSize: item.file_size_bytes
                    ? `${(item.file_size_bytes / (1024 * 1024)).toFixed(1)} MB`
                    : "N/A",
                };
              } else {
                return {
                  id: item.id,
                  type: "quiz" as const,
                  title: item.title,
                  questions: item.questions?.length || 0,
                };
              }
            }),
          };
        })
      : [
          {
            id: 1,
            title: "Introduction to Data Science",
            lessons: 5,
            quizzes: 1,
            duration: "2 hours",
            isCompleted: true,
            completedAt: "2025-02-01",
            items: [
              {
                id: 1,
                type: "lesson",
                title: "What is Data Science?",
                duration: "15 min",
              },
              {
                id: 2,
                type: "lesson",
                title: "Data Science Tools",
                duration: "20 min",
              },
              {
                id: 3,
                type: "lesson",
                title: "Industry Applications",
                duration: "18 min",
              },
              {
                id: 4,
                type: "lesson",
                title: "Getting Started",
                duration: "12 min",
              },
              {
                id: 5,
                type: "lesson",
                title: "Best Practices",
                duration: "22 min",
              },
              {
                id: 6,
                type: "quiz",
                title: "Introduction Quiz",
                questions: 10,
              },
            ],
          },
          {
            id: 2,
            title: "Python for Data Science",
            lessons: 6,
            quizzes: 1,
            duration: "3 hours",
            isCompleted: false,
            completedAt: null,
            items: [
              {
                id: 1,
                type: "lesson",
                title: "Python Basics",
                duration: "25 min",
              },
              {
                id: 2,
                type: "lesson",
                title: "Data Types & Structures",
                duration: "30 min",
              },
              {
                id: 3,
                type: "lesson",
                title: "Control Flow",
                duration: "22 min",
              },
              { id: 4, type: "lesson", title: "Functions", duration: "28 min" },
              {
                id: 5,
                type: "lesson",
                title: "Libraries Overview",
                duration: "35 min",
              },
              {
                id: 6,
                type: "lesson",
                title: "Practice Projects",
                duration: "40 min",
              },
              {
                id: 7,
                type: "quiz",
                title: "Python Fundamentals Quiz",
                questions: 15,
              },
            ],
          },
          {
            id: 3,
            title: "Data Analysis with Pandas",
            lessons: 5,
            quizzes: 1,
            duration: "2.5 hours",
            isCompleted: false,
            completedAt: null,
            items: [
              {
                id: 1,
                type: "lesson",
                title: "Introduction to Pandas",
                duration: "20 min",
              },
              {
                id: 2,
                type: "lesson",
                title: "DataFrames",
                duration: "25 min",
              },
              {
                id: 3,
                type: "lesson",
                title: "Data Cleaning",
                duration: "30 min",
              },
              {
                id: 4,
                type: "lesson",
                title: "Data Transformation",
                duration: "28 min",
              },
              {
                id: 5,
                type: "lesson",
                title: "Advanced Operations",
                duration: "32 min",
              },
              {
                id: 6,
                type: "quiz",
                title: "Pandas Mastery Quiz",
                questions: 12,
              },
            ],
          },
        ];

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) =>
      prev.includes(moduleId)
        ? prev.filter((id) => id !== moduleId)
        : [...prev, moduleId],
    );
  };

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId],
    );
  };

  const handleEnrollStudents = async () => {
    if (!courseId || selectedStudents.length === 0) {
      toast({
        title: "No Students Selected",
        description: "Please select at least one student to enroll.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsEnrolling(true);

      // Enroll students in parallel
      await Promise.all(
        selectedStudents.map((studentId) =>
          courseService.enrollStudent(courseId, studentId),
        ),
      );

      toast({
        title: "Success!",
        description: `${selectedStudents.length} student${selectedStudents.length > 1 ? "s" : ""} enrolled successfully`,
      });

      // Reset selection and close dialog
      setSelectedStudents([]);
      setIsEnrollDialogOpen(false);

      // Refresh course data to update student lists
      await fetchCourseData();
    } catch (error) {
      console.error("Error enrolling students:", error);
      toast({
        title: "Error",
        description: "Failed to enroll students. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleItemClick = (module: any, item: any) => {
    if (item.type === "lesson") {
      navigate(`/course/${courseId}/module/${module.id}/lesson/${item.id}`);
    } else if (item.type === "document") {
      navigate(`/course/${courseId}/module/${module.id}/lesson/${item.id}`);
    } else if (item.type === "quiz") {
      navigate(`/course/${courseId}/module/${module.id}/quiz/${item.id}`);
    }
  };

  const sendMessageToAll = async () => {
    // Ensure message is not empty
    if (!messageToAll.trim()) {
      toast({
        title: "Error",
        description: "Message cannot be empty.",
        variant: "destructive",
      });
      return;
    }
    console.log("Sending message to all students:", messageToAll);
    console.log(enrolledStudents);
    // Generate random uuid
    const notificationId = crypto.randomUUID();
    await postNotification({
      userIds: enrolledStudents.map(student => student.id.toString()),
      title: `${course.title}`,
      message: messageToAll,
      type: `course_announcement-${courseId}-${notificationId}`,
    });
    toast({
      title: "Message Sent",
      description: "Your message has been sent to all students.",
    });
    // Fetch notifications for this course
    getCourseNotifications(courseId).then(data => {
      // Group by notification ID to avoid duplicates
      const uniqueNotifications = Array.from(new Map(data.map(item => [item.type, item])).values());
      setNotifications(uniqueNotifications);
    }).catch(err => {
      console.error('Error fetching notifications:', err);
    });
    setIsMessageAllDialogOpen(false);
    setMessageToAll("");
  }

  // Filter available students based on search query
  const filteredAvailableStudents = availableStudents.filter(
    (student) =>
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-6 py-8">
          <div className="flex justify-center items-center py-12 flex-col">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <br />
            <p className="ml-4 text-lg">Loading course details...</p>
          </div>
        </main>
      </div>
    );
  }

  // Show error state
  if (error || !course) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-6 py-8">
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-destructive mb-4">
              {error || "Course not found"}
            </p>
            <Button onClick={() => navigate("/courses")}>
              Back to Courses
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-6 py-8">
        {/* Course Header */}
        <div className="gradient-card border border-border rounded-xl p-8 mb-6">
          <div className="flex gap-8">
            <img
              src={course.thumbnail || DEFAULT_COURSE_THUMBNAIL}
              alt={course.title}
              className="w-64 h-48 object-cover rounded-lg"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = DEFAULT_COURSE_THUMBNAIL;
              }}
            />
            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-[32px] font-bold pr-2">{course.title}</h1>
                  <p className="text-muted-foreground mt-1 mb-2">
                    by {course.instructor}
                  </p>
                  <Badge
                    className="my-2 py-2 px-3"
                    style={{ backgroundColor: course.categoryColor }}
                  >
                    {course.category}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    className={
                      course.status === "published"
                        ? "status-badge-published py-2 px-3"
                        : "status-badge-draft py-2 px-3"
                    }
                  >
                    {course.status.toUpperCase()}
                  </Badge>
                  <Button
                    onClick={() => navigate(`/course-builder/${courseId}`)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Course
                  </Button>
                </div>
              </div>

              <p className="text-foreground mb-6">{course.description}</p>

              {course.outcomes && course.outcomes.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                    Course Outcomes
                  </h3>
                  <ul className="grid gap-2">
                    {course.outcomes.map((outcome, index) => (
                      <li
                        key={`${outcome}-${index}`}
                        className="flex items-start gap-2 text-sm text-foreground"
                      >
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
                        <span>{outcome}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <div>
                    <div className="text-2xl font-bold">
                      {course.enrolledCount}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Students
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-warning" />
                  <div>
                    <div className="text-2xl font-bold">
                      {course.totalRatings > 0
                        ? `${course.rating} (${course.totalRatings})`
                        : "-"}
                    </div>
                    <div className="text-xs text-muted-foreground">Ratings</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-success" />
                  <div>
                    <div className="text-2xl font-bold">
                      {course.completionRate}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Completion
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-accent" />
                  <div>
                    <div className="text-2xl font-bold">{course.duration}</div>
                    <div className="text-xs text-muted-foreground">
                      Duration
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Course Content */}
          <div className="col-span-2 space-y-6">
            <div className="gradient-card border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Course Content</h2>
                <div className="text-sm text-muted-foreground">
                  {course.modules} modules • {course.lessons} lessons •{" "}
                  {course.quizzes} quizzes
                </div>
              </div>

              <div className="space-y-3">
                {modulesList.map((module) => (
                  <div
                    key={module.id}
                    className="border border-border rounded-lg overflow-hidden"
                  >
                    <div
                      className="flex items-center justify-between p-4 bg-card hover:bg-muted/10 cursor-pointer"
                      onClick={() => toggleModule(module.id)}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <BookOpen className="h-5 w-5 text-primary" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">
                              {module.title}
                            </span>
                            {module.isCompleted && (
                              <Badge className="bg-success/20 text-success hover:bg-success/30 border-success/30">
                                <Award className="h-3 w-3 mr-1" />
                                Completed
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {module.lessons} lessons • {module.quizzes} quiz •{" "}
                            {module.duration}
                            {module.isCompleted && module.completedAt && (
                              <span className="ml-2">
                                • Completed on{" "}
                                {new Date(
                                  module.completedAt,
                                ).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {expandedModules.includes(module.id) ? (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>

                    {expandedModules.includes(module.id) && (
                      <div className="p-4 bg-background/50 space-y-2">
                        {module.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between p-3 rounded hover:bg-muted/10 cursor-pointer"
                            onClick={() => handleItemClick(module, item)}
                          >
                            <div className="flex items-center gap-3">
                              {item.type === "lesson" ? (
                                <Video className="h-4 w-4 text-accent" />
                              ) : item.type === "document" || item.type === "pdf" || item.type === "ppt" ? (
                                <FileText className="h-4 w-4 text-primary" />
                              ) : (
                                <MessageSquare className="h-4 w-4 text-warning" />
                              )}
                              <div className="flex flex-col gap-1">
                                <span className="text-sm">{item.title}</span>
                                {(item.type === "pdf" || item.type === "document" || item.type === "ppt") && (
                                  <span className="text-xs text-muted-foreground uppercase">
                                    {item.type === "pdf" ? "PDF" : item.type === "document" ? "DOCX" : "PPTX"}
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {item.type === "lesson"
                                ? item.duration
                                : item.type === "pdf" || item.type === "document"
                                  ? item.fileSize
                                  : `${item.questions} questions`}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Course Announcements Section */}
            <div className="gradient-card border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Course Announcements</h2>
              </div>

              {notifications.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">No announcements yet</p>
                </div>
              ) : (
                <>
                  {/* Individual Announcements */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Recent Announcements</h3>
                    <div className="max-h-80 overflow-y-auto space-y-4 pr-2">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className="p-4 rounded-lg bg-background/50"
                        >
                          <p>
                            {notification.message}
                          </p>
                          <p className="text-muted-foreground">
                              {notification.createdAt
                              ? new Date(notification.createdAt).toLocaleString()
                              : 'N/A'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Course Reviews Section */}
            <div className="gradient-card border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Course Reviews</h2>
              </div>

              {reviews.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">No reviews yet</p>
                  <p className="text-sm text-muted-foreground">
                    Students will be able to leave reviews once they complete
                    the course.
                  </p>
                </div>
              ) : (
                <>
                  {/* Rating Summary */}
                  <div className="grid md:grid-cols-2 gap-8 mb-4 pb-2 pr-10">
                    {/* Average Rating */}
                    <div className=" flex flex-col items-center justify-center text-center">
                      <div className="text-5xl font-bold mb-3">
                        {course.rating}
                      </div>
                      <div className="flex gap-1 mb-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-4 w-4 ${
                              star <= Math.round(course.rating)
                                ? "text-warning fill-warning"
                                : "text-muted-foreground"
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-muted-foreground">
                        Based on {course.totalRatings}{" "}
                        {course.totalRatings === 1 ? "review" : "reviews"}
                      </p>
                    </div>

                    {/* Rating Breakdown */}
                    <div className="space-y-3">
                      {[5, 4, 3, 2, 1].map((rating) => {
                        // Calculate actual rating distribution from reviews
                        const count = reviews.filter(
                          (review) => Math.round(review.rating) === rating,
                        ).length;
                        const percentage =
                          course.totalRatings > 0
                            ? Math.round((count / course.totalRatings) * 100)
                            : 0;

                        return (
                          <div
                            key={rating}
                            className="flex items-center gap-3 max-h-4"
                          >
                            <div className="flex items-center gap-1 w-10">
                              <span className="text-sm font-medium mr-1 justify-center text-center min-w-[12px]">
                                {rating}
                              </span>
                              <Star className="h-4 w-4 text-warning fill-warning" />
                            </div>
                            <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-warning rounded-full transition-all duration-500"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="text-sm text-muted-foreground w-10 text-right">
                              {count}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Individual Reviews */}
                  <div className="space-y-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <h3 className="font-semibold text-lg">Recent Reviews</h3>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <Badge variant="outline">Visible {reviewCounts.visible || 0}</Badge>
                        <Badge variant="outline">Hidden {reviewCounts.hidden || 0}</Badge>
                        <Badge variant="outline">Flagged {reviewCounts.flagged || 0}</Badge>
                        <Badge variant="outline">Resolved {reviewCounts.resolved || 0}</Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1 md:col-span-3">
                        <Label className="text-xs text-muted-foreground">Search</Label>
                        <Input
                          value={reviewSearchQuery}
                          onChange={(event) => setReviewSearchQuery(event.target.value)}
                          placeholder="Search reviewer, comment, or date..."
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Filter</Label>
                        <Select
                          value={reviewFilter}
                          onValueChange={(value) => setReviewFilter(value as any)}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="visible">Visible</SelectItem>
                            <SelectItem value="hidden">Hidden</SelectItem>
                            <SelectItem value="flagged">Flagged</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Sort</Label>
                        <Select
                          value={reviewSort}
                          onValueChange={(value) => setReviewSort(value as any)}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="latest">Latest</SelectItem>
                            <SelectItem value="lowest">Lowest Rating</SelectItem>
                            <SelectItem value="highest">Highest Rating</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {reviewsLoading && (
                      <div className="flex items-center justify-center py-8 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Loading reviews...
                      </div>
                    )}
                    {reviews.map((review) => (
                      <div
                        key={review.id}
                        className="p-4 rounded-lg bg-background/50"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
                              <span className="text-sm font-semibold">
                                {review.studentName
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </span>
                            </div>
                            <div>
                              <p className="font-semibold">
                                {review.studentName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {review.date}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant="secondary" className="capitalize">
                              {review.reviewStatus || "visible"}
                            </Badge>
                            {review.isPinned ? (
                              <Badge variant="outline" className="uppercase text-[10px]">
                                Pinned
                              </Badge>
                            ) : null}
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`h-4 w-4 ${
                                    star <= review.rating
                                      ? "text-warning fill-warning"
                                      : "text-muted-foreground"
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                        <p className="text-muted-foreground mb-3">
                          {review.comment}
                        </p>
                        <p className="text-xs text-muted-foreground mb-3">
                          Context: {review.contextSectionTitle || "Course-level review"}
                        </p>
                        {(review.flagReason || review.moderationNote) && (
                          <div className="rounded border border-border/60 bg-background/40 p-2 mb-3 text-xs text-muted-foreground space-y-1">
                            {review.flagReason ? (
                              <p>
                                <span className="font-semibold text-foreground">Flag:</span>{" "}
                                {review.flagReason}
                              </p>
                            ) : null}
                            {review.moderationNote ? (
                              <p>
                                <span className="font-semibold text-foreground">Note:</span>{" "}
                                {review.moderationNote}
                              </p>
                            ) : null}
                          </div>
                        )}
                        {(review.instructorReply || review.acknowledgedAt) && (
                          <div className="rounded border border-border/60 bg-background/40 p-2 mb-3 text-xs text-muted-foreground space-y-1">
                            {review.acknowledgedAt ? (
                              <p>
                                <span className="font-semibold text-foreground">Acknowledged:</span>{" "}
                                {new Date(review.acknowledgedAt).toLocaleString()}
                              </p>
                            ) : null}
                            {review.instructorReply ? (
                              <p>
                                <span className="font-semibold text-foreground">Instructor reply:</span>{" "}
                                {review.instructorReply}
                              </p>
                            ) : null}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2">
                          {review.reviewStatus !== "hidden" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openReviewActionDialog(review, "hide")}
                              disabled={reviewActionId === String(review.id)}
                            >
                              {reviewActionId === String(review.id) ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                "Hide"
                              )}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openReviewActionDialog(review, "unhide")}
                              disabled={reviewActionId === String(review.id)}
                            >
                              {reviewActionId === String(review.id) ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                "Unhide"
                              )}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openReviewActionDialog(review, "flag")}
                            disabled={reviewActionId === String(review.id)}
                          >
                            {reviewActionId === String(review.id) ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Flag"
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openReviewActionDialog(review, "resolve")}
                            disabled={reviewActionId === String(review.id)}
                          >
                            {reviewActionId === String(review.id) ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Resolve"
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openReviewActionDialog(review, "acknowledge")}
                            disabled={reviewActionId === String(review.id)}
                          >
                            {reviewActionId === String(review.id) ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Acknowledge"
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openReviewActionDialog(review, "reply")}
                            disabled={reviewActionId === String(review.id)}
                          >
                            {reviewActionId === String(review.id) ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Reply"
                            )}
                          </Button>
                          {review.isPinned ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openReviewActionDialog(review, "unpin")}
                              disabled={reviewActionId === String(review.id)}
                            >
                              {reviewActionId === String(review.id) ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                "Unpin"
                              )}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openReviewActionDialog(review, "pin")}
                              disabled={reviewActionId === String(review.id)}
                            >
                              {reviewActionId === String(review.id) ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                "Pin"
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                    {!reviewsLoading && reviews.length === 0 && (
                      <div className="py-6 text-center space-y-3">
                        <p className="text-sm text-muted-foreground">
                          {hasActiveReviewFilters
                            ? "No reviews matched the current filters."
                            : "No reviews yet"}
                        </p>
                        {hasActiveReviewFilters ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setReviewSearchQuery("");
                              setReviewFilter("all");
                              setReviewSort("latest");
                              setReviewOffset(0);
                            }}
                          >
                            Clear search and filters
                          </Button>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            Students will be able to leave reviews once they complete the course.
                          </p>
                        )}
                      </div>
                    )}
                    {!reviewsLoading && reviewTotal > 0 && (
                      <div className="flex items-center justify-between pt-2">
                        <p className="text-xs text-muted-foreground">
                          Showing {Math.min(reviewOffset + 1, reviewTotal)}-
                          {Math.min(reviewOffset + REVIEW_PAGE_SIZE, reviewTotal)} of {reviewTotal}
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setReviewOffset((prev) => Math.max(0, prev - REVIEW_PAGE_SIZE))
                            }
                            disabled={reviewOffset === 0}
                          >
                            Previous
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setReviewOffset((prev) =>
                                reviewHasMore ? prev + REVIEW_PAGE_SIZE : prev
                              )
                            }
                            disabled={!reviewHasMore}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Actions */}
            <div className="gradient-card border border-border rounded-xl p-6">
              <h3 className="font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <Dialog
                  open={isEnrollDialogOpen}
                  onOpenChange={setIsEnrollDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button className="w-full gap-2">
                      <UserPlus className="h-4 w-4" />
                      Enroll Students
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Enroll Students</DialogTitle>
                      <DialogDescription>
                        Select students to enroll in this course
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input
                        placeholder="Search students..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      <div className="max-h-96 overflow-y-auto space-y-2">
                        {filteredAvailableStudents.length === 0 ? (
                          <div className="text-center py-8">
                            <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                            <p className="text-muted-foreground">
                              {searchQuery
                                ? "No students found matching your search"
                                : "No available students to enroll"}
                            </p>
                          </div>
                        ) : (
                          filteredAvailableStudents.map((student) => (
                            <div
                              key={student.id}
                              className={`flex items-center justify-between p-3 border rounded cursor-pointer transition-colors ${
                                selectedStudents.includes(student.id)
                                  ? "border-primary bg-primary/10"
                                  : "border-border hover:bg-muted/10"
                              }`}
                              onClick={() => toggleStudentSelection(student.id)}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                    selectedStudents.includes(student.id)
                                      ? "border-primary bg-primary"
                                      : "border-muted-foreground"
                                  }`}
                                >
                                  {selectedStudents.includes(student.id) && (
                                    <svg
                                      className="w-3 h-3 text-white"
                                      fill="none"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="2"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                    >
                                      <path d="M5 13l4 4L19 7"></path>
                                    </svg>
                                  )}
                                </div>
                                <div>
                                  <div className="font-medium">
                                    {student.name}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {student.email}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsEnrollDialogOpen(false);
                          setSelectedStudents([]);
                          setSearchQuery("");
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleEnrollStudents}
                        disabled={selectedStudents.length === 0 || isEnrolling}
                      >
                        {isEnrolling ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Enrolling...
                          </>
                        ) : (
                          <>
                            Enroll {selectedStudents.length}{" "}
                            {selectedStudents.length === 1
                              ? "Student"
                              : "Students"}
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() =>
                    navigate(`/course/${courseId}/students`, {
                      state: { courseName: course.title },
                    })
                  }
                >
                  View Enrolled Students{" "}
                  {course.enrolledCount > 0 ? `(${course.enrolledCount})` : ""}
                </Button>
                <Dialog open={isMessageAllDialogOpen} onOpenChange={setIsMessageAllDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline"  className="w-full gap-2">
                      <Megaphone className="h-4 w-4" />
                      Create Announcement
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Create Announcement</DialogTitle>
                      <DialogDescription>
                        Send a notification to all students enrolled in this course.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <textarea
                        value={messageToAll || ""}
                        onChange={(e) =>
                          setMessageToAll(e.target.value)
                        }
                        rows={3}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500 resize-none"
                      />
                      <Button
                        onClick={() => {
                          sendMessageToAll();
                        }}
                        className="w-full gap-2"
                      >
                        <Megaphone className="h-4 w-4" />
                          Create Announcement
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Enrolled Students Preview */}
            <div className="gradient-card border border-border rounded-xl p-6">
              <h3 className="font-semibold mb-4">Recently Active Students</h3>
              {enrolledStudents.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground text-sm">
                    No students enrolled yet
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Use the "Enroll Students" button to add students to this
                    course
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {enrolledStudents.slice(0, 5).map((student) => (
                    <div key={student.id} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{student.name}</span>
                        <span className="text-muted-foreground">
                          {student.progress || 0}%
                        </span>
                      </div>
                      <div className="space-y-1">
                        <Progress value={student.progress || 0} />
                      </div>
                      <div className="text-xs text-muted-foreground mb-2">
                        Last active: {student.lastActive || "Never"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Course Stats */}
            <div className="gradient-card border border-border rounded-xl p-6">
              <h3 className="font-semibold mb-4">Course Statistics</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span className="font-medium">{course.createdDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Updated</span>
                  <span className="font-medium">{course.lastUpdated}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Dialog
        open={isReviewActionDialogOpen}
        onOpenChange={(open) => {
          setIsReviewActionDialogOpen(open);
          if (!open) {
            setPendingReviewAction(null);
            setReviewActionNote("");
            setReviewActionFlagReason("");
            setReviewActionReply("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Review</DialogTitle>
            <DialogDescription>
              {pendingReviewAction
                ? `You are about to mark this review as ${
                    pendingReviewAction.action === "hide"
                      ? "hidden"
                      : pendingReviewAction.action === "unhide"
                        ? "visible"
                      : pendingReviewAction.action === "flag"
                          ? "flagged"
                          : pendingReviewAction.action === "resolve"
                            ? "resolved"
                            : pendingReviewAction.action === "acknowledge"
                              ? "acknowledged"
                              : pendingReviewAction.action === "reply"
                                ? "replied"
                                : pendingReviewAction.action === "pin"
                                  ? "pinned"
                                  : "unpinned"
                  }.`
                : "Confirm review action."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {pendingReviewAction?.action === "flag" ? (
              <div className="space-y-2">
                <Label htmlFor="review-flag-reason">Flag reason (optional)</Label>
                <Input
                  id="review-flag-reason"
                  value={reviewActionFlagReason}
                  onChange={(event) => setReviewActionFlagReason(event.target.value)}
                  placeholder="Needs instructor follow-up"
                />
              </div>
            ) : null}
            {pendingReviewAction?.action === "reply" ? (
              <div className="space-y-2">
                <Label htmlFor="review-reply">Instructor reply</Label>
                <Textarea
                  id="review-reply"
                  value={reviewActionReply}
                  onChange={(event) => setReviewActionReply(event.target.value)}
                  placeholder="Write a response to the learner..."
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  A reply is required for this action.
                </p>
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="review-note">Internal note (optional)</Label>
              <Textarea
                id="review-note"
                value={reviewActionNote}
                onChange={(event) => setReviewActionNote(event.target.value)}
                placeholder="Add moderation context for your team."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsReviewActionDialogOpen(false);
                setPendingReviewAction(null);
                setReviewActionNote("");
                setReviewActionFlagReason("");
                setReviewActionReply("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReviewAction}
              disabled={
                !pendingReviewAction ||
                reviewActionId === String(pendingReviewAction.review.id) ||
                (pendingReviewAction.action === "reply" && reviewActionReply.trim().length === 0)
              }
            >
              {pendingReviewAction && reviewActionId === String(pendingReviewAction.review.id) ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Confirm"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CourseDetail;
