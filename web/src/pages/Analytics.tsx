import { useState, useMemo } from "react";
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
  Share2,
  Search,
  Award,
  BookOpen,
  GraduationCap,
  BarChart3,
} from "lucide-react";
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
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useToast } from "@/hooks/use-toast";

const Analytics = () => {
  const [dateFilter, setDateFilter] = useState("30");
  const [viewMode, setViewMode] = useState<"all" | "course">("all");
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const allCourses = [
    {
      id: "1",
      name: "Data Science Fundamentals Data Science Fundamentals",
      students: 245,
      rating: 4.8,
      completion: 67,
      engagement: 85,
    },
    {
      id: "2",
      name: "Machine Learning A-Z",
      students: 189,
      rating: 4.6,
      completion: 54,
      engagement: 78,
    },
    {
      id: "3",
      name: "Python for Beginners",
      students: 312,
      rating: 4.9,
      completion: 78,
      engagement: 92,
    },
    {
      id: "4",
      name: "Advanced Analytics",
      students: 156,
      rating: 4.5,
      completion: 45,
      engagement: 65,
    },
    {
      id: "5",
      name: "Deep Learning Basics",
      students: 198,
      rating: 4.7,
      completion: 61,
      engagement: 72,
    },
  ];

  const filteredCourses = allCourses.filter((course) =>
    course.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getDateFilteredData = (days: string) => {
    // Simulate different data based on date range
    const multiplier = parseInt(days) / 30;
    return [
      { month: "Jan", students: Math.floor(120 * multiplier) },
      { month: "Feb", students: Math.floor(180 * multiplier) },
      { month: "Mar", students: Math.floor(240 * multiplier) },
      { month: "Apr", students: Math.floor(320 * multiplier) },
      { month: "May", students: Math.floor(410 * multiplier) },
      { month: "Jun", students: Math.floor(502 * multiplier) },
    ];
  };

  const enrollmentData = useMemo(
    () => getDateFilteredData(dateFilter),
    [dateFilter]
  );

  const completionData = [
    { name: "Completed", value: 640, color: "hsl(var(--success))" },
    { name: "In Progress", value: 280, color: "hsl(var(--primary))" },
    { name: "Not Started", value: 82, color: "hsl(var(--muted))" },
  ];

  const studentActivityData = [
    { day: "Mon", active: 420, inactive: 80 },
    { day: "Tue", active: 380, inactive: 120 },
    { day: "Wed", active: 450, inactive: 50 },
    { day: "Thu", active: 390, inactive: 110 },
    { day: "Fri", active: 410, inactive: 90 },
    { day: "Sat", active: 280, inactive: 220 },
    { day: "Sun", active: 320, inactive: 180 },
  ];

  const categoryPerformance = [
    { category: "Engagement", value: 82 },
    { category: "Completion", value: 76 },
    { category: "Satisfaction", value: 88 },
    { category: "Retention", value: 79 },
    { category: "Performance", value: 85 },
  ];

  const coursePerformance = selectedCourseId
    ? [allCourses.find((c) => c.id === selectedCourseId)]
        .filter(Boolean)
        .map((c) => ({
          course: c!.name,
          engagement: c!.engagement,
          completion: c!.completion,
        }))
    : allCourses.map((c) => ({
        course: c.name,
        engagement: c.engagement,
        completion: c.completion,
      }));

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

  const singleCourseModuleData = selectedCourse
    ? [
        { module: "Module 1", completion: 85, avgScore: 88 },
        { module: "Module 2", completion: 72, avgScore: 82 },
        { module: "Module 3", completion: 65, avgScore: 79 },
        { module: "Module 4", completion: 48, avgScore: 85 },
      ]
    : [];

  const singleCourseTimeData = [
    { week: "Week 1", hours: 42 },
    { week: "Week 2", hours: 58 },
    { week: "Week 3", hours: 65 },
    { week: "Week 4", hours: 71 },
  ];

  const handleExport = () => {
    toast({
      title: "Export Started",
      description: "Your analytics data is being exported to CSV...",
    });
  };

  const handleShare = () => {
    toast({
      title: "Share Link Created",
      description: "Analytics dashboard link copied to clipboard",
    });
  };

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
            <Button variant="outline" className="gap-2" onClick={handleShare}>
              <Share2 className="h-4 w-4" />
              Share
            </Button>
          </div>
        </div>

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
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatsCard
                title="Total Enrolled"
                value="1,002"
                icon={Users}
                trend="+12% from last month"
                variant="default"
              />
              <StatsCard
                title="Avg Engagement"
                value="82%"
                icon={TrendingUp}
                trend="+8% improvement"
                variant="success"
              />
              <StatsCard
                title="Study Hours"
                value="12,450"
                icon={Clock}
                trend="This month"
                variant="accent"
              />
              <StatsCard
                title="Goal Completion"
                value="76%"
                icon={Target}
                trend="+15% vs target"
                variant="warning"
              />
            </section>

            <div>
              <Card className="p-6 gradient-card border-border">
                <h3 className="text-lg font-semibold mb-5 text-foreground flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Course Performance Comparison
                </h3>
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
                    <Tooltip
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
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6 gradient-card border-border">
                <h3 className="text-lg font-semibold mb-4 text-foreground flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Enrollment Trends
                </h3>
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
                    <Tooltip
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
              </Card>

              <Card className="p-6 gradient-card border-border">
                <h3 className="text-lg font-semibold mb-4 text-foreground flex items-center gap-2">
                  <Target className="h-5 w-5 text-success" />
                  Student Progress Distribution
                </h3>
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
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6 gradient-card border-border">
                <h3 className="text-lg font-semibold mb-4 text-foreground flex items-center gap-2">
                  <Users className="h-5 w-5 text-accent" />
                  Weekly Student Activity
                </h3>
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
                    <Tooltip
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
              </Card>

              <Card className="p-6 gradient-card border-border">
                <h3 className="text-lg font-semibold mb-4 text-foreground flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-warning" />
                  Performance Categories
                </h3>
                <ResponsiveContainer width="100%" height={300}>
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
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="course" className="space-y-6 mt-6">
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
                      className="gradient-card border-border hover-lift cursor-pointer transition-all"
                      onClick={() => setSelectedCourseId(course.id)}
                    >
                      <div className="p-6 space-y-4">
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

                        <div>
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

                        <Button className="w-full" variant="outline">
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
                    trend="+12% from last month"
                    variant="default"
                  />
                  <StatsCard
                    title="Course Rating"
                    value={`${selectedCourse?.rating || 0}/5`}
                    icon={Award}
                    trend="Above average"
                    variant="success"
                  />
                  <StatsCard
                    title="Completion Rate"
                    value={`${selectedCourse?.completion || 0}%`}
                    icon={Target}
                    trend="+5% vs target"
                    variant="accent"
                  />
                  <StatsCard
                    title="Engagement"
                    value={`${selectedCourse?.engagement || 0}%`}
                    icon={TrendingUp}
                    trend="High engagement"
                    variant="warning"
                  />
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="p-6 gradient-card border-border">
                    <h3 className="text-lg font-semibold mb-4 text-foreground flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      Module-wise Performance
                    </h3>
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
                        <Tooltip
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
                  </Card>

                  <Card className="p-6 gradient-card border-border">
                    <h3 className="text-lg font-semibold mb-4 text-foreground flex items-center gap-2">
                      <Clock className="h-5 w-5 text-accent" />
                      Weekly Study Time
                    </h3>
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
                        <Tooltip
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
                  </Card>
                </div>

                <Card className="p-6 gradient-card border-border">
                  <h3 className="text-lg font-semibold mb-4 text-foreground flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Student Enrollment Over Time
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={enrollmentData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--border))"
                      />
                      <XAxis
                        dataKey="month"
                        stroke="hsl(var(--muted-foreground))"
                      />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
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
                    <p className="text-3xl font-bold mb-1">42hrs</p>
                    <p className="text-sm text-muted-foreground">
                      Avg. Time to Complete
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
