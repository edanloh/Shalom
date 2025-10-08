import { useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, FileText, CheckCircle, Clock, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Assessments = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const quizzes = [
    { id: 1, title: "Data Science Basics Quiz", course: "Data Science Fundamentals", questions: 15, type: "Multiple Choice", status: "published" },
    { id: 2, title: "ML Algorithms Test", course: "Machine Learning A-Z", questions: 20, type: "Mixed", status: "published" },
    { id: 3, title: "Python Syntax Assessment", course: "Python for Beginners", questions: 25, type: "Code Review", status: "draft" },
  ];

  const pendingGrading = [
    { id: 1, student: "Sarah Johnson", assignment: "Final Project", course: "Data Science", submitted: "2 hours ago", score: null },
    { id: 2, student: "Michael Chen", assignment: "ML Model", course: "Machine Learning", submitted: "5 hours ago", score: null },
    { id: 3, student: "Emma Wilson", assignment: "Python Exercise", course: "Python", submitted: "1 day ago", score: null },
  ];

  const handleCreateQuiz = () => {
    toast({
      title: "Quiz Created",
      description: "Your new quiz has been created successfully"
    });
    setIsCreateDialogOpen(false);
  };

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Assessment Center</h1>
            <p className="text-muted-foreground">Create quizzes and grade submissions</p>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Quiz
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Quiz</DialogTitle>
                <DialogDescription>Design a new assessment for your students</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="quiz-title">Quiz Title</Label>
                  <Input id="quiz-title" placeholder="e.g., Mid-term Exam" />
                </div>
                <div>
                  <Label htmlFor="quiz-course">Course</Label>
                  <Input id="quiz-course" placeholder="Select course..." />
                </div>
                <div>
                  <Label htmlFor="quiz-questions">Number of Questions</Label>
                  <Input id="quiz-questions" type="number" placeholder="15" />
                </div>
                <div>
                  <Label htmlFor="quiz-instructions">Instructions</Label>
                  <Textarea id="quiz-instructions" placeholder="Enter quiz instructions..." />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateQuiz}>Create Quiz</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="quizzes" className="space-y-6">
          <TabsList className="grid w-full md:w-[400px] grid-cols-2">
            <TabsTrigger value="quizzes">Quiz Library</TabsTrigger>
            <TabsTrigger value="grading">Grading Queue</TabsTrigger>
          </TabsList>

          <TabsContent value="quizzes" className="space-y-4">
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {quizzes.map((quiz) => (
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
              ))}
            </div>
          </TabsContent>

          <TabsContent value="grading" className="space-y-4">
            <Card className="p-6 gradient-card border-border">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="h-5 w-5 text-warning" />
                <h3 className="font-semibold text-foreground">
                  {pendingGrading.length} Submissions Pending
                </h3>
              </div>
              <div className="space-y-4">
                {pendingGrading.map((submission) => (
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
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Assessments;
