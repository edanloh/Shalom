import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ChevronDown, ChevronRight, GripVertical, Plus, MoreVertical, 
  Video, FileText, Save, Eye, Upload, Users 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type CourseStatus = "published" | "draft" | "unpublished";

interface Lesson {
  id: string;
  title: string;
  type: "video" | "document";
  status: CourseStatus;
}

interface Quiz {
  id: string;
  title: string;
  questionCount: number;
  status: CourseStatus;
}

interface Module {
  id: string;
  title: string;
  description: string;
  status: CourseStatus;
  expanded: boolean;
  lessons: Lesson[];
  quizzes: Quiz[];
}

const CourseBuilder = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [courseName, setCourseName] = useState("Data Science Fundamentals");
  const [courseStatus, setCourseStatus] = useState<CourseStatus>("draft");
  const [selectedItem, setSelectedItem] = useState<{ type: "module" | "lesson" | "quiz"; id: string } | null>(null);
  
  const [modules, setModules] = useState<Module[]>([
    {
      id: "m1",
      title: "Module 1: Introduction to Data Science",
      description: "Learn the fundamentals of data science",
      status: "published",
      expanded: true,
      lessons: [
        { id: "l1", title: "Lesson 1.1: What is Data Science?", type: "video", status: "published" },
        { id: "l2", title: "Lesson 1.2: Data Science Tools", type: "video", status: "draft" },
      ],
      quizzes: [
        { id: "q1", title: "Quiz 1: Introduction Assessment", questionCount: 10, status: "published" },
      ]
    },
  ]);

  const toggleModuleExpansion = (moduleId: string) => {
    setModules(modules.map(m => 
      m.id === moduleId ? { ...m, expanded: !m.expanded } : m
    ));
  };

  const addModule = () => {
    const newModule: Module = {
      id: `m${Date.now()}`,
      title: `Module ${modules.length + 1}: New Module`,
      description: "",
      status: "draft",
      expanded: true,
      lessons: [],
      quizzes: [],
    };
    setModules([...modules, newModule]);
    toast({ title: "Module Added", description: "New module created successfully" });
  };

  const addLesson = (moduleId: string) => {
    setModules(modules.map(m => {
      if (m.id === moduleId) {
        const newLesson: Lesson = {
          id: `l${Date.now()}`,
          title: `Lesson ${m.lessons.length + 1}: New Lesson`,
          type: "video",
          status: "draft",
        };
        return { ...m, lessons: [...m.lessons, newLesson] };
      }
      return m;
    }));
    toast({ title: "Lesson Added", description: "New lesson created successfully" });
  };

  const addQuiz = (moduleId: string) => {
    setModules(modules.map(m => {
      if (m.id === moduleId) {
        const newQuiz: Quiz = {
          id: `q${Date.now()}`,
          title: `Quiz ${m.quizzes.length + 1}: New Quiz`,
          questionCount: 0,
          status: "draft",
        };
        return { ...m, quizzes: [...m.quizzes, newQuiz] };
      }
      return m;
    }));
    toast({ title: "Quiz Added", description: "New quiz created successfully" });
  };

  const handlePublish = () => {
    setCourseStatus("published");
    toast({ title: "Course Published", description: "Your course is now live!" });
  };

  const handleSaveDraft = () => {
    setCourseStatus("draft");
    toast({ title: "Draft Saved", description: "Your changes have been saved" });
  };

  const handleUnpublish = () => {
    setCourseStatus("unpublished");
    toast({ title: "Course Unpublished", description: "Course is no longer visible to students" });
  };

  const renderStatusBadge = (status: CourseStatus) => {
    const classes = status === "published" ? "status-badge-published" :
                   status === "draft" ? "status-badge-draft" :
                   "status-badge-unpublished";
    return (
      <Badge className={`${classes} text-xs px-2 py-0.5`}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="flex h-[calc(100vh-64px)]">
        {/* LEFT SIDEBAR - Course Structure */}
        <div className="w-[25%] bg-card border-r border-border overflow-y-auto">
          <div className="p-6 border-b border-border">
            <h2 className="text-2xl font-bold mb-2">{courseName}</h2>
            <Button onClick={addModule} className="w-full gap-2 mt-4">
              <Plus className="h-4 w-4" />
              Add New Module
            </Button>
          </div>

          <div className="p-4 space-y-2">
            {modules.map((module) => (
              <div key={module.id} className="border border-border rounded-lg">
                <div 
                  className="flex items-center gap-2 p-3 hover:bg-muted/10 cursor-pointer"
                  onClick={() => setSelectedItem({ type: "module", id: module.id })}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <button onClick={(e) => { e.stopPropagation(); toggleModuleExpansion(module.id); }}>
                    {module.expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                  <span className="flex-1 text-sm font-medium">{module.title}</span>
                  {renderStatusBadge(module.status)}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => addLesson(module.id)}>Add Lesson</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => addQuiz(module.id)}>Add Quiz</DropdownMenuItem>
                      <DropdownMenuItem>Delete Module</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {module.expanded && (
                  <div className="pl-8 pb-2 space-y-1">
                    {module.lessons.map((lesson) => (
                      <div
                        key={lesson.id}
                        className="flex items-center gap-2 p-2 hover:bg-muted/10 cursor-pointer rounded"
                        onClick={() => setSelectedItem({ type: "lesson", id: lesson.id })}
                      >
                        <GripVertical className="h-3 w-3 text-muted-foreground" />
                        {lesson.type === "video" ? <Video className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                        <span className="flex-1 text-sm">{lesson.title}</span>
                        {renderStatusBadge(lesson.status)}
                      </div>
                    ))}
                    {module.quizzes.map((quiz) => (
                      <div
                        key={quiz.id}
                        className="flex items-center gap-2 p-2 hover:bg-muted/10 cursor-pointer rounded"
                        onClick={() => setSelectedItem({ type: "quiz", id: quiz.id })}
                      >
                        <GripVertical className="h-3 w-3 text-muted-foreground" />
                        <FileText className="h-4 w-4" />
                        <span className="flex-1 text-sm">{quiz.title}</span>
                        {renderStatusBadge(quiz.status)}
                      </div>
                    ))}
                    <div className="flex gap-2 mt-2">
                      <Button variant="outline" size="sm" onClick={() => addLesson(module.id)} className="text-xs">
                        <Plus className="h-3 w-3 mr-1" /> Add Lesson
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => addQuiz(module.id)} className="text-xs">
                        <Plus className="h-3 w-3 mr-1" /> Add Quiz
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CENTER PANEL - Content Editor */}
        <div className="flex-1 overflow-y-auto p-8">
          {selectedItem?.type === "module" && (
            <div className="space-y-6">
              <h1 className="text-[32px] font-bold">Module Settings</h1>
              <div className="space-y-4">
                <div>
                  <Label>Module Title</Label>
                  <Input placeholder="Module title..." className="mt-2" />
                </div>
                <div>
                  <Label>Module Description</Label>
                  <Textarea placeholder="Module description..." className="mt-2" rows={6} />
                </div>
                <Button onClick={handleSaveDraft}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </div>
          )}

          {selectedItem?.type === "lesson" && (
            <div className="space-y-6">
              <h1 className="text-[32px] font-bold">Lesson Editor</h1>
              <div className="space-y-4">
                <div>
                  <Label>Lesson Title</Label>
                  <Input placeholder="Lesson title..." className="mt-2" />
                </div>
                <div>
                  <Label>Video Source</Label>
                  <Select defaultValue="upload">
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="upload">Upload Video</SelectItem>
                      <SelectItem value="youtube">YouTube Embed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="border-2 border-dashed border-border rounded-lg p-12 text-center">
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Drop video file here or click to upload</p>
                  <Button variant="outline" className="mt-4">Browse Files</Button>
                </div>
                <div>
                  <Label>Lesson Description</Label>
                  <Textarea placeholder="Lesson content..." className="mt-2" rows={8} />
                </div>
                <Button onClick={handleSaveDraft}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Lesson
                </Button>
              </div>
            </div>
          )}

          {selectedItem?.type === "quiz" && (
            <div className="space-y-6">
              <h1 className="text-[32px] font-bold">Quiz Editor</h1>
              <div className="space-y-4">
                <div>
                  <Label>Quiz Title</Label>
                  <Input placeholder="Quiz title..." className="mt-2" />
                </div>
                <div>
                  <Label>Quiz Type</Label>
                  <Select defaultValue="mcq">
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mcq">Multiple Choice</SelectItem>
                      <SelectItem value="short">Short Answer</SelectItem>
                      <SelectItem value="matching">Matching</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="border border-border rounded-lg p-6">
                  <h3 className="font-semibold mb-4">Questions</h3>
                  <p className="text-muted-foreground text-sm">No questions added yet</p>
                  <Button variant="outline" className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Question
                  </Button>
                </div>
                <Button onClick={handleSaveDraft}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Quiz
                </Button>
              </div>
            </div>
          )}

          {!selectedItem && (
            <div className="flex items-center justify-center h-full text-center">
              <div>
                <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">Select an item to edit</h3>
                <p className="text-muted-foreground">Choose a module, lesson, or quiz from the left sidebar</p>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT SIDEBAR - Settings & Actions */}
        <div className="w-[25%] bg-card border-l border-border overflow-y-auto p-6 space-y-6">
          <div>
            <h3 className="font-semibold mb-3">Course Status</h3>
            <div className="mb-4">
              Current: {renderStatusBadge(courseStatus)}
            </div>
            <div className="space-y-2">
              <Button onClick={handleSaveDraft} variant="outline" className="w-full gap-2">
                <Save className="h-4 w-4" />
                Save as Draft
              </Button>
              <Button onClick={handlePublish} className="w-full gap-2">
                <Upload className="h-4 w-4" />
                Publish Course
              </Button>
              <Button onClick={handleUnpublish} variant="destructive" className="w-full gap-2">
                Unpublish Course
              </Button>
            </div>
          </div>

          <div className="border-t border-border pt-6">
            <h3 className="font-semibold mb-3">Preview & Students</h3>
            <div className="space-y-2">
              <Button variant="outline" className="w-full gap-2">
                <Eye className="h-4 w-4" />
                Preview Course
              </Button>
              <Button variant="outline" className="w-full gap-2">
                <Users className="h-4 w-4" />
                Enroll Students
              </Button>
              <div className="text-sm text-muted-foreground mt-4">
                <strong>245 students</strong> enrolled
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-6">
            <h3 className="font-semibold mb-3">Course Settings</h3>
            <div className="space-y-4">
              <div>
                <Label className="text-xs">Course Thumbnail</Label>
                <div className="mt-2 border border-border rounded p-4 text-center">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Upload image</p>
                </div>
              </div>
              <div>
                <Label className="text-xs">Category</Label>
                <Input placeholder="Data Science" className="mt-2" />
              </div>
              <div>
                <Label className="text-xs">Tags</Label>
                <Input placeholder="python, analytics" className="mt-2" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseBuilder;
