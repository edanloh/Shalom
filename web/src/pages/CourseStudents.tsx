import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Filter, Mail, MoreVertical, TrendingUp, BookOpen, Clock, Award, Target, CheckCircle, Star, UserX, ArrowLeft, UserPlus } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/Pagination";
import { disableStudent } from "@/lib/disableStudent";
import { Colors } from "@/constants";
import { courseService } from "@/services";
import { useToast } from "@/hooks/use-toast";

interface Student {
  id: string;
  name: string;
  email: string;
  progress: number;
  lastActive: string;
  engagement?: number;
  coursesEnrolled?: number;
  completedCourses?: number;
  totalHours?: number;
  currentCourses?: any[];
  completedCoursesData?: any[];
  quizResults?: any[];
  streak?: number;
  badges?: number;
  averageScore?: number;
  enabled?: boolean;
  enrolledDate?: string;
  lastActivity?: string;
}

const CourseStudents = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isEnrollDialogOpen, setIsEnrollDialogOpen] = useState(false);

  const [enrolledStudents, setEnrolledStudents] = useState<Student[]>([]);
  const [availableStudents, setAvailableStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [courseName, setCourseName] = useState(location.state?.courseName || "");

  const fetchCourseStudents = async () => {
    if (!courseId) return;
    
    setLoading(true);
    setError("");
    try {
      // Fetch enrolled students
      const studentsData = await courseService.getCourseStudents(courseId);
      
      // Transform to match expected structure
      const transformedStudents = studentsData.map((student: any) => ({
        id: student.id,
        name: student.name || "Unknown User",
        email: student.email || "",
        progress: student.progress || 0,
        lastActive: student.lastActive || "Unknown",
        lastActivity: student.lastActive || "Unknown",
        engagement: Math.round(student.progress * 0.9) || 0, // Mock engagement based on progress
        enrolledDate: new Date().toISOString().split('T')[0],
        coursesEnrolled: 1,
        completedCourses: student.progress >= 100 ? 1 : 0,
        totalHours: Math.floor(student.progress / 10) || 0,
        currentCourses: [
          { id: 1, name: "Current Course", progress: student.progress, grade: student.progress }
        ],
        completedCoursesData: [],
        quizResults: [],
        streak: Math.floor(student.progress / 10) || 0,
        badges: Math.floor(student.progress / 20) || 0,
        averageScore: student.progress || 0,
        enabled: true,
      }));
      
      setEnrolledStudents(transformedStudents);
      
      // Fetch available students
      const availableData = await courseService.getAvailableStudents(courseId);
      setAvailableStudents(availableData);
    } catch (err: any) {
      setError(err.message || "Error fetching course students");
      toast({
        title: "Error",
        description: "Failed to fetch course students",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourseStudents();
  }, [courseId]);

  const filteredStudents = enrolledStudents.filter(student =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getEngagementColor = (score: number) => {
    if (score >= 80) return "success";
    if (score >= 60) return "warning";
    return "destructive";
  };

  const handleEnrollStudent = async (studentId: string) => {
    if (!courseId) return;

    try {
      await courseService.enrollStudent(courseId, studentId);
      
      toast({
        title: "Student Enrolled",
        description: "Student enrolled successfully",
      });

      // Refresh the lists
      fetchCourseStudents();
      setIsEnrollDialogOpen(false);
    } catch (error) {
      console.error('Error enrolling student:', error);
      toast({
        title: "Error",
        description: "Failed to enroll student. Please try again.",
        variant: "destructive",
      });
    }
  };

  const filteredAvailableStudents = availableStudents.filter(student =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Button 
              variant="ghost" 
              className="mb-2 gap-2"
              onClick={() => navigate(`/course/${courseId}`)}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Course
            </Button>
            <h1 className="text-3xl font-bold text-foreground">
              {courseName ? `${courseName} - Students` : 'Course Students'}
            </h1>
            <p className="text-muted-foreground">
              Monitor enrolled students in this course
            </p>
          </div>
          
          <div className="flex gap-2">
            <Dialog open={isEnrollDialogOpen} onOpenChange={setIsEnrollDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  Enroll Students
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Enroll Students</DialogTitle>
                  <DialogDescription>
                    Select students to enroll in this course (showing only students not yet enrolled)
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Search available students..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {filteredAvailableStudents.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        {searchQuery ? "No students found matching your search" : "All students are already enrolled in this course"}
                      </div>
                    ) : (
                      filteredAvailableStudents.map((student) => (
                        <div
                          key={student.id}
                          className="flex items-center justify-between p-3 border border-border rounded hover:bg-muted/10"
                        >
                          <div>
                            <div className="font-medium">{student.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {student.email}
                            </div>
                            {student.totalEnrollments > 0 && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {student.totalEnrollments} courses • {student.averageProgress}% avg progress
                              </div>
                            )}
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleEnrollStudent(student.id)}
                          >
                            Enroll
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            
            <Button variant="outline" className="gap-2">
              <Mail className="h-4 w-4" />
              Message All
            </Button>
          </div>
        </div>

        <Card className="p-6 gradient-card border-border">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </Button>
          </div>
        </Card>

        {loading ? (
          <Card className="gradient-card border-border p-12 text-center">
            <p className="text-muted-foreground">Loading students...</p>
          </Card>
        ) : error ? (
          <Card className="gradient-card border-border p-12 text-center">
            <p className="text-destructive">{error}</p>
          </Card>
        ) : (
          <Card className="gradient-card border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Engagement</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      No students enrolled in this course yet
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>{student.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-foreground">{student.name}</p>
                            <p className="text-sm text-muted-foreground">{student.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={student.enabled ? "default" : "destructive"}>
                          {student.enabled ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-foreground">{student.progress}%</span>
                          </div>
                          <Progress value={student.progress} className="h-2" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getEngagementColor(student.engagement || 0) as any}>
                          {student.engagement}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{student.lastActivity}</TableCell>
                      <TableCell className="text-right">
                        <Sheet open={isSheetOpen && selectedStudent?.id === student.id} onOpenChange={setIsSheetOpen}>
                          <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => setSelectedStudent(student)}>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </SheetTrigger>
                          <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
                            <SheetHeader>
                              <SheetTitle>Student Profile</SheetTitle>
                            </SheetHeader>
                            {selectedStudent && (
                              <div className="space-y-6 mt-6">
                                {/* Header */}
                                <div className="flex items-center gap-4 pb-6 border-b border-border">
                                  <Avatar className="h-20 w-20">
                                    <AvatarFallback className="text-2xl bg-primary">
                                      {selectedStudent.name.split(' ').map((n: string) => n[0]).join('')}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1">
                                    <h3 className="font-semibold text-2xl text-foreground">{selectedStudent.name}</h3>
                                    <p className="text-sm text-muted-foreground mb-2">{selectedStudent.email}</p>
                                    <div className="flex gap-2">
                                      <Badge variant={selectedStudent.enabled ? "default" : "destructive"}>
                                        {selectedStudent.enabled ? "Active" : "Inactive"}
                                      </Badge>
                                      <Badge variant="outline">Course Progress: {selectedStudent.progress}%</Badge>
                                    </div>
                                  </div>
                                </div>

                                {/* Quick Stats Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                                    <Target className="h-5 w-5 text-primary mb-2" />
                                    <p className="text-2xl font-bold">{selectedStudent.averageScore}%</p>
                                    <p className="text-xs text-muted-foreground">Avg Score</p>
                                  </div>
                                  <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                                    <CheckCircle className="h-5 w-5 text-success mb-2" />
                                    <p className="text-2xl font-bold">{selectedStudent.progress >= 100 ? "Yes" : "No"}</p>
                                    <p className="text-xs text-muted-foreground">Completed</p>
                                  </div>
                                  <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
                                    <Clock className="h-5 w-5 text-warning mb-2" />
                                    <p className="text-2xl font-bold">{selectedStudent.totalHours}h</p>
                                    <p className="text-xs text-muted-foreground">Study Time</p>
                                  </div>
                                  <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
                                    <Award className="h-5 w-5 text-accent mb-2" />
                                    <p className="text-2xl font-bold">{selectedStudent.badges}</p>
                                    <p className="text-xs text-muted-foreground">Badges</p>
                                  </div>
                                </div>

                                {/* Tabs for detailed information */}
                                <Tabs defaultValue="performance" className="w-full">
                                  <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="performance">Performance</TabsTrigger>
                                    <TabsTrigger value="activity">Activity</TabsTrigger>
                                  </TabsList>

                                  <TabsContent value="performance" className="space-y-4 mt-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="p-4 rounded-lg bg-background/50 border border-border">
                                        <div className="flex items-center gap-2 mb-2">
                                          <TrendingUp className="h-4 w-4 text-primary" />
                                          <span className="text-sm font-medium">Course Progress</span>
                                        </div>
                                        <Progress value={selectedStudent.progress} className="h-2 mb-2" />
                                        <p className="text-2xl font-bold">{selectedStudent.progress}%</p>
                                      </div>
                                      <div className="p-4 rounded-lg bg-background/50 border border-border">
                                        <div className="flex items-center gap-2 mb-2">
                                          <Star className="h-4 w-4 text-warning" />
                                          <span className="text-sm font-medium">Engagement</span>
                                        </div>
                                        <Progress value={selectedStudent.engagement} className="h-2 mb-2" />
                                        <p className="text-2xl font-bold">{selectedStudent.engagement}%</p>
                                      </div>
                                    </div>

                                    <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
                                      <h4 className="font-semibold mb-2">Performance Summary</h4>
                                      <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                          <p className="text-muted-foreground">Status</p>
                                          <p className="font-medium">
                                            {selectedStudent.progress >= 100 ? "Completed" : 
                                             selectedStudent.progress >= 50 ? "On Track" : "Needs Support"}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-muted-foreground">Last Active</p>
                                          <p className="font-medium">{selectedStudent.lastActive}</p>
                                        </div>
                                      </div>
                                    </div>
                                  </TabsContent>

                                  <TabsContent value="activity" className="space-y-4 mt-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="p-4 rounded-lg bg-background/50 border border-border">
                                        <div className="flex items-center gap-2 mb-2">
                                          <Clock className="h-4 w-4 text-warning" />
                                          <span className="text-sm font-medium">Last Activity</span>
                                        </div>
                                        <p className="text-xl font-bold">{selectedStudent.lastActivity}</p>
                                      </div>
                                      <div className="p-4 rounded-lg bg-background/50 border border-border">
                                        <div className="flex items-center gap-2 mb-2">
                                          <TrendingUp className="h-4 w-4 text-success" />
                                          <span className="text-sm font-medium">Current Streak</span>
                                        </div>
                                        <p className="text-xl font-bold">{selectedStudent.streak} days</p>
                                      </div>
                                    </div>

                                    <div>
                                      <h4 className="font-semibold mb-3">Course Engagement</h4>
                                      <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                          <span className="text-sm">Total Study Hours</span>
                                          <span className="font-bold">{selectedStudent.totalHours}h</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                          <span className="text-sm">Course Progress</span>
                                          <span className="font-medium">{selectedStudent.progress}%</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                          <span className="text-sm">Badges Earned</span>
                                          <span className="font-medium">{selectedStudent.badges}</span>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                                      <h4 className="font-semibold mb-2 text-sm">Activity Status</h4>
                                      <Badge className={selectedStudent.engagement && selectedStudent.engagement >= 70 ? "status-badge-published" : "status-badge-draft"}>
                                        {selectedStudent.engagement && selectedStudent.engagement >= 70 ? "Highly Engaged" : "Needs Attention"}
                                      </Badge>
                                    </div>
                                  </TabsContent>
                                </Tabs>

                                <Button className="w-full gap-2">
                                  <Mail className="h-4 w-4" />
                                  Send Message
                                </Button>
                              </div>
                            )}
                          </SheetContent>
                        </Sheet>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {paginatedStudents.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(filteredStudents.length / itemsPerPage)}
                onPageChange={(page) => {
                  setCurrentPage(page);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                itemsPerPage={itemsPerPage}
                totalItems={filteredStudents.length}
              />
            )}
          </Card>
        )}
      </main>
    </div>
  );
};

export default CourseStudents;
