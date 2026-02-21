import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { StatsCard } from "@/components/StatsCard";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Users,
  TrendingUp,
  Clock,
  Target,
  Download,
  Search,
  Award,
  BookOpen,
  GraduationCap,
  BarChart3,
  HelpCircle,
} from "lucide-react";
import { analyticsService, type InstructorAnalytics } from "@/services";
import { useAuth } from "@/contexts/AuthContext";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useToast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const Analytics = () => {
  const [dateFilter, setDateFilter] = useState("30");
  const [viewMode, setViewMode] = useState<"all" | "course">("all");
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [analytics, setAnalytics] = useState<InstructorAnalytics | null>(null);
  const [courseAnalytics, setCourseAnalytics] = useState<InstructorAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const tooltipWrapperStyle = { pointerEvents: "none" } as const;
  const { toast } = useToast();
  const { user } = useAuth();
  const defaultUserId = user?.id;
  const SectionHelp = ({
    title,
    items,
  }: {
    title: string;
    items: Array<{ label: string; formula: string; className: string }>;
  }) => (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Analytics help"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" align="start" className="max-w-xs text-sm">
          <div className="space-y-2">
            <p className="font-semibold text-foreground">{title}</p>
            <div className="space-y-1.5">
              {items.map((item) => (
                <p key={item.label} className={`text-sm ${item.className}`}>
                  {item.label}: {item.formula}
                </p>
              ))}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);
        if (!defaultUserId) {
          setAnalytics(null);
          return;
        }
        const data = await analyticsService.getInstructorAnalytics(defaultUserId, {
          days: Number(dateFilter),
        });
        setAnalytics(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load analytics";
        setError(message);
        toast({
          title: "Analytics unavailable",
          description: message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [dateFilter, defaultUserId, toast]);

  useEffect(() => {
    const loadCourseAnalytics = async () => {
      if (!selectedCourseId) {
        setCourseAnalytics(null);
        return;
      }
      try {
        if (!defaultUserId) {
          setCourseAnalytics(null);
          return;
        }
        const data = await analyticsService.getInstructorAnalytics(defaultUserId, {
          days: Number(dateFilter),
          courseId: selectedCourseId,
        });
        setCourseAnalytics(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load course analytics";
        toast({
          title: "Course analytics unavailable",
          description: message,
          variant: "destructive",
        });
      }
    };

    loadCourseAnalytics();
  }, [dateFilter, selectedCourseId, defaultUserId, toast]);

  useEffect(() => {
    if (viewMode === "course") {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [viewMode, selectedCourseId]);

  const allCourses = analytics?.courses ?? [];
  const overallEngagementAvg = useMemo(() => {
    const items = analytics?.course_performance ?? [];
    if (items.length === 0) return null;
    return items.reduce((sum, item) => sum + item.engagement, 0) / items.length;
  }, [analytics]);
  const overallCompletionAvg = useMemo(() => {
    const items = analytics?.course_performance ?? [];
    if (items.length === 0) return null;
    return items.reduce((sum, item) => sum + item.completion, 0) / items.length;
  }, [analytics]);
  const overallRatingAvg = analytics?.summary?.average_rating ?? null;
  const enrollmentTrend = courseAnalytics?.enrollment_trend ?? [];
  const enrollmentMonthly = courseAnalytics?.enrollment_monthly ?? null;
  const enrollmentTrendText = useMemo(() => {
    if (enrollmentMonthly) {
      const last = enrollmentMonthly.current.students ?? 0;
      const prev = enrollmentMonthly.previous.students ?? 0;
      if (prev === 0) return last === 0 ? "No change from last month" : "+100% from last month";
      const delta = ((last - prev) / prev) * 100;
      return `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}% from last month`;
    }
    if (enrollmentTrend.length < 2) return `Last ${dateFilter} days`;
    const last = enrollmentTrend[enrollmentTrend.length - 1]?.students ?? 0;
    const prev = enrollmentTrend[enrollmentTrend.length - 2]?.students ?? 0;
    if (prev === 0) return last === 0 ? "No change from last month" : "+100% from last month";
    const delta = ((last - prev) / prev) * 100;
    return `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}% from last month`;
  }, [enrollmentTrend, enrollmentMonthly, dateFilter]);
  const filteredCourses = allCourses.filter((course) =>
    course.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const enrollmentData = useMemo(() => analytics?.enrollment_trend ?? [], [analytics]);
  const courseEnrollmentData = useMemo(() => {
    if (selectedCourseId) {
      return courseAnalytics?.enrollment_trend ?? [];
    }
    return enrollmentData;
  }, [selectedCourseId, courseAnalytics, enrollmentData]);
  const hasEnrollmentData = useMemo(
    () => enrollmentData.some((point) => Number(point.students || 0) > 0),
    [enrollmentData]
  );
  const hasCourseEnrollmentData = useMemo(
    () => courseEnrollmentData.some((point) => Number(point.students || 0) > 0),
    [courseEnrollmentData]
  );

  const completionData =
    analytics?.completion_breakdown?.map((entry) => {
      const colorMap: Record<string, string> = {
        Completed: "hsl(var(--success))",
        "In Progress": "hsl(var(--primary))",
        "Not Started": "hsl(var(--muted))",
      };
      return { ...entry, color: colorMap[entry.name] || "hsl(var(--muted))" };
    }) ?? [];
  const hasCompletionDistributionData = useMemo(
    () => completionData.some((entry) => Number(entry.value || 0) > 0),
    [completionData]
  );

  const studentActivityData = analytics?.activity_by_day ?? [];
  const hasStudentActivityData = useMemo(
    () => studentActivityData.some((entry) => Number(entry.active || 0) > 0),
    [studentActivityData]
  );

  const categoryPerformance = analytics?.category_performance ?? [];
  const hasCategoryPerformanceData = useMemo(
    () => categoryPerformance.some((entry) => Number(entry.value || 0) > 0),
    [categoryPerformance]
  );
  const useCategoryBarFallback = categoryPerformance.length > 0 && categoryPerformance.length < 3;
  const cohortAnalytics = analytics?.cohort_analytics ?? [];

  const coursePerformance =
    analytics?.course_performance ??
    allCourses.map((c) => ({
      course: c.name,
      engagement: c.engagement,
      completion: c.completion,
    }));
  const hasCoursePerformanceData = useMemo(
    () =>
      coursePerformance.some(
        (entry) =>
          Number(entry.engagement || 0) > 0 || Number(entry.completion || 0) > 0
      ),
    [coursePerformance]
  );

  // Custom tick component with responsive width-based formatting
  const CustomXAxisTick = ({ x, y, payload, width }: any) => {
    const text = payload.value;
    const numCourses = coursePerformance.length;
    const chartWidth = width || 800; // fallback width
    const availableWidthPerLabel = chartWidth / numCourses;

    // Calculate if we need to wrap or angle based on available space
    // Approximate: 7px per character for 12px font
    const estimatedTextWidth = text.length * 7;

    // If text fits in one line with padding (80% of available space)
    if (estimatedTextWidth < availableWidthPerLabel * 0.8) {
      return (
        <g transform={`translate(${x},${y})`}>
          <text
            x={0}
            y={0}
            dy={16}
            textAnchor="middle"
            fill="hsl(var(--muted-foreground))"
            fontSize={12}
          >
            {text}
          </text>
        </g>
      );
    }

    // If text can fit in 2-3 lines
    const maxCharsPerLine = Math.floor((availableWidthPerLabel * 0.8) / 7);
    if (maxCharsPerLine >= 10 && text.length <= maxCharsPerLine * 3) {
      const words = text.split(" ");
      const lines: string[] = [];
      let currentLine = "";

      words.forEach((word) => {
        if ((currentLine + " " + word).length <= maxCharsPerLine) {
          currentLine += (currentLine ? " " : "") + word;
        } else {
          if (currentLine) lines.push(currentLine);
          currentLine = word;
        }
      });
      if (currentLine) lines.push(currentLine);

      // Limit to 3 lines
      if (lines.length <= 3) {
        return (
          <g transform={`translate(${x},${y})`}>
            {lines.map((line, i) => (
              <text
                key={i}
                x={0}
                y={0}
                dy={16 + i * 14}
                textAnchor="middle"
                fill="hsl(var(--muted-foreground))"
                fontSize={11}
              >
                {line}
              </text>
            ))}
          </g>
        );
      }
    }

    // Otherwise, use angled text with truncation
    const maxLength = 25;
    const truncated =
      text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;

    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0}
          y={0}
          dy={5}
          dx={-5}
          textAnchor="end"
          fill="hsl(var(--muted-foreground))"
          fontSize={11}
          transform="rotate(-35)"
        >
          {truncated}
        </text>
      </g>
    );
  };

  const selectedCourse = allCourses.find((c) => c.id === selectedCourseId);
  const ratingTrendText = useMemo(() => {
    if (overallRatingAvg === null) return `Last ${dateFilter} days`;
    const delta = Number(selectedCourse?.rating || 0) - overallRatingAvg;
    if (Math.abs(delta) < 0.01) return "On par with average";
    return delta > 0 ? "Above average" : "Below average";
  }, [overallRatingAvg, selectedCourse, dateFilter]);
  const completionTrendText = useMemo(() => {
    if (overallCompletionAvg === null) return `Last ${dateFilter} days`;
    const delta = Number(selectedCourse?.completion || 0) - overallCompletionAvg;
    const formatted = `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`;
    return `${formatted} vs target`;
  }, [overallCompletionAvg, selectedCourse, dateFilter]);
  const engagementTrendText = useMemo(() => {
    if (overallEngagementAvg === null) return `Last ${dateFilter} days`;
    const delta = Number(selectedCourse?.engagement || 0) - overallEngagementAvg;
    if (Math.abs(delta) < 1) return "On track";
    return delta > 0 ? "High engagement" : "Low engagement";
  }, [overallEngagementAvg, selectedCourse, dateFilter]);

  const singleCourseModuleData =
    courseAnalytics?.course_details?.module_performance ?? [];
  const hasSingleCourseModuleData = useMemo(
    () =>
      singleCourseModuleData.some(
        (entry) =>
          Number(entry.completion || 0) > 0 || Number(entry.avgScore || 0) > 0
      ),
    [singleCourseModuleData]
  );

  const singleCourseTimeData =
    courseAnalytics?.course_details?.weekly_study_time ?? [];
  const hasSingleCourseStudyTimeData = useMemo(
    () => singleCourseTimeData.some((entry) => Number(entry.hours || 0) > 0),
    [singleCourseTimeData]
  );
  const courseCohortMetrics = courseAnalytics?.course_details?.cohort_metrics ?? null;
  const visibleInsights = useMemo(() => {
    if (viewMode === "course") {
      if (!selectedCourseId) return [];
      return courseAnalytics?.insights ?? [];
    }
    return analytics?.insights ?? [];
  }, [viewMode, selectedCourseId, courseAnalytics, analytics]);

  const insightsTitle = useMemo(() => {
    if (viewMode === "course" && selectedCourse?.name) {
      return `Optimization Insights · ${selectedCourse.name}`;
    }
    return "Optimization Insights";
  }, [viewMode, selectedCourse?.name]);

  const insightsEmptyMessage =
    viewMode === "course" && !selectedCourseId
      ? "Select a course to view scoped optimization insights."
      : "No major optimization risks detected for the selected view.";

  const getInsightSeverityTone = (severity: "high" | "medium" | "low") => {
    if (severity === "high") {
      return "bg-destructive/15 text-destructive border border-destructive/40";
    }
    if (severity === "medium") {
      return "bg-warning/15 text-warning border border-warning/40";
    }
    return "bg-muted text-muted-foreground border border-border";
  };

  const getInsightTypeLabel = (type: InstructorAnalytics["insights"][number]["type"]) => {
    switch (type) {
      case "low_completion":
        return "Low Completion";
      case "low_engagement":
        return "Low Engagement";
      case "low_rating":
        return "Low Rating";
      case "negative_trend":
        return "Negative Trend";
      case "high_drop_off":
        return "High Drop-off";
      case "rating_decline":
        return "Rating Decline";
      default:
        return "Insight";
    }
  };

  const getInsightMetricSummary = (
    insight: InstructorAnalytics["insights"][number]
  ): string | null => {
    const m = insight.supporting_metrics || {};
    if (insight.type === "high_drop_off") {
      return `Drop-off ${Number(m.dropoff_percent || 0).toFixed(1)}%`;
    }
    if (insight.type === "low_completion") {
      const value = Number(m.module_completion_percent ?? m.completion_percent ?? 0);
      const threshold = Number(m.threshold_percent || 0);
      return `Completion ${value.toFixed(1)}% vs threshold ${threshold.toFixed(1)}%`;
    }
    if (insight.type === "low_engagement") {
      const value = Number(m.module_engagement_percent ?? m.engagement_percent ?? 0);
      const threshold = Number(m.threshold_percent || 0);
      return `Engagement ${value.toFixed(1)}% vs threshold ${threshold.toFixed(1)}%`;
    }
    if (insight.type === "low_rating") {
      const rating = Number(m.rating || 0);
      const sample = Number(m.rating_sample_count || 0);
      return `Rating ${rating.toFixed(2)} / 5 (${sample} reviews)`;
    }
    if (insight.type === "rating_decline") {
      const delta = Number(m.rating_delta || 0);
      return `Rating delta ${delta.toFixed(2)} (${Number(m.previous_period_rating || 0).toFixed(2)} -> ${Number(m.recent_period_rating || 0).toFixed(2)})`;
    }
    if (insight.type === "negative_trend") {
      const delta = Number(m.trend_delta || 0);
      return `Trend delta ${delta.toFixed(2)} points`;
    }
    return null;
  };

  const handleExport = () => {
    const data = selectedCourseId ? courseAnalytics : analytics;
    if (!data) {
      toast({
        title: "Export unavailable",
        description: "No analytics data to export yet.",
        variant: "destructive",
      });
      return;
    }

    const lines: string[] = [];
    const addSection = (title: string) => {
      lines.push(title);
    };
    const addRow = (row: Array<string | number | null | undefined>) => {
      const escaped = row.map((cell) => {
        const value = cell ?? "";
        const text = String(value);
        return text.includes(",") || text.includes('"') || text.includes("\n")
          ? `"${text.replace(/"/g, '""')}"`
          : text;
      });
      lines.push(escaped.join(","));
    };

    addSection("Summary");
    addRow(["Metric", "Value"]);
    addRow(["Total Enrolled", data.summary.total_enrolled]);
    addRow(["Average Engagement", `${data.summary.average_engagement}%`]);
    addRow(["Study Hours", data.summary.study_hours]);
    addRow(["Goal Completion", `${data.summary.goal_completion}%`]);
    addRow(["Average Rating", data.summary.average_rating]);
    lines.push("");

    addSection("Course Performance");
    addRow(["Course", "Students", "Rating", "Completion %", "Engagement %"]);
    data.courses.forEach((course) => {
      addRow([
        course.name,
        course.students,
        course.rating,
        course.completion,
        course.engagement,
      ]);
    });
    lines.push("");

    addSection("Enrollment Trend");
    addRow(["Period", "Enrollments"]);
    data.enrollment_trend.forEach((point) => {
      addRow([point.month, point.students]);
    });
    lines.push("");

    addSection("Completion Breakdown");
    addRow(["Status", "Count"]);
    data.completion_breakdown.forEach((item) => {
      addRow([item.name, item.value]);
    });
    lines.push("");

    addSection("Weekly Activity");
    addRow(["Day", "Active", "Inactive"]);
    data.activity_by_day.forEach((item) => {
      addRow([item.day, item.active, item.inactive]);
    });
    lines.push("");

    addSection("Category Performance");
    addRow(["Category", "Score"]);
    data.category_performance.forEach((item) => {
      addRow([item.category, item.value]);
    });
    lines.push("");

    if (selectedCourseId) {
      addSection("Module Performance");
      addRow(["Module", "Completion %", "Avg Score %"]);
      data.course_details.module_performance.forEach((item) => {
        addRow([item.module, item.completion, item.avgScore]);
      });
      lines.push("");

      addSection("Weekly Study Time");
      addRow(["Week", "Hours"]);
      data.course_details.weekly_study_time.forEach((item) => {
        addRow([item.week, item.hours]);
      });
      lines.push("");
    }

    const csv = lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const fileSuffix = selectedCourseId ? `course-${selectedCourseId}` : "all-courses";
    link.href = url;
    link.download = `analytics-${fileSuffix}-${dateFilter}d.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export complete",
      description: "Analytics CSV has been downloaded.",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-6 py-8">
          <div className="flex justify-center items-center py-12">
            <BarChart3 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-6 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Analytics Dashboard
            </h1>
            <p className="text-muted-foreground">
              Track your teaching performance and student progress
            </p>
          </div>

          <div className="flex gap-3">
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2" onClick={handleExport}>
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {error && (
          <Card className="p-4 border border-destructive/30 bg-destructive/10 text-destructive">
            {error}
          </Card>
        )}

        {/* View Mode Tabs */}
        <Tabs
          value={viewMode}
          onValueChange={(v) => {
            const newMode = v as "all" | "course";
            setViewMode(newMode);
            if (newMode === "all") {
              setSelectedCourseId("");
              setSearchQuery("");
            }
          }}
          className="mb-6"
        >
          <TabsList>
            <TabsTrigger value="all">All Courses</TabsTrigger>
            <TabsTrigger value="course">By Courses</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-6 mt-6">
            <Card className="p-6 gradient-card border-border">
              <h3 className="text-lg font-semibold mb-4 text-foreground flex items-center gap-2">
                <Target className="h-5 w-5 text-warning" />
                {insightsTitle}
              </h3>
              {visibleInsights.length > 0 ? (
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {visibleInsights.map((insight) => (
                    <div
                      key={insight.id}
                      className="rounded-lg border border-border bg-background/40 p-3"
                    >
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] uppercase tracking-wide px-2 py-0.5 rounded-full border border-border/60 bg-background/60 text-muted-foreground">
                            {getInsightTypeLabel(insight.type)}
                          </span>
                          <span
                            className={`text-[11px] uppercase tracking-wide px-2 py-0.5 rounded-full ${getInsightSeverityTone(
                              insight.severity
                            )}`}
                          >
                            {insight.severity}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm font-semibold">
                        {insight.target?.name || "Course"}
                      </p>
                      <p className="text-sm mt-1">{insight.message}</p>
                      {getInsightMetricSummary(insight) ? (
                        <p className="text-xs mt-2 text-muted-foreground">
                          Trigger: {getInsightMetricSummary(insight)}
                        </p>
                      ) : null}
                      <p className="text-xs mt-2 opacity-90">
                        Action: {insight.recommended_action}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{insightsEmptyMessage}</p>
              )}
            </Card>

            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatsCard
                title="Total Enrolled"
                value={(analytics?.summary.total_enrolled ?? 0).toLocaleString()}
                icon={Users}
                trend={`Last ${dateFilter} days`}
                variant="default"
              />
              <StatsCard
                title="Avg Engagement"
                value={`${analytics?.summary.average_engagement ?? 0}%`}
                icon={TrendingUp}
                trend="Across courses"
                variant="success"
              />
              <StatsCard
                title="Study Hours"
                value={(analytics?.summary.study_hours ?? 0).toLocaleString()}
                icon={Clock}
                trend={`Last ${dateFilter} days`}
                variant="accent"
              />
              <StatsCard
                title="Goal Completion"
                value={`${analytics?.summary.goal_completion ?? 0}%`}
                icon={Target}
                trend="Completion rate"
                variant="warning"
              />
            </section>

            <div>
              <Card className="p-6 gradient-card border-border">
                <h3 className="text-lg font-semibold mb-5 text-foreground flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Course Performance Comparison
                  <SectionHelp
                    title="Compare engagement and completion by course"
                    items={[
                      {
                        label: "Engagement %",
                        formula: "(sum of student progress %) ÷ students",
                        className: "text-primary",
                      },
                      {
                        label: "Completion %",
                        formula: "completed students ÷ students × 100",
                        className: "text-success",
                      },
                    ]}
                  />
                </h3>
                {hasCoursePerformanceData ? (
                  <ResponsiveContainer width="100%" height={380}>
                    <BarChart data={coursePerformance}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--border))"
                      />
                      <XAxis
                        dataKey="course"
                        stroke="hsl(var(--muted-foreground))"
                        height={60}
                        interval={0}
                        tick={<CustomXAxisTick />}
                      />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <RechartsTooltip
                        wrapperStyle={tooltipWrapperStyle}
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Legend wrapperStyle={{ paddingTop: "0px" }} />
                      <Bar
                        dataKey="engagement"
                        fill="hsl(var(--primary))"
                        radius={[8, 8, 0, 0]}
                        name="Engagement %"
                      />
                      <Bar
                        dataKey="completion"
                        fill="hsl(var(--success))"
                        radius={[8, 8, 0, 0]}
                        name="Completion %"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[380px] flex items-center justify-center text-sm text-muted-foreground">
                    No course performance data for this date range.
                  </div>
                )}
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6 gradient-card border-border">
                <h3 className="text-lg font-semibold mb-4 text-foreground flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Enrollment Trends
                  <SectionHelp
                    title="Enrollments over the selected time range"
                    items={[
                      {
                        label: "Enrollments",
                        formula: "count of enrollments per day/month in filter",
                        className: "text-primary",
                      },
                    ]}
                  />
                </h3>
                {hasEnrollmentData ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={enrollmentData}>
                      <defs>
                        <linearGradient
                          id="colorStudents"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="hsl(var(--primary))"
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor="hsl(var(--primary))"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--border))"
                      />
                      <XAxis
                        dataKey="month"
                        stroke="hsl(var(--muted-foreground))"
                      />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <RechartsTooltip
                        wrapperStyle={tooltipWrapperStyle}
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="students"
                        stroke="hsl(var(--primary))"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorStudents)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
                    No enrollment activity for this date range.
                  </div>
                )}
              </Card>

              <Card className="p-6 gradient-card border-border">
                <h3 className="text-lg font-semibold mb-4 text-foreground flex items-center gap-2">
                  <Target className="h-5 w-5 text-success" />
                  Student Progress Distribution
                  <SectionHelp
                    title="Distribution of progress status"
                    items={[
                      {
                        label: "Completed",
                        formula: "100% done",
                        className: "text-success",
                      },
                      {
                        label: "In Progress",
                        formula: "between 1% and 99%",
                        className: "text-primary",
                      },
                      {
                        label: "Not Started",
                        formula: "0%",
                        className: "text-muted-foreground",
                      },
                    ]}
                  />
                </h3>
                {hasCompletionDistributionData ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={completionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {completionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        wrapperStyle={tooltipWrapperStyle}
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
                    No progress distribution data for this date range.
                  </div>
                )}
              </Card>
            </div>

            <Card className="p-6 gradient-card border-border">
              <h3 className="text-lg font-semibold mb-4 text-foreground flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Cohort Snapshot
                <SectionHelp
                  title="Per-course cohort snapshot"
                  items={[
                    {
                      label: "Enrolled",
                      formula: "number of students",
                      className: "text-foreground",
                    },
                    {
                      label: "Avg Progress %",
                      formula: "average of student progress",
                      className: "text-primary",
                    },
                    {
                      label: "Completion %",
                      formula: "completed ÷ students × 100",
                      className: "text-success",
                    },
                    {
                      label: "Avg Score / Pass Rate",
                      formula: "from quiz attempts",
                      className: "text-warning",
                    },
                  ]}
                />
              </h3>
              {cohortAnalytics.length > 0 ? (
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {cohortAnalytics.map((cohort) => (
                    <div
                      key={cohort.course_id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setSelectedCourseId(cohort.course_id);
                        setViewMode("course");
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedCourseId(cohort.course_id);
                          setViewMode("course");
                        }
                      }}
                      className="flex flex-col gap-2 p-4 rounded-lg bg-background/50 cursor-pointer hover:bg-background/70"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">
                          {cohort.course_name}
                        </span>
                      </div>
                      <div className="flex flex-nowrap gap-4 text-xs text-muted-foreground overflow-x-auto whitespace-nowrap">
                        <span>Enrolled: {cohort.enrolled}</span>
                        <span>Avg Progress: {cohort.average_progress}%</span>
                        <span>Completion: {cohort.completion_rate}%</span>
                        <span>Avg Score: {cohort.average_quiz_score}%</span>
                        <span>Pass Rate: {cohort.quiz_pass_rate}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No cohort data available yet.
                </div>
              )}
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6 gradient-card border-border">
                <h3 className="text-lg font-semibold mb-4 text-foreground flex items-center gap-2">
                  <Users className="h-5 w-5 text-accent" />
                  Weekly Student Activity
                  <SectionHelp
                    title="Active vs inactive students"
                    items={[
                      {
                        label: "Active",
                        formula: "students with activity that day",
                        className: "text-success",
                      },
                      {
                        label: "Inactive",
                        formula: "total students − active",
                        className: "text-muted-foreground",
                      },
                    ]}
                  />
                </h3>
                {hasStudentActivityData ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={studentActivityData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--border))"
                      />
                      <XAxis
                        dataKey="day"
                        stroke="hsl(var(--muted-foreground))"
                      />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <RechartsTooltip
                        wrapperStyle={tooltipWrapperStyle}
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Legend />
                      <Bar
                        dataKey="active"
                        stackId="a"
                        fill="hsl(var(--success))"
                        radius={[0, 0, 0, 0]}
                        name="Active Students"
                      />
                      <Bar
                        dataKey="inactive"
                        stackId="a"
                        fill="hsl(var(--muted))"
                        radius={[8, 8, 0, 0]}
                        name="Inactive Students"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
                    No student activity data for this date range.
                  </div>
                )}
              </Card>

              <Card className="p-6 gradient-card border-border">
                <h3 className="text-lg font-semibold mb-4 text-foreground flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-warning" />
                  User Performance Across Categories
                  <SectionHelp
                    title="Category performance"
                    items={[
                      {
                        label: "Score %",
                        formula: "average progress of students in that category",
                        className: "text-primary",
                      },
                    ]}
                  />
                </h3>
                {hasCategoryPerformanceData ? (
                  <ResponsiveContainer width="100%" height={300}>
                    {useCategoryBarFallback ? (
                      <BarChart data={categoryPerformance}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="hsl(var(--border))"
                        />
                        <XAxis
                          dataKey="category"
                          stroke="hsl(var(--muted-foreground))"
                        />
                        <YAxis
                          domain={[0, 100]}
                          stroke="hsl(var(--muted-foreground))"
                        />
                        <RechartsTooltip
                          wrapperStyle={tooltipWrapperStyle}
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                        <Bar
                          dataKey="value"
                          fill="hsl(var(--primary))"
                          radius={[8, 8, 0, 0]}
                          name="Score %"
                        />
                      </BarChart>
                    ) : (
                      <RadarChart
                        data={categoryPerformance}
                        cx="50%"
                        cy="50%"
                        outerRadius="89%"
                      >
                        <PolarGrid stroke="hsl(var(--border))" />
                        <PolarAngleAxis
                          dataKey="category"
                          stroke="hsl(var(--muted-foreground))"
                          tick={{
                            fill: "hsl(var(--muted-foreground))",
                            fontSize: 12,
                          }}
                          tickLine={false}
                        />
                        <PolarRadiusAxis
                          angle={90}
                          domain={[0, 100]}
                          stroke="hsl(var(--muted-foreground))"
                          tick={{
                            fill: "hsl(var(--muted-foreground))",
                            fontSize: 10,
                          }}
                          tickCount={6}
                        />
                        <Radar
                          name="Score"
                          dataKey="value"
                          stroke="hsl(var(--primary))"
                          fill="hsl(var(--primary))"
                          fillOpacity={0.6}
                          strokeWidth={2}
                        />
                        <RechartsTooltip
                          wrapperStyle={tooltipWrapperStyle}
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                      </RadarChart>
                    )}
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
                    No category performance data for this date range.
                  </div>
                )}
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="course" className="space-y-6 mt-6">
            <Card className="p-6 gradient-card border-border">
              <h3 className="text-lg font-semibold mb-4 text-foreground flex items-center gap-2">
                <Target className="h-5 w-5 text-warning" />
                {insightsTitle}
              </h3>
              {visibleInsights.length > 0 ? (
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {visibleInsights.map((insight) => (
                    <div
                      key={insight.id}
                      className="rounded-lg border border-border bg-background/40 p-3"
                    >
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] uppercase tracking-wide px-2 py-0.5 rounded-full border border-border/60 bg-background/60 text-muted-foreground">
                            {getInsightTypeLabel(insight.type)}
                          </span>
                          <span
                            className={`text-[11px] uppercase tracking-wide px-2 py-0.5 rounded-full ${getInsightSeverityTone(
                              insight.severity
                            )}`}
                          >
                            {insight.severity}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm font-semibold">
                        {insight.target?.name || "Course"}
                      </p>
                      <p className="text-sm mt-1">{insight.message}</p>
                      {getInsightMetricSummary(insight) ? (
                        <p className="text-xs mt-2 text-muted-foreground">
                          Trigger: {getInsightMetricSummary(insight)}
                        </p>
                      ) : null}
                      <p className="text-xs mt-2 opacity-90">
                        Action: {insight.recommended_action}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{insightsEmptyMessage}</p>
              )}
            </Card>

            {!selectedCourseId ? (
              <div className="space-y-4">
                <Card className="p-6 gradient-card border-border">
                  <Label className="text-xl font-semibold mb-4 block flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    Select a Course to View Detailed Analytics
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      placeholder="Search by course name..."
                      className="pl-11 h-12 text-base"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredCourses.map((course) => (
                    <Card
                      key={course.id}
                      className="gradient-card border-border hover-lift cursor-pointer transition-all h-full"
                      onClick={() => setSelectedCourseId(course.id)}
                    >
                      <div className="p-6 flex flex-col h-full">
                        <div className="flex items-start justify-between">
                          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                            <BookOpen className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex items-center gap-1">
                            <Award className="h-4 w-4 text-warning" />
                            <span className="font-semibold">
                              {course.rating}
                            </span>
                          </div>
                        </div>

                        <div className="mt-4 flex-1">
                          <h3 className="font-semibold text-lg mb-2 line-clamp-2">
                            {course.name}
                          </h3>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                Students
                              </span>
                              <span className="font-semibold">
                                {course.students}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground flex items-center gap-1">
                                <Target className="h-4 w-4" />
                                Completion
                              </span>
                              <span className="font-semibold">
                                {course.completion}%
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground flex items-center gap-1">
                                <TrendingUp className="h-4 w-4" />
                                Engagement
                              </span>
                              <span className="font-semibold">
                                {course.engagement}%
                              </span>
                            </div>
                          </div>
                        </div>

                        <Button className="w-full mt-4" variant="outline">
                          View Analytics
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>

                {filteredCourses.length === 0 && (
                  <Card className="p-12 gradient-card border-border text-center">
                    <Search className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-lg text-muted-foreground">
                      No courses found matching "{searchQuery}"
                    </p>
                  </Card>
                )}
              </div>
            ) : (
              <>
                {/* Selected Course Header */}
                <Card className="p-6 gradient-card border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
                        <BookOpen className="h-7 w-7 text-primary" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold">
                          {selectedCourse?.name}
                        </h2>
                        <p className="text-muted-foreground">
                          Detailed Course Analytics
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setSelectedCourseId("")}
                      className="gap-2"
                    >
                      <Search className="h-4 w-4" />
                      Change Course
                    </Button>
                  </div>
                </Card>

                <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatsCard
                    title="Enrolled Students"
                    value={selectedCourse?.students.toString() || "0"}
                    icon={Users}
                    trend={enrollmentTrendText}
                    variant="default"
                  />
                  <StatsCard
                    title="Course Rating"
                    value={`${selectedCourse?.rating || 0}/5`}
                    icon={Award}
                    trend={ratingTrendText}
                    variant="success"
                  />
                  <StatsCard
                    title="Completion Rate"
                    value={`${selectedCourse?.completion || 0}%`}
                    icon={Target}
                    trend={completionTrendText}
                    variant="accent"
                  />
                  <StatsCard
                    title="Engagement"
                    value={`${selectedCourse?.engagement || 0}%`}
                    icon={TrendingUp}
                    trend={engagementTrendText}
                    variant="warning"
                  />
                </section>

                {courseCohortMetrics && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="p-6 gradient-card border-border">
                      <h3 className="text-lg font-semibold mb-4 text-foreground flex items-center gap-2">
                        <Award className="h-5 w-5 text-success" />
                        Quiz Performance
                        <SectionHelp
                          title="Quiz performance for this course"
                          items={[
                            {
                              label: "Avg Score",
                              formula: "average quiz score",
                              className: "text-success",
                            },
                            {
                              label: "Pass Rate",
                              formula: "passed ÷ attempts × 100",
                              className: "text-primary",
                            },
                          ]}
                        />
                      </h3>
                      <ResponsiveContainer width="100%" height={240}>
                        <BarChart
                          data={[
                            {
                              label: "Avg Score",
                              value: courseCohortMetrics.average_quiz_score,
                            },
                            {
                              label: "Pass Rate",
                              value: courseCohortMetrics.quiz_pass_rate,
                            },
                          ]}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="hsl(var(--border))"
                          />
                          <XAxis
                            dataKey="label"
                            stroke="hsl(var(--muted-foreground))"
                          />
                          <YAxis stroke="hsl(var(--muted-foreground))" />
                          <RechartsTooltip
                            wrapperStyle={tooltipWrapperStyle}
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px",
                            }}
                            formatter={(value: number) => `${value}%`}
                          />
                          <Bar
                            dataKey="value"
                            fill="hsl(var(--success))"
                            radius={[8, 8, 0, 0]}
                            name="Percentage"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </Card>

                    <Card className="p-6 gradient-card border-border">
                      <h3 className="text-lg font-semibold mb-4 text-foreground flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-primary" />
                        Assignment Submissions
                        <SectionHelp
                          title="Submission workload"
                          items={[
                            {
                              label: "Pending",
                              formula: "submitted not graded",
                              className: "text-warning",
                            },
                            {
                              label: "Graded",
                              formula: "marked as graded",
                              className: "text-primary",
                            },
                          ]}
                        />
                      </h3>
                      <ResponsiveContainer width="100%" height={240}>
                        <BarChart
                          data={[
                            {
                              label: "Pending",
                              value: courseCohortMetrics.submissions_pending,
                            },
                            {
                              label: "Graded",
                              value: courseCohortMetrics.submissions_graded,
                            },
                          ]}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="hsl(var(--border))"
                          />
                          <XAxis
                            dataKey="label"
                            stroke="hsl(var(--muted-foreground))"
                          />
                          <YAxis stroke="hsl(var(--muted-foreground))" />
                          <RechartsTooltip
                            wrapperStyle={tooltipWrapperStyle}
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px",
                            }}
                          />
                          <Bar
                            dataKey="value"
                            fill="hsl(var(--primary))"
                            radius={[8, 8, 0, 0]}
                            name="Count"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </Card>
                  </div>
                )}

                {courseCohortMetrics && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="p-6 gradient-card border-border text-center">
                      <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-3">
                        <Clock className="h-6 w-6 text-accent" />
                      </div>
                      <p className="text-3xl font-bold mb-1">
                        {courseCohortMetrics.average_watch_hours}h
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Avg Watch Time
                      </p>
                    </Card>
                    <Card className="p-6 gradient-card border-border text-center">
                      <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-3">
                        <Users className="h-6 w-6 text-success" />
                      </div>
                      <p className="text-3xl font-bold mb-1">
                        {courseCohortMetrics.active_learners}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Active Learners
                      </p>
                    </Card>
                    <Card className="p-6 gradient-card border-border text-center">
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-3">
                        <Target className="h-6 w-6 text-primary" />
                      </div>
                      <p className="text-3xl font-bold mb-1">
                        {courseCohortMetrics.completion_rate}%
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Completion Rate
                      </p>
                    </Card>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="p-6 gradient-card border-border">
                    <h3 className="text-lg font-semibold mb-4 text-foreground flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      Module-wise Performance
                      <SectionHelp
                        title="Module completion and score"
                        items={[
                          {
                            label: "Completion %",
                            formula: "module completed learners ÷ course enrolled learners × 100",
                            className: "text-primary",
                          },
                          {
                            label: "Avg Score",
                            formula: "average of latest quiz attempt scores for quizzes in this module",
                            className: "text-success",
                          },
                        ]}
                      />
                    </h3>
                    {hasSingleCourseModuleData ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={singleCourseModuleData}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="hsl(var(--border))"
                          />
                          <XAxis
                            dataKey="module"
                            stroke="hsl(var(--muted-foreground))"
                          />
                          <YAxis stroke="hsl(var(--muted-foreground))" />
                          <RechartsTooltip
                            wrapperStyle={tooltipWrapperStyle}
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px",
                            }}
                          />
                          <Legend />
                          <Bar
                            dataKey="completion"
                            fill="hsl(var(--primary))"
                            radius={[8, 8, 0, 0]}
                            name="Completion %"
                          />
                          <Bar
                            dataKey="avgScore"
                            fill="hsl(var(--success))"
                            radius={[8, 8, 0, 0]}
                            name="Avg Score %"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
                        No module performance data for this date range.
                      </div>
                    )}
                  </Card>

                  <Card className="p-6 gradient-card border-border">
                    <h3 className="text-lg font-semibold mb-4 text-foreground flex items-center gap-2">
                      <Clock className="h-5 w-5 text-accent" />
                      Weekly Study Time
                      <SectionHelp
                        title="Weekly watch time"
                        items={[
                          {
                            label: "Hours",
                            formula: "watch time aggregated into week buckets across selected date range",
                            className: "text-accent",
                          },
                        ]}
                      />
                    </h3>
                    {hasSingleCourseStudyTimeData ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={singleCourseTimeData}>
                          <defs>
                            <linearGradient
                              id="colorHours"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor="hsl(var(--accent))"
                                stopOpacity={0.3}
                              />
                              <stop
                                offset="95%"
                                stopColor="hsl(var(--accent))"
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="hsl(var(--border))"
                          />
                          <XAxis
                            dataKey="week"
                            stroke="hsl(var(--muted-foreground))"
                          />
                          <YAxis stroke="hsl(var(--muted-foreground))" />
                          <RechartsTooltip
                            wrapperStyle={tooltipWrapperStyle}
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px",
                            }}
                            formatter={(value: number) => `${value} hours`}
                          />
                          <Area
                            type="monotone"
                            dataKey="hours"
                            stroke="hsl(var(--accent))"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorHours)"
                            name="Study Hours"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
                        No weekly study-time data for this date range.
                      </div>
                    )}
                  </Card>
                </div>

                <Card className="p-6 gradient-card border-border">
                  <h3 className="text-lg font-semibold mb-4 text-foreground flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Student Enrollment Over Time
                    <SectionHelp
                      title="Course enrollments over time"
                      items={[
                        {
                          label: "Enrollments",
                          formula: "count within the selected time range",
                          className: "text-primary",
                        },
                      ]}
                    />
                  </h3>
                  {hasCourseEnrollmentData ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={courseEnrollmentData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="hsl(var(--border))"
                        />
                        <XAxis
                          dataKey="month"
                          stroke="hsl(var(--muted-foreground))"
                        />
                        <YAxis stroke="hsl(var(--muted-foreground))" />
                        <RechartsTooltip
                          wrapperStyle={tooltipWrapperStyle}
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="students"
                          stroke="hsl(var(--primary))"
                          strokeWidth={3}
                          dot={{ fill: "hsl(var(--primary))", r: 5 }}
                          name="Enrollments"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
                      No enrollments recorded in this date range.
                    </div>
                  )}
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="p-6 gradient-card border-border text-center">
                    <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-3">
                      <GraduationCap className="h-6 w-6 text-success" />
                    </div>
                    <p className="text-3xl font-bold mb-1">
                      {selectedCourse?.completion}%
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Average Completion
                    </p>
                  </Card>
                  <Card className="p-6 gradient-card border-border text-center">
                    <div className="w-12 h-12 rounded-full bg-warning/20 flex items-center justify-center mx-auto mb-3">
                      <Clock className="h-6 w-6 text-warning" />
                    </div>
                    <p className="text-3xl font-bold mb-1">
                      {courseCohortMetrics?.average_watch_hours !== null &&
                      courseCohortMetrics?.average_watch_hours !== undefined
                        ? `${courseCohortMetrics.average_watch_hours}h`
                        : "-"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Avg Watch Time
                    </p>
                  </Card>
                  <Card className="p-6 gradient-card border-border text-center">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-3">
                      <Award className="h-6 w-6 text-primary" />
                    </div>
                    <p className="text-3xl font-bold mb-1">
                      {selectedCourse?.rating}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Student Rating
                    </p>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Analytics;
