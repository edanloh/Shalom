import { useState, useMemo } from "react";
import { Header } from "@/components/Header";
import { StatsCard } from "@/components/StatsCard";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, TrendingUp, Clock, Target, Download, Share2, Search } from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useToast } from "@/hooks/use-toast";

const Analytics = () => {
  const [dateFilter, setDateFilter] = useState("30");
  const [viewMode, setViewMode] = useState<"all" | "course">("all");
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const allCourses = [
    { id: "1", name: "Data Science Fundamentals", students: 245, rating: 4.8, completion: 67, engagement: 85 },
    { id: "2", name: "Machine Learning A-Z", students: 189, rating: 4.6, completion: 54, engagement: 78 },
    { id: "3", name: "Python for Beginners", students: 312, rating: 4.9, completion: 78, engagement: 92 },
    { id: "4", name: "Advanced Analytics", students: 156, rating: 4.5, completion: 45, engagement: 65 },
    { id: "5", name: "Deep Learning Basics", students: 198, rating: 4.7, completion: 61, engagement: 72 },
  ];

  const filteredCourses = allCourses.filter(course =>
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

  const enrollmentData = useMemo(() => getDateFilteredData(dateFilter), [dateFilter]);

  const completionData = [
    { name: "Completed", value: 640, color: "hsl(var(--success))" },
    { name: "In Progress", value: 280, color: "hsl(var(--primary))" },
    { name: "Not Started", value: 82, color: "hsl(var(--muted))" },
  ];

  const coursePerformance = selectedCourseId 
    ? [allCourses.find(c => c.id === selectedCourseId)].filter(Boolean).map(c => ({
        course: c!.name,
        engagement: c!.engagement,
        completion: c!.completion
      }))
    : allCourses.map(c => ({ course: c.name, engagement: c.engagement, completion: c.completion }));

  const handleExport = () => {
    toast({
      title: "Export Started",
      description: "Your analytics data is being exported to CSV..."
    });
  };

  const handleShare = () => {
    toast({
      title: "Share Link Created",
      description: "Analytics dashboard link copied to clipboard"
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-6 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Analytics Dashboard</h1>
            <p className="text-muted-foreground">Track your teaching performance and student progress</p>
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
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "all" | "course")} className="mb-6">
          <TabsList>
            <TabsTrigger value="all">All Courses</TabsTrigger>
            <TabsTrigger value="course">By Course</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-8 mt-6">
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 gradient-card border-border">
            <h3 className="text-lg font-semibold mb-4 text-foreground">Enrollment Trends</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={enrollmentData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px"
                  }} 
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="students" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  dot={{ fill: "hsl(var(--primary))", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-6 gradient-card border-border">
            <h3 className="text-lg font-semibold mb-4 text-foreground">Student Progress Distribution</h3>
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
                >
                  {completionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px"
                  }} 
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
              </Card>
            </div>

            <Card className="p-6 gradient-card border-border">
              <h3 className="text-lg font-semibold mb-4 text-foreground">Course Performance Comparison</h3>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={coursePerformance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="course" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }} 
                  />
                  <Legend />
                  <Bar dataKey="engagement" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="completion" fill="hsl(var(--success))" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </TabsContent>

          <TabsContent value="course" className="space-y-6 mt-6">
            <Card className="p-6 gradient-card border-border">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Select Course</Label>
                  <div className="flex gap-4">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search courses..."
                        className="pl-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                  {filteredCourses.map(course => (
                    <Card
                      key={course.id}
                      className={`p-4 cursor-pointer hover-lift ${
                        selectedCourseId === course.id ? 'border-primary border-2' : 'border-border'
                      }`}
                      onClick={() => setSelectedCourseId(course.id)}
                    >
                      <h4 className="font-semibold mb-2">{course.name}</h4>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div className="flex justify-between">
                          <span>Students:</span>
                          <span className="font-medium">{course.students}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Rating:</span>
                          <span className="font-medium">{course.rating}/5</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Completion:</span>
                          <span className="font-medium">{course.completion}%</span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </Card>

            {selectedCourseId && (
              <>
                <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatsCard
                    title="Enrolled Students"
                    value={allCourses.find(c => c.id === selectedCourseId)?.students || 0}
                    icon={Users}
                    trend="+12% from last month"
                    variant="default"
                  />
                  <StatsCard
                    title="Course Rating"
                    value={`${allCourses.find(c => c.id === selectedCourseId)?.rating || 0}/5`}
                    icon={TrendingUp}
                    trend="Above average"
                    variant="success"
                  />
                  <StatsCard
                    title="Completion Rate"
                    value={`${allCourses.find(c => c.id === selectedCourseId)?.completion || 0}%`}
                    icon={Target}
                    trend="+5% vs target"
                    variant="accent"
                  />
                  <StatsCard
                    title="Engagement"
                    value={`${allCourses.find(c => c.id === selectedCourseId)?.engagement || 0}%`}
                    icon={Clock}
                    trend="High engagement"
                    variant="warning"
                  />
                </section>

                <Card className="p-6 gradient-card border-border">
                  <h3 className="text-lg font-semibold mb-4 text-foreground">Enrollment Trends</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={enrollmentData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--card))", 
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px"
                        }} 
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="students" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={3}
                        dot={{ fill: "hsl(var(--primary))", r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Analytics;
