import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight, Video, FileText, CheckCircle, Clock } from "lucide-react";

const LessonDetail = () => {
  const { courseId, moduleId, lessonId } = useParams();
  const navigate = useNavigate();
  const [progress, setProgress] = useState(45);

  const lesson = {
    id: lessonId,
    title: "Introduction to React Components",
    description: "Learn the fundamentals of React components, props, and state management.",
    duration: "18 minutes",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    content: `
      <h2>Learning Objectives</h2>
      <ul>
        <li>Understand what React components are</li>
        <li>Learn the difference between functional and class components</li>
        <li>Master props and state management</li>
        <li>Build your first React component</li>
      </ul>
      
      <h2>Component Basics</h2>
      <p>React components are the building blocks of any React application. They allow you to split the UI into independent, reusable pieces.</p>
      
      <h2>Props</h2>
      <p>Props are arguments passed into React components, similar to function parameters.</p>
      
      <h2>State</h2>
      <p>State is a built-in object used to contain data or information about the component.</p>
    `,
  };

  const handleComplete = () => {
    setProgress(100);
    navigate(`/course/${courseId}/module/${moduleId}/quiz/1`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-6 py-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(`/course/${courseId}`)}
            className="mb-4"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Course
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[32px] font-bold">{lesson.title}</h1>
              <p className="text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {lesson.duration}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">{progress}% Complete</span>
              <Progress value={progress} className="w-32" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            {/* Video Player */}
            <div className="gradient-card border border-border rounded-xl overflow-hidden">
              <div className="aspect-video bg-card">
                <iframe
                  width="100%"
                  height="100%"
                  src={lesson.videoUrl}
                  title={lesson.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                ></iframe>
              </div>
            </div>

            {/* Lesson Content */}
            <div className="gradient-card border border-border rounded-xl p-6">
              <Tabs defaultValue="content">
                <TabsList className="mb-6">
                  <TabsTrigger value="content">
                    <FileText className="h-4 w-4 mr-2" />
                    Content
                  </TabsTrigger>
                  <TabsTrigger value="transcript">
                    <Video className="h-4 w-4 mr-2" />
                    Transcript
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="content">
                  <div 
                    className="prose prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: lesson.content }}
                  />
                </TabsContent>

                <TabsContent value="transcript">
                  <p className="text-muted-foreground">Video transcript will appear here...</p>
                </TabsContent>
              </Tabs>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <Button variant="outline">
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous Lesson
              </Button>
              <Button onClick={handleComplete}>
                Mark as Complete
                <CheckCircle className="h-4 w-4 ml-2" />
              </Button>
              <Button>
                Next: Quiz
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="gradient-card border border-border rounded-xl p-6">
              <h3 className="font-semibold mb-4">Lesson Resources</h3>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="h-4 w-4 mr-2" />
                  Download Slides (PDF)
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="h-4 w-4 mr-2" />
                  Code Examples
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="h-4 w-4 mr-2" />
                  Additional Reading
                </Button>
              </div>
            </div>

            <div className="gradient-card border border-border rounded-xl p-6">
              <h3 className="font-semibold mb-4">Module Progress</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span>Lesson 1</span>
                  <CheckCircle className="h-4 w-4 text-success" />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-accent">Lesson 2 (Current)</span>
                  <div className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Lesson 3</span>
                  <Clock className="h-4 w-4" />
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Quiz</span>
                  <Clock className="h-4 w-4" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LessonDetail;
