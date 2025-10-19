import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Colors } from "@/constants";
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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import courseThumbnail1 from "@/assets/course-thumbnail-1.jpg";

const CourseDetail = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isEnrollDialogOpen, setIsEnrollDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedModules, setExpandedModules] = useState<number[]>([1]);

  const course = {
    id: courseId,
    title: "Data Science Fundamentals",
    description:
      "Master the core concepts of data science including statistics, machine learning, data visualization, and real-world applications. This comprehensive course covers Python programming, data analysis libraries, and hands-on projects.",
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
        { id: 4, type: "lesson", title: "Getting Started", duration: "12 min" },
        { id: 5, type: "lesson", title: "Best Practices", duration: "22 min" },
        { id: 6, type: "quiz", title: "Introduction Quiz", questions: 10 },
      ],
    },
    {
      id: 2,
      title: "Python for Data Science",
      lessons: 6,
      quizzes: 1,
      duration: "3 hours",
      items: [
        { id: 1, type: "lesson", title: "Python Basics", duration: "25 min" },
        {
          id: 2,
          type: "lesson",
          title: "Data Types & Structures",
          duration: "30 min",
        },
        { id: 3, type: "lesson", title: "Control Flow", duration: "22 min" },
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
      items: [
        {
          id: 1,
          type: "lesson",
          title: "Introduction to Pandas",
          duration: "20 min",
        },
        { id: 2, type: "lesson", title: "DataFrames", duration: "25 min" },
        { id: 3, type: "lesson", title: "Data Cleaning", duration: "30 min" },
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
        { id: 6, type: "quiz", title: "Pandas Mastery Quiz", questions: 12 },
      ],
    },
  ];

  const reviews = [
    {
      id: 1,
      studentName: "John Smith",
      rating: 5,
      date: "2 weeks ago",
      comment:
        "Excellent course! The content is well-structured and easy to follow. Dr. Johnson's teaching style is engaging and clear.",
    },
    {
      id: 2,
      studentName: "Emily Davis",
      rating: 4,
      date: "1 month ago",
      comment:
        "Great course overall. Would love to see more hands-on projects.",
    },
    {
      id: 3,
      studentName: "Michael Chen",
      rating: 5,
      date: "1 month ago",
      comment: "Best data science course I've taken. Highly recommend!",
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

  const toggleModule = (moduleId: number) => {
    setExpandedModules((prev) =>
      prev.includes(moduleId)
        ? prev.filter((id) => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const handleEnrollStudents = (studentIds: number[]) => {
    toast({
      title: "Students Enrolled",
      description: `${studentIds.length} student(s) enrolled successfully`,
    });
    setIsEnrollDialogOpen(false);
  };

  const handleItemClick = (module: any, item: any) => {
    if (item.type === "lesson") {
      navigate(`/course/${courseId}/module/${module.id}/lesson/${item.id}`);
    } else if (item.type === "quiz") {
      navigate(`/course/${courseId}/module/${module.id}/quiz/${item.id}`);
    }
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
                  <p className="text-muted-foreground mb-2">
                    by {course.instructor}
                  </p>
                  <Badge variant="outline" className="mr-2">
                    {course.category}
                  </Badge>
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
                    <div className="text-2xl font-bold">{course.rating}</div>
                    <div className="text-xs text-muted-foreground">
                      {course.totalRatings} ratings
                    </div>
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
                      <div className="flex items-center gap-3">
                        <BookOpen className="h-5 w-5 text-primary" />
                        <div>
                          <div className="font-semibold">{module.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {module.lessons} lessons • {module.quizzes} quiz •{" "}
                            {module.duration}
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
                              ) : (
                                <FileText className="h-4 w-4 text-warning" />
                              )}
                              <span className="text-sm">{item.title}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {item.type === "lesson"
                                ? item.duration
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

            {/* Course Reviews Section */}
            <div className="gradient-card border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Student Reviews</h2>
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
                        // Mock data for rating distribution
                        const distribution: Record<number, number> = {
                          5: 65,
                          4: 20,
                          3: 10,
                          2: 3,
                          1: 2,
                        };
                        const percentage = distribution[rating];
                        const count = Math.round(
                          (course.totalRatings * percentage) / 100
                        );

                        return (
                          <div key={rating} className="flex items-center gap-3 max-h-4">
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
                              {percentage}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Individual Reviews */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Recent Reviews</h3>
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
                        <p className="text-muted-foreground">
                          {review.comment}
                        </p>
                      </div>
                    ))}
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
                        {availableStudents.map((student) => (
                          <div
                            key={student.id}
                            className="flex items-center justify-between p-3 border border-border rounded hover:bg-muted/10"
                          >
                            <div>
                              <div className="font-medium">{student.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {student.email}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleEnrollStudents([student.id])}
                            >
                              Enroll
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate(`/students?course=${courseId}`)}
                >
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
                      <span className="text-muted-foreground">
                        {student.progress}%
                      </span>
                    </div>
                    <div className="space-y-1">
                      <Progress value={student.progress} />
                    </div>
                    <div className="text-xs text-muted-foreground mb-2">
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
                  <span className="text-muted-foreground">
                    Total Enrollments
                  </span>
                  <span className="font-medium">{course.enrolledCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Avg. Completion Time
                  </span>
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
