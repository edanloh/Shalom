import { useState, useMemo } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, FileText, CheckCircle, Clock, Filter, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Pagination } from "@/components/Pagination";

const Assessments = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [courseSearchQuery, setCourseSearchQuery] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [selectedModule, setSelectedModule] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(9);
  const { toast } = useToast();

  // Generate more courses for demonstration
  const allCourses = useMemo(() => {
    const baseCourses = [
      { id: "1", name: "Data Science Fundamentals" },
      { id: "2", name: "Machine Learning A-Z" },
      { id: "3", name: "Python for Beginners" },
      { id: "4", name: "Advanced Analytics" },
      { id: "5", name: "Deep Learning Specialization" },
      { id: "6", name: "Natural Language Processing" },
      { id: "7", name: "Computer Vision Basics" },
      { id: "8", name: "Web Development Bootcamp" },
      { id: "9", name: "React & Redux Masterclass" },
      { id: "10", name: "Node.js Backend Development" },
    ];
    return baseCourses;
  }, []);

  const filteredCoursesForSelection = useMemo(() => {
    return allCourses.filter(course =>
      course.name.toLowerCase().includes(courseSearchQuery.toLowerCase())
    );
  }, [allCourses, courseSearchQuery]);

  const courses = allCourses;

  const modules = selectedCourse ? [
    { id: "1", name: "Module 1: Introduction", courseId: selectedCourse },
    { id: "2", name: "Module 2: Fundamentals", courseId: selectedCourse },
    { id: "3", name: "Module 3: Advanced Topics", courseId: selectedCourse },
  ] : [];

  const quizzes = [
    { id: 1, title: "Data Science Basics Quiz", course: "Data Science Fundamentals", courseId: "1", moduleId: "1", questions: 15, type: "Multiple Choice", status: "published" },
    { id: 2, title: "ML Algorithms Test", course: "Machine Learning A-Z", courseId: "2", moduleId: "2", questions: 20, type: "Mixed", status: "published" },
    { id: 3, title: "Python Syntax Assessment", course: "Python for Beginners", courseId: "3", moduleId: "1", questions: 25, type: "Code Review", status: "draft" },
  ];

  const pendingGrading = [
    { id: 1, student: "Sarah Johnson", assignment: "Final Project", course: "Data Science Fundamentals", courseId: "1", moduleId: "1", submitted: "2 hours ago", score: null },
    { id: 2, student: "Michael Chen", assignment: "ML Model", course: "Machine Learning A-Z", courseId: "2", moduleId: "2", submitted: "5 hours ago", score: null },
    { id: 3, student: "Emma Wilson", assignment: "Python Exercise", course: "Python for Beginners", courseId: "3", moduleId: "3", submitted: "1 day ago", score: null },
  ];

  const filteredQuizzes = quizzes.filter(quiz => {
    const matchesSearch = quiz.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCourse = !selectedCourse || quiz.courseId === selectedCourse;
    const matchesModule = !selectedModule || quiz.moduleId === selectedModule;
    return matchesSearch && matchesCourse && matchesModule;
  });

  const filteredGrading = pendingGrading.filter(item => {
    const matchesCourse = !selectedCourse || item.courseId === selectedCourse;
    const matchesModule = !selectedModule || item.moduleId === selectedModule;
    return matchesCourse && matchesModule;
  });

  const handleGradeSubmission = (id: number, score: number) => {
    toast({
      title: "Graded",
      description: `Assignment graded with score: ${score}/100`
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Assessment Center</h1>
            <p className="text-muted-foreground">Create quizzes and grade submissions by course and module</p>
          </div>
          
        </div>

        {/* Filter Section - Smart Course Selection */}
        <Card className="p-6 gradient-card border-border">
          <div className="space-y-4">
            {/* Course Filter with Search */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Filter className="h-5 w-5 text-primary" />
                  <Label className="font-semibold">Select Course</Label>
                </div>
                {selectedCourse && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedCourse("");
                      setSelectedModule("");
                      setCourseSearchQuery("");
                    }}
                    className="gap-1 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                    Clear Selection
                  </Button>
                )}
              </div>

              {!selectedCourse ? (
                <>
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search courses by name..."
                      className="pl-10"
                      value={courseSearchQuery}
                      onChange={(e) => setCourseSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[240px] overflow-y-auto pr-2">
                    {filteredCoursesForSelection.map(course => (
                      <Button
                        key={course.id}
                        variant="outline"
                        className="justify-start h-auto py-3 px-4 hover:border-primary hover:bg-primary/5"
                        onClick={() => {
                          setSelectedCourse(course.id);
                          setCourseSearchQuery("");
                        }}
                      >
                        <div className="text-left">
                          <p className="font-medium text-sm">{course.name}</p>
                        </div>
                      </Button>
                    ))}
                  </div>
                  {filteredCoursesForSelection.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground">
                      No courses found matching "{courseSearchQuery}"
                    </div>
                  )}
                </>
              ) : (
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Selected Course</p>
                      <p className="font-semibold text-lg">
                        {courses.find(c => c.id === selectedCourse)?.name}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Module Filter - Only shown when course is selected */}
            {selectedCourse && modules.length > 0 && (
              <div className="pt-4 border-t border-border">
                <Label className="font-semibold mb-3 block">Select Module (Optional)</Label>
                <div className="flex flex-wrap gap-2">
                  {modules.map(module => (
                    <Button
                      key={module.id}
                      variant={selectedModule === module.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedModule(module.id === selectedModule ? "" : module.id)}
                      className="rounded-full"
                    >
                      {module.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        <Tabs defaultValue="quizzes" className="space-y-6">
          <TabsList className="grid w-full md:w-[400px] grid-cols-2">
            <TabsTrigger value="quizzes">Quiz Library</TabsTrigger>
            <TabsTrigger value="grading">Grading Queue</TabsTrigger>
          </TabsList>

          <TabsContent value="quizzes" className="space-y-4">
            {!selectedCourse ? (
              <Card className="p-8 gradient-card border-border text-center">
                <Filter className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">Select a Course to View Quizzes</h3>
                <p className="text-muted-foreground">Please select a course from the filters above to view and manage quizzes</p>
              </Card>
            ) : (
              <>
                <Card className="p-6 gradient-card border-border">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search quizzes..."
                      className="pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </Card>

                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredQuizzes.length === 0 ? (
                      <div className="col-span-full text-center py-12">
                        <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground">No quizzes found for selected filters</p>
                      </div>
                    ) : (
                      filteredQuizzes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((quiz) => (
                        <Card key={quiz.id} className="p-6 gradient-card border-border hover-lift">
                          <div className="space-y-4">
                            <div className="flex items-start justify-between">
                              <FileText className="h-8 w-8 text-primary" />
                              <Badge variant={quiz.status === "published" ? "default" : "secondary"}>
                                {quiz.status}
                              </Badge>
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg text-foreground mb-1">{quiz.title}</h3>
                              <p className="text-sm text-muted-foreground">{quiz.course}</p>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">{quiz.questions} questions</span>
                              <span className="text-muted-foreground">{quiz.type}</span>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" className="flex-1">Edit</Button>
                              <Button size="sm" className="flex-1">View Results</Button>
                            </div>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                  {filteredQuizzes.length > 0 && (
                    <Pagination
                      currentPage={currentPage}
                      totalPages={Math.ceil(filteredQuizzes.length / itemsPerPage)}
                      onPageChange={setCurrentPage}
                      itemsPerPage={itemsPerPage}
                      totalItems={filteredQuizzes.length}
                    />
                  )}
                </>
              </>
            )}
          </TabsContent>

          <TabsContent value="grading" className="space-y-4">
            {!selectedCourse ? (
              <Card className="p-8 gradient-card border-border text-center">
                <Filter className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">Select a Course to View Grading Queue</h3>
                <p className="text-muted-foreground">Please select a course from the filters above to view pending submissions</p>
              </Card>
            ) : (
              <Card className="p-6 gradient-card border-border">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="h-5 w-5 text-warning" />
                  <h3 className="font-semibold text-foreground">
                    {filteredGrading.length} Submissions Pending
                  </h3>
                </div>
                {filteredGrading.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="h-16 w-16 mx-auto mb-4 text-success" />
                    <p className="text-muted-foreground">No pending submissions for selected filters</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredGrading.map((submission) => (
                  <div key={submission.id} className="p-4 rounded-lg bg-background/50 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-foreground">{submission.student}</p>
                        <p className="text-sm text-muted-foreground">{submission.assignment}</p>
                        <p className="text-xs text-muted-foreground mt-1">{submission.course} • {submission.submitted}</p>
                      </div>
                      <Badge variant="outline">Pending</Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleGradeSubmission(submission.id, 85)}
                      >
                        Review
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => handleGradeSubmission(submission.id, 90)}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Quick Grade
                      </Button>
                    </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Assessments;
