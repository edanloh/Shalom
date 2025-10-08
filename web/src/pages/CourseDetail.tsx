import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Edit, Users, UserPlus, Star, Clock, BookOpen, Award, ChevronRight, Video, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Colors } from "../constants";
import courseThumbnail1 from "@/assets/course-thumbnail-1.jpg";

const CourseDetail = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isEnrollDialogOpen, setIsEnrollDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const course = {
    id: courseId,
    title: "Data Science Fundamentals",
    description: "Master the core concepts of data science including statistics, machine learning, data visualization, and real-world applications. This comprehensive course covers Python programming, data analysis libraries, and hands-on projects.",
    thumbnail: courseThumbnail1,
    category: "Data Science",
    status: "published" as const,
    instructor: "Dr. Sarah Johnson",
    enrolledCount: 245,
    completionRate: 67,
    rating: 4.8,
    totalRatings: 156,
    duration: "12 weeks",
    modules: 8,
    lessons: 42,
    quizzes: 8,
    createdDate: "Jan 15, 2025",
    lastUpdated: "Feb 1, 2025",
  };

  const modulesList = [
    {
      id: 1,
      title: "Introduction to Data Science",
      lessons: 5,
      quizzes: 1,
      duration: "2 hours",
      items: [
        { type: "lesson", title: "What is Data Science?", duration: "15 min" },
        { type: "lesson", title: "Data Science Tools", duration: "20 min" },
        { type: "quiz", title: "Introduction Quiz", questions: 10 },
      ]
    },
    {
      id: 2,
      title: "Python for Data Science",
      lessons: 6,
      quizzes: 1,
      duration: "3 hours",
      items: []
    },
    {
      id: 3,
      title: "Data Analysis with Pandas",
      lessons: 5,
      quizzes: 1,
      duration: "2.5 hours",
      items: []
    },
  ];

  const enrolledStudents = [
    { id: 1, name: "John Smith", progress: 85, lastActive: "2 hours ago" },
    { id: 2, name: "Emily Davis", progress: 92, lastActive: "1 day ago" },
    { id: 3, name: "Michael Chen", progress: 67, lastActive: "3 hours ago" },
    { id: 4, name: "Sarah Wilson", progress: 78, lastActive: "5 hours ago" },
    { id: 5, name: "David Brown", progress: 45, lastActive: "2 days ago" },
  ];

  const availableStudents = [
    { id: 6, name: "Alex Turner", email: "alex@example.com" },
    { id: 7, name: "Lisa Anderson", email: "lisa@example.com" },
    { id: 8, name: "Mark Johnson", email: "mark@example.com" },
  ];

  const handleEnrollStudents = (studentIds: number[]) => {
    toast({
      title: "Students Enrolled",
      description: `${studentIds.length} student(s) enrolled successfully`,
    });
    setIsEnrollDialogOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-6 py-8">
        {/* Course Header */}
        <div className="gradient-card border border-border rounded-xl p-8 mb-6">
          <div className="flex gap-8">
            <img 
              src={course.thumbnail} 
              alt={course.title}
              className="w-64 h-48 object-cover rounded-lg"
            />
            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-[32px] font-bold">{course.title}</h1>
                    <Badge className="status-badge-published">PUBLISHED</Badge>
                  </div>
                  <p className="text-muted-foreground mb-2">by {course.instructor}</p>
                  <Badge variant="outline" className="mr-2">{course.category}</Badge>
                </div>
                <Button onClick={() => navigate(`/course-builder/${courseId}`)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Course
                </Button>
              </div>
              
              <p className="text-foreground mb-6">{course.description}</p>
              
              <div className="grid grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <div>
                    <div className="text-2xl font-bold">{course.enrolledCount}</div>
                    <div className="text-xs text-muted-foreground">Students</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-warning" />
                  <div>
                    <div className="text-2xl font-bold">{course.rating}</div>
                    <div className="text-xs text-muted-foreground">{course.totalRatings} ratings</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-success" />
                  <div>
                    <div className="text-2xl font-bold">{course.completionRate}%</div>
                    <div className="text-xs text-muted-foreground">Completion</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-accent" />
                  <div>
                    <div className="text-2xl font-bold">{course.duration}</div>
                    <div className="text-xs text-muted-foreground">Duration</div>
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
                  {course.modules} modules • {course.lessons} lessons • {course.quizzes} quizzes
                </div>
              </div>

              <div className="space-y-3">
                {modulesList.map((module) => (
                  <div key={module.id} className="border border-border rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between p-4 bg-card hover:bg-muted/10 cursor-pointer">
                      <div className="flex items-center gap-3">
                        <BookOpen className="h-5 w-5 text-primary" />
                        <div>
                          <div className="font-semibold">{module.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {module.lessons} lessons • {module.quizzes} quiz • {module.duration}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Actions */}
            <div className="gradient-card border border-border rounded-xl p-6">
              <h3 className="font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <Dialog open={isEnrollDialogOpen} onOpenChange={setIsEnrollDialogOpen}>
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
                        {availableStudents.map((student) => (
                          <div key={student.id} className="flex items-center justify-between p-3 border border-border rounded hover:bg-muted/10">
                            <div>
                              <div className="font-medium">{student.name}</div>
                              <div className="text-sm text-muted-foreground">{student.email}</div>
                            </div>
                            <Button size="sm" onClick={() => handleEnrollStudents([student.id])}>
                              Enroll
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button variant="outline" className="w-full" onClick={() => navigate(`/students?course=${courseId}`)}>
                  View All Students
                </Button>
              </div>
            </div>

            {/* Enrolled Students Preview */}
            <div className="gradient-card border border-border rounded-xl p-6">
              <h3 className="font-semibold mb-4">Recently Active Students</h3>
              <div className="space-y-3">
                {enrolledStudents.slice(0, 5).map((student) => (
                  <div key={student.id} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{student.name}</span>
                      <span className="text-muted-foreground">{student.progress}%</span>
                    </div>
                    <div 
                      className="h-2 rounded-full overflow-hidden"
                      style={{ backgroundColor: Colors.gray200 }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${student.progress}%`,
                          background: `linear-gradient(90deg, ${Colors.purple400} 0%, ${Colors.purple600} 100%)`,
                          boxShadow: `0 2px 8px ${Colors.purple400}40`,
                        }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Last active: {student.lastActive}
                    </div>
                  </div>
                ))}
              </div>
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
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Enrollments</span>
                  <span className="font-medium">{course.enrolledCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Avg. Completion Time</span>
                  <span className="font-medium">8.5 weeks</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CourseDetail;
