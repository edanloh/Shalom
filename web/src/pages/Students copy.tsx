import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Filter, Mail, MoreVertical, TrendingUp, BookOpen, Clock, Target, CheckCircle, Star, UserX, Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/Pagination";
import { disableStudent } from "@/lib/disableStudent";
import { courseService } from "@/services/courseService";

const Students = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [students, setStudents] = useState<any[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await courseService.getAllStudents();
      setStudents(response.students);
      setStatistics(response.statistics);
    } catch (error) {
      console.error("Error fetching students:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(student =>
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading students...</span>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Student Management</h1>
            <p className="text-muted-foreground">Monitor and support your students</p>
          </div>
        </div>

        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 gradient-card border-border">
              <div className="flex items-center gap-3">
                <Target className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{statistics.total_students}</p>
                  <p className="text-sm text-muted-foreground">Total Students</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        <Card className="gradient-card border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Enrolled Date</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Engagement</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead>Courses</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No students found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>{student.name.split(" ").map((n: string) => n[0]).join("")}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">{student.name}</p>
                          <p className="text-sm text-muted-foreground">{student.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{student.enrolledDate}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-foreground">{student.progress}%</span>
                        </div>
                        <Progress value={student.progress} className="h-2" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getEngagementColor(student.engagement) as any}>
                        {student.engagement}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{student.lastActivity}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p className="font-medium">{student.coursesEnrolled} enrolled</p>
                        <p className="text-muted-foreground">{student.completedCourses} completed</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => setSelectedStudent(student)}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </main>
    </div>
  );
};

export default Students;
