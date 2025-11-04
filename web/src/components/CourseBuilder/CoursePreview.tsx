import React, { useState } from "react";
import { ArrowLeft, BookOpen, ChevronDown, ChevronRight, Video, FileText, Users, Star, Award, Clock, CheckCircle2 } from "lucide-react";
import { useCourseBuilder } from './CourseBuilderContext';
import { Badge } from "../ui/badge";

const DEFAULT_COURSE_THUMBNAIL = "https://via.placeholder.com/400x250";

export const CoursePreview = () => {
  const {
    courseName,
    courseDescription,
    setPreviewMode,
    modules,
  } = useCourseBuilder();

  const [expandedModules, setExpandedModules] = useState<string[]>([]);

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) =>
      prev.includes(moduleId)
        ? prev.filter((id) => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  // Calculate course statistics
  const totalLessons = modules.reduce((sum, m) => sum + m.lessons.length, 0);
  const totalQuizzes = modules.reduce((sum, m) => sum + m.quizzes.length, 0);
  const totalDuration = modules.reduce((sum, m) => {
    const lessonDuration = m.lessons.reduce((lSum, l) => lSum + (l.durationSeconds || 0), 0);
    return sum + lessonDuration;
  }, 0);

  // Format module items for display
  const modulesList = modules.map((module) => ({
    id: module.id,
    title: module.title,
    description: module.description,
    lessons: module.lessons.length,
    quizzes: module.quizzes.length,
    duration: `${Math.floor(module.lessons.reduce((sum, l) => sum + (l.durationSeconds || 0), 0) / 60)} min`,
    items: [
      ...module.lessons.map((lesson) => ({
        id: lesson.id,
        type: 'lesson' as const,
        title: lesson.title,
        duration: `${Math.floor((lesson.durationSeconds || 0) / 60)} min`,
      })),
      ...module.quizzes.map((quiz) => ({
        id: quiz.id,
        type: 'quiz' as const,
        title: quiz.title,
        questions: quiz.questions?.length || 0,
      })),
    ],
  }));

  return (
    <div className="min-h-screen bg-background">
      {/* Preview Header */}
      <div className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setPreviewMode(false)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Editor
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">{courseName || "Untitled Course"}</h1>
            <p className="text-sm text-slate-400">Course Preview</p>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-6 py-8">
        {/* Course Header */}
        <div className="gradient-card border border-border rounded-xl p-8 mb-6">
          <div className="flex gap-8">
            <img
              src={DEFAULT_COURSE_THUMBNAIL}
              alt={courseName}
              className="w-64 h-48 object-cover rounded-lg"
            />
            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-[32px] font-bold">{courseName || "Untitled Course"}</h1>
                    <Badge className="status-badge-draft">
                      PREVIEW
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mb-2">
                    by Instructor Name
                  </p>
                  <Badge variant="outline" className="mr-2">
                    Category
                  </Badge>
                </div>
              </div>

              <p className="text-foreground mb-6">{courseDescription || "No description provided"}</p>

              <div className="grid grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <div>
                    <div className="text-2xl font-bold">0</div>
                    <div className="text-xs text-muted-foreground">Students</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-warning" />
                  <div>
                    <div className="text-2xl font-bold">-</div>
                    <div className="text-xs text-muted-foreground">Rating</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-success" />
                  <div>
                    <div className="text-2xl font-bold">-</div>
                    <div className="text-xs text-muted-foreground">Completion</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-accent" />
                  <div>
                    <div className="text-2xl font-bold">{Math.floor(totalDuration / 3600)}h {Math.floor((totalDuration % 3600) / 60)}m</div>
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
                  {modules.length} modules • {totalLessons} lessons • {totalQuizzes} quizzes
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
                      <div className="flex items-center gap-3 flex-1">
                        <BookOpen className="h-5 w-5 text-primary" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{module.title}</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {module.lessons} lessons • {module.quizzes} quiz • {module.duration}
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
                            className="flex items-center justify-between p-3 rounded hover:bg-muted/10"
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
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Course Stats */}
            <div className="gradient-card border border-border rounded-xl p-6">
              <h3 className="font-semibold mb-4">Course Overview</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Modules</span>
                  <span className="font-medium">{modules.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lessons</span>
                  <span className="font-medium">{totalLessons}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Quizzes</span>
                  <span className="font-medium">{totalQuizzes}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Duration</span>
                  <span className="font-medium">{Math.floor(totalDuration / 3600)}h {Math.floor((totalDuration % 3600) / 60)}m</span>
                </div>
              </div>
            </div>

            {/* Preview Note */}
            <div className="gradient-card border border-blue-500/50 rounded-xl p-6 bg-blue-500/10">
              <h3 className="font-semibold mb-2 text-blue-400">Preview Mode</h3>
              <p className="text-sm text-muted-foreground">
                This is how your course will appear to students. Save your changes to publish the course.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};