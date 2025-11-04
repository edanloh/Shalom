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
import { Plus, Search, FileText, CheckCircle, Clock, Filter, X, ChevronDown, BookOpen, Layers } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Pagination } from "@/components/Pagination";

const Assessments = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [courseSearchQuery, setCourseSearchQuery] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [selectedModule, setSelectedModule] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(9);
  const [isCourseDialogOpen, setIsCourseDialogOpen] = useState(false);
  const { toast } = useToast();

  // Generate more courses for demonstration
  const allCourses = useMemo(() => {
    const baseCourses = [
      { id: "1", name: "Data Science Fundamentals", modules: 8, students: 124 },
      { id: "2", name: "Machine Learning A-Z", modules: 12, students: 98 },
      { id: "3", name: "Python for Beginners", modules: 6, students: 203 },
      { id: "4", name: "Advanced Analytics", modules: 10, students: 67 },
      { id: "5", name: "Deep Learning Specialization", modules: 15, students: 89 },
      { id: "6", name: "Natural Language Processing", modules: 9, students: 56 },
      { id: "7", name: "Computer Vision Basics", modules: 11, students: 73 },
      { id: "8", name: "Web Development Bootcamp", modules: 14, students: 156 },
      { id: "9", name: "React & Redux Masterclass", modules: 8, students: 112 },
      { id: "10", name: "Node.js Backend Development", modules: 10, students: 94 },
      { id: "11", name: "Full Stack JavaScript", modules: 16, students: 145 },
      { id: "12", name: "Database Design & SQL", modules: 7, students: 89 },
      { id: "13", name: "Cloud Computing with AWS", modules: 13, students: 78 },
      { id: "14", name: "DevOps Engineering", modules: 11, students: 65 },
      { id: "15", name: "Cybersecurity Fundamentals", modules: 9, students: 102 },
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
    { id: "4", name: "Module 4: Practical Applications", courseId: selectedCourse },
  ] : [];

  const quizzes = [
    { id: 1, title: "Data Science Basics Quiz", course: "Data Science Fundamentals", courseId: "1", moduleId: "1", questions: 15, type: "Multiple Choice", status: "published" },
    { id: 2, title: "ML Algorithms Test", course: "Machine Learning A-Z", courseId: "2", moduleId: "2", questions: 20, type: "Mixed", status: "published" },
    { id: 3, title: "Python Syntax Assessment", course: "Python for Beginners", courseId: "3", moduleId: "1", questions: 25, type: "Code Review", status: "draft" },
    { id: 4, title: "Advanced Analytics Final", course: "Advanced Analytics", courseId: "4", moduleId: "3", questions: 30, type: "Mixed", status: "published" },
    { id: 5, title: "Neural Networks Quiz", course: "Deep Learning Specialization", courseId: "5", moduleId: "2", questions: 18, type: "Multiple Choice", status: "published" },
  ];

  const pendingGrading = [
    { id: 1, student: "Sarah Johnson", assignment: "Final Project", course: "Data Science Fundamentals", courseId: "1", moduleId: "1", submitted: "2 hours ago", score: null },
    { id: 2, student: "Michael Chen", assignment: "ML Model", course: "Machine Learning A-Z", courseId: "2", moduleId: "2", submitted: "5 hours ago", score: null },
    { id: 3, student: "Emma Wilson", assignment: "Python Exercise", course: "Python for Beginners", courseId: "3", moduleId: "3", submitted: "1 day ago", score: null },
    { id: 4, student: "James Rodriguez", assignment: "Analytics Report", course: "Advanced Analytics", courseId: "4", moduleId: "2", submitted: "3 hours ago", score: null },
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

  const handleCourseSelect = (courseId: string) => {
    setSelectedCourse(courseId);
    setSelectedModule("");
    setIsCourseDialogOpen(false);
    setCourseSearchQuery("");
  };

  const handleClearFilters = () => {
    setSelectedCourse("");
    setSelectedModule("");
    setCourseSearchQuery("");
  };

  const selectedCourseData = courses.find(c => c.id === selectedCourse);

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

        {/* Enhanced Filter Section */}
        <Card className="p-6 gradient-card border-border">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-lg">Filter by Course & Module</h3>
          </div>

          <div className="space-y-4">
            {/* Course Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Course Selector */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Course</Label>
                {!selectedCourse ? (
                  <Dialog open={isCourseDialogOpen} onOpenChange={setIsCourseDialogOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="w-full justify-between h-auto py-3 px-4 hover:border-primary hover:bg-primary/5"
                      >
                        <span className="text-muted-foreground">Select a course...</span>
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh]">
                      <DialogHeader>
                        <DialogTitle>Select Course</DialogTitle>
                        <DialogDescription>
                          Choose a course to filter assessments and grading queue
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search courses by name..."
                            className="pl-10"
                            value={courseSearchQuery}
                            onChange={(e) => setCourseSearchQuery(e.target.value)}
                            autoFocus
                          />
                        </div>

                        <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2">
                          {filteredCoursesForSelection.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                              <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                              <p>No courses found matching "{courseSearchQuery}"</p>
                            </div>
                          ) : (
                            filteredCoursesForSelection.map(course => (
                              <button
                                key={course.id}
                                onClick={() => handleCourseSelect(course.id)}
                                className="w-full p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all text-left group"
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors mb-1">
                                      {course.name}
                                    </h4>
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                      <span className="flex items-center gap-1">
                                        <Layers className="h-3.5 w-3.5" />
                                        {course.modules} modules
                                      </span>
                                      <span>{course.students} students</span>
                                    </div>
                                  </div>
                                  <ChevronDown className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors rotate-[-90deg]" />
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                ) : (
                  <div className="relative">
                    <div className="p-4 rounded-lg border-2 border-primary bg-primary/5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <BookOpen className="h-4 w-4 text-primary flex-shrink-0" />
                            <p className="font-semibold text-foreground truncate">
                              {selectedCourseData?.name}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Layers className="h-3 w-3" />
                              {selectedCourseData?.modules} modules
                            </span>
                            <span>{selectedCourseData?.students} students</span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleClearFilters}
                          className="gap-1 flex-shrink-0 hover:bg-destructive/10 hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                          Clear
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Module Selector */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Module (Optional)</Label>
                {!selectedCourse ? (
                  <div className="p-4 rounded-lg border border-dashed border-border bg-muted/30 flex items-center justify-center h-[72px]">
                    <p className="text-sm text-muted-foreground">Select a course first</p>
                  </div>
                ) : (
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
                )}
              </div>
            </div>

            {/* Active Filters Summary */}
            {(selectedCourse || selectedModule) && (
              <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-muted-foreground">Active filters:</span>
                    {selectedCourse && (
                      <Badge variant="secondary" className="gap-1">
                        {selectedCourseData?.name}
                      </Badge>
                    )}
                    {selectedModule && (
                      <Badge variant="secondary" className="gap-1">
                        {modules.find(m => m.id === selectedModule)?.name}
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearFilters}
                    className="gap-1 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                    Clear all
                  </Button>
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
              <Card className="p-12 gradient-card border-border text-center">
                <div className="max-w-md mx-auto">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Filter className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-2">Select a Course</h3>
                  <p className="text-muted-foreground mb-6">
                    Choose a course from the filters above to view and manage quizzes
                  </p>
                  <Button onClick={() => setIsCourseDialogOpen(true)} className="gap-2">
                    <BookOpen className="h-4 w-4" />
                    Browse Courses
                  </Button>
                </div>
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
                      <div className="col-span-full">
                        <Card className="p-12 gradient-card border-border text-center">
                          <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                          <h3 className="text-xl font-semibold mb-2">No Quizzes Found</h3>
                          <p className="text-muted-foreground">
                            {searchQuery 
                              ? `No quizzes match "${searchQuery}"`
                              : "No quizzes available for the selected filters"}
                          </p>
                        </Card>
                      </div>
                    ) : (
                      filteredQuizzes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((quiz) => (
                        <Card key={quiz.id} className="p-6 gradient-card border-border hover-lift">
                          <div className="space-y-4">
                            <div className="flex items-start justify-between">
                              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                <FileText className="h-6 w-6 text-primary" />
                              </div>
                              <Badge variant={quiz.status === "published" ? "default" : "secondary"}>
                                {quiz.status}
                              </Badge>
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg text-foreground mb-1">{quiz.title}</h3>
                              <p className="text-sm text-muted-foreground line-clamp-1">{quiz.course}</p>
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
              <Card className="p-12 gradient-card border-border text-center">
                <div className="max-w-md mx-auto">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Clock className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-2">Select a Course</h3>
                  <p className="text-muted-foreground mb-6">
                    Choose a course from the filters above to view pending submissions
                  </p>
                  <Button onClick={() => setIsCourseDialogOpen(true)} className="gap-2">
                    <BookOpen className="h-4 w-4" />
                    Browse Courses
                  </Button>
                </div>
              </Card>
            ) : (
              <Card className="p-6 gradient-card border-border">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {filteredGrading.length} Submission{filteredGrading.length !== 1 ? 's' : ''} Pending
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedCourseData?.name}
                    </p>
                  </div>
                </div>
                {filteredGrading.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="h-8 w-8 text-success" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">All Caught Up!</h3>
                    <p className="text-muted-foreground">No pending submissions for selected filters</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredGrading.map((submission) => (
                      <div key={submission.id} className="p-5 rounded-lg bg-background/50 border border-border hover:border-primary/30 transition-colors space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground mb-1">{submission.student}</p>
                            <p className="text-sm text-foreground/80 mb-1">{submission.assignment}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{submission.course}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {submission.submitted}
                              </span>
                            </div>
                          </div>
                          <Badge variant="outline" className="flex-shrink-0">Pending</Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleGradeSubmission(submission.id, 85)}
                            className="flex-1"
                          >
                            Review Submission
                          </Button>
                          <Button 
                            size="sm"
                            onClick={() => handleGradeSubmission(submission.id, 90)}
                            className="flex-1 gap-1"
                          >
                            <CheckCircle className="h-4 w-4" />
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