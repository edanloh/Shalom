import { useState, useEffect, useRef } from "react";
import { Header } from "@/components/Header";
import { StatsCard } from "@/components/StatsCard";
import { CourseCard } from "@/components/CourseCard";
import { QuickActions } from "@/components/QuickActions";
import { ActivityFeed } from "@/components/ActivityFeed";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import {
  Users,
  TrendingUp,
  Star,
  DollarSign,
  BookOpen,
  ArrowRight,
  UserPlus,
  Loader2,
  Plus,
  Check,
  Trash2,
} from "lucide-react";
import { courseService, instructorTaskService } from "@/services";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const defaultUserId = user?.id || "550e8400-e29b-41d4-a716-446655440201";
  const { toast } = useToast();

  // State for API data
  const [courses, setCourses] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [highlightedCourseId, setHighlightedCourseId] = useState<string | null>(
    null,
  );
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskSaving, setTaskSaving] = useState(false);
  const [taskActionId, setTaskActionId] = useState<string | null>(null);
  const [taskActionType, setTaskActionType] = useState<"complete" | "delete" | null>(null);
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);

  // Refs for scrolling to sections
  const draftSectionRef = useRef<HTMLDivElement>(null);
  const activeSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async (newlyDuplicatedCourseId?: string) => {
    try {
      setLoading(true);
      setError(null);

      // Get admin ID from user (fallback to mock for now)
      const adminId = defaultUserId;

      // Fetch courses and admin stats in parallel using courseService
      const [coursesData, statsData] = await Promise.all([
        courseService.getCourses({ sortBy: "updated_at", sortOrder: "desc" }),
        courseService.getInstructorStats(adminId),
      ]);

      setCourses(coursesData);
      setStats(statsData);
      // If we just duplicated a course, highlight it and scroll to it
      if (newlyDuplicatedCourseId) {
        setHighlightedCourseId(newlyDuplicatedCourseId);

        // Scroll to draft section after courses are loaded
        setTimeout(() => {
          draftSectionRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }, 100);

        // Remove highlight after 3 seconds
        setTimeout(() => {
          setHighlightedCourseId(null);
        }, 3000);
      }
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch dashboard data",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async () => {
    if (!taskTitle.trim()) {
      toast({
        title: "Task title required",
        description: "Add a short title for the task.",
        variant: "destructive",
      });
      return;
    }

    const resolvedDueDate = taskDueDate
      ? new Date(taskDueDate).toISOString()
      : null;

    try {
      setTaskSaving(true);
      await instructorTaskService.createTask({
        instructorId: defaultUserId,
        title: taskTitle.trim(),
        dueAt: resolvedDueDate,
      });
      toast({
        title: "Task added",
        description: "Your task has been added to Pending Tasks.",
      });
      setTaskTitle("");
      setTaskDueDate("");
      setIsTaskDialogOpen(false);
      await fetchDashboardData();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to add task.";
      toast({
        title: "Task not saved",
        description: message,
        variant: "destructive",
      });
    } finally {
      setTaskSaving(false);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      setTaskActionId(taskId);
      setTaskActionType("complete");
      await instructorTaskService.completeTask(taskId);
      toast({
        title: "Task completed",
        description: "Nice work. Task removed from the list.",
      });
      await fetchDashboardData();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to complete task.";
      toast({
        title: "Task not updated",
        description: message,
        variant: "destructive",
      });
    } finally {
      setTaskActionId(null);
      setTaskActionType(null);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      setTaskActionId(taskId);
      setTaskActionType("delete");
      await instructorTaskService.deleteTask(taskId);
      toast({
        title: "Task deleted",
        description: "Task removed from the list.",
      });
      await fetchDashboardData();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to delete task.";
      toast({
        title: "Task not deleted",
        description: message,
        variant: "destructive",
      });
    } finally {
      setTaskActionId(null);
      setTaskActionType(null);
    }
  };

  // Separate courses into published and draft
  const publishedCourses = courses.filter(
    (course) => course.status === "published",
  );
  const draftCourses = courses.filter((course) => course.status === "draft");

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-6 py-8">
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-6 py-8 space-y-8">
        {/* Welcome Section */}
        <section className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground">
            Welcome Back,{" "}
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              {user?.name || "Instructor"}
            </span>
          </h1>
          <p className="text-muted-foreground text-lg">
            Here's what's happening with your courses today
          </p>
        </section>

        {/* Stats Grid */}
        {stats && (
          <section className="flex gap-6 overflow-hidden p-2">
            {(() => {
              const statistics = stats?.statistics || {};
              const publishedEnrollments =
                statistics.published_enrollments_last_30_days ??
                statistics.new_enrollments_this_month ??
                0;
              const totalEnrollments =
                statistics.total_enrollments_last_30_days ??
                statistics.new_enrollments_this_month ??
                0;

              return (
                <>
            <StatsCard
              title="Total Students"
              value={(statistics.total_students ?? 0).toLocaleString()}
              icon={Users}
              trend={`${statistics.active_students ?? 0} active`}
              variant="default"
              className="flex-1 w-full min-w-[180px] max-w-[250px]"
            />
            <StatsCard
              title="Avg Completion"
              value={`${statistics.average_completion_rate ?? 0}%`}
              icon={TrendingUp}
              trend={`${statistics.completed_courses ?? 0} completed`}
              variant="success"
              className="flex-1 w-full min-w-[180px] max-w-[250px]"
            />
            <StatsCard
              title="Course Rating"
              value={statistics.average_rating ?? "0"}
              icon={Star}
              trend="Across all published courses"
              variant="secondary"
              className="flex-1 w-full min-w-[180px] max-w-[250px]"
            />
            <StatsCard
              title="Enrollments (Published)"
              value={String(publishedEnrollments)}
              icon={UserPlus}
              trend="Last 30 days"
              variant="accent"
              className="flex-1 w-full min-w-[180px] max-w-[250px]"
            />
            <StatsCard
              title="Enrollments (All Courses)"
              value={String(totalEnrollments)}
              icon={DollarSign}
              trend="Last 30 days"
              variant="warning"
              className="flex-1 w-full min-w-[180px] max-w-[250px]"
            />
                </>
              );
            })()}
          </section>
        )}

        {/* Quick Actions */}
        <QuickActions />

        {/* Active Courses Section */}
        <section ref={activeSectionRef} className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                Active Courses
              </h2>
              <p className="text-muted-foreground">Your published courses</p>
            </div>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => navigate("/courses")}
            >
              View All
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          {publishedCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {publishedCourses.map((course) => (
                <div
                  key={course.id}
                  className={`transition-all duration-500 ${
                    highlightedCourseId === course.id
                      ? "ring-4 ring-primary ring-offset-4 ring-offset-background rounded-lg"
                      : ""
                  }`}
                >
                  <CourseCard
                    {...course}
                    onCourseUpdated={(duplicatedCourseId) =>
                      fetchDashboardData(duplicatedCourseId)
                    }
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
              <p className="text-muted-foreground">No published courses yet</p>
            </div>
          )}
        </section>

        {/* Draft Courses Section */}
        <section ref={draftSectionRef} className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                Draft Courses
              </h2>
              <p className="text-muted-foreground">Courses in development</p>
            </div>
            {draftCourses.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {draftCourses.length}{" "}
                {draftCourses.length === 1 ? "draft" : "drafts"}
              </span>
            )}
          </div>

          {draftCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {draftCourses.map((course) => (
                <div
                  key={course.id}
                  className={`transition-all duration-500 ${
                    highlightedCourseId === course.id
                      ? "ring-4 ring-primary ring-offset-4 ring-offset-background rounded-lg"
                      : ""
                  }`}
                >
                  <CourseCard
                    {...course}
                    onCourseUpdated={(duplicatedCourseId) =>
                      fetchDashboardData(duplicatedCourseId)
                    }
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
              <p className="text-muted-foreground">No draft courses</p>
            </div>
          )}
        </section>

        {/* Bottom Grid - Activity & Insights */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {stats &&
            stats.recent_activity &&
            stats.recent_activity.length > 0 ? (
              <div className="gradient-card border-border rounded-xl p-6 h-[450px] flex flex-col">
                <h3 className="text-lg font-semibold mb-4 text-foreground">
                  Recent Activity
                </h3>
                <div className="space-y-3 overflow-y-auto pr-2 flex-1">
                  {stats.recent_activity
                    .slice(0, 8)
                    .map((activity: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-center gap-4 p-3 rounded-lg bg-background/50"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">
                            {activity.student_name} enrolled in{" "}
                            {activity.course_title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {activity.formatted_date}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              <div className="h-[450px]">
                <ActivityFeed />
              </div>
            )}
          </div>

          <div className="space-y-6">
            {/* Pending Tasks */}
            <div className="gradient-card border-border rounded-xl p-6 h-[450px] flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Pending Tasks
                </h3>
                <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add Task
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Add Manual Task</DialogTitle>
                      <DialogDescription>
                        Create a personal task that will appear in Pending Tasks.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Title</Label>
                        <Input
                          placeholder="e.g. Prepare cohort kickoff"
                          value={taskTitle}
                          onChange={(event) => setTaskTitle(event.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Due Date (optional)</Label>
                        <Input
                          type="date"
                          value={taskDueDate}
                          onChange={(event) => setTaskDueDate(event.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsTaskDialogOpen(false)}
                        disabled={taskSaving}
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleCreateTask} disabled={taskSaving}>
                        {taskSaving ? "Saving..." : "Save Task"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="flex-1 min-h-0">
                {stats?.pending_tasks?.length > 0 ? (
                  <div className="flex h-full min-h-0 flex-col gap-4">
                    {(() => {
                      const derivedTaskIds = new Set([
                        "assignment_grading",
                        "unread_messages",
                      ]);
                      const derivedTasks = stats.pending_tasks.filter((task: any) =>
                        derivedTaskIds.has(task.id)
                      );
                      const customTasks = stats.pending_tasks.filter(
                        (task: any) => !derivedTaskIds.has(task.id)
                      );

                      return (
                        <>
                          <div className="min-h-0 flex-1 flex flex-col gap-2">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                              Custom Tasks
                            </p>
                            <div
                              className={`min-h-0 flex-1 ${
                                customTasks.length > 0
                                  ? "space-y-3 overflow-y-auto pr-2"
                                  : "flex items-center justify-center"
                              }`}
                            >
                              {customTasks.length > 0 ? (
                                customTasks.map((task: any) => (
                                  <div
                                    key={task.id}
                                    className="flex items-center justify-between p-3 rounded-lg bg-background/50"
                                  >
                                    <span className="text-sm text-foreground">
                                      {task.title}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => handleCompleteTask(task.id)}
                                        disabled={
                                          taskActionId === task.id &&
                                          taskActionType === "complete"
                                        }
                                        aria-label="Mark task complete"
                                      >
                                        {taskActionId === task.id &&
                                        taskActionType === "complete" ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          <Check className="h-4 w-4" />
                                        )}
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => handleDeleteTask(task.id)}
                                        disabled={
                                          taskActionId === task.id &&
                                          taskActionType === "delete"
                                        }
                                        aria-label="Delete task"
                                      >
                                        {taskActionId === task.id &&
                                        taskActionType === "delete" ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          <Trash2 className="h-4 w-4" />
                                        )}
                                      </Button>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="text-sm text-muted-foreground">
                                  No custom tasks yet
                                </div>
                              )}
                            </div>
                          </div>
                          {derivedTasks.length > 0 && (
                            <div className="space-y-2 shrink-0">
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                System Tasks
                              </p>
                              <div className="space-y-3">
                                {derivedTasks.map((task: any) => {
                                  const systemTaskRoutes: Record<string, string> = {
                                    assignment_grading: "/assessments",
                                    unread_messages: "/messages",
                                  };
                                  const route = systemTaskRoutes[task.id];

                                  return (
                                    <div
                                      key={task.id}
                                      role={route ? "button" : undefined}
                                      tabIndex={route ? 0 : undefined}
                                      onClick={() => route && navigate(route)}
                                      onKeyDown={(event) => {
                                        if (!route) return;
                                        if (event.key === "Enter" || event.key === " ") {
                                          event.preventDefault();
                                          navigate(route);
                                        }
                                      }}
                                      className={`flex items-center justify-between p-3 rounded-lg bg-background/50 ${
                                        route ? "cursor-pointer hover:bg-background/70" : ""
                                      }`}
                                    >
                                      <span className="text-sm text-foreground">
                                        {task.title}
                                      </span>
                                      <span className="font-bold text-primary">
                                        {task.count}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                          {stats?.completed_tasks?.length > 0 && (
                            <div className="space-y-2 shrink-0">
                              <div className="flex items-center justify-between">
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                  Completed Tasks
                                </p>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setShowCompletedTasks((prev) => !prev)}
                                >
                                  {showCompletedTasks ? "Hide" : "Show"}
                                </Button>
                              </div>
                              {showCompletedTasks && (
                                <div className="space-y-3">
                                  {stats.completed_tasks.map((task: any) => (
                                    <div
                                      key={task.id}
                                      className="flex items-center justify-between p-3 rounded-lg bg-success/10 border border-success/20"
                                    >
                                      <span className="text-sm text-muted-foreground">
                                        {task.title}
                                      </span>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => handleDeleteTask(task.id)}
                                        disabled={
                                          taskActionId === task.id &&
                                          taskActionType === "delete"
                                        }
                                        aria-label="Delete task"
                                      >
                                        {taskActionId === task.id &&
                                        taskActionType === "delete" ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          <Trash2 className="h-4 w-4" />
                                        )}
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-background/50 text-sm text-muted-foreground">
                    No pending tasks
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Index;
