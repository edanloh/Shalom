import React, { useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Video,
  FileText,
  Users,
  Star,
  Award,
  Clock,
  MessageSquare,
  Eye,
  UserPlus,
} from "lucide-react";
import { useCourseBuilder } from "./useCourseBuilder";
import { Badge } from "../ui/badge";
import { DEFAULT_COURSE_THUMBNAIL } from "@/constants/images";
import { Progress } from "../ui/progress";
import { Button } from "../ui/button";
import { Colors } from "@/constants/Colors";

// Import the course thumbnail cache from RightSidebar
const getCourseThumbnailFile = (): File | null => {
  try {
    return (window as any).__courseThumbnailFile || null;
  } catch {
    return null;
  }
};

export const CoursePreview = () => {
  const {
    courseName,
    courseDescription,
    courseThumbnailUrl,
    setPreviewMode,
    modules,
    courseCategory,
    localCategories,
    courseOutcomes,
  } = useCourseBuilder();

  const [expandedModules, setExpandedModules] = useState<string[]>([]);
  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) =>
      prev.includes(moduleId)
        ? prev.filter((id) => id !== moduleId)
        : [...prev, moduleId],
    );
  };

  const getCategoryName = () => {
    if (!courseCategory) return "General";

    const category = localCategories.find((cat) => cat.id === courseCategory);
    return category ? category.name : "General";
  };

  const getCategoryColor = () => {
    if (!courseCategory) return Colors.categoryDefault;
    const category = localCategories.find((cat) => cat.id === courseCategory);
    return category?.color || Colors.categoryDefault;
  };

  // Calculate course statistics
  const totalLessons = modules.reduce((sum, m) => sum + m.lessons.length, 0);
  const totalQuizzes = modules.reduce((sum, m) => sum + m.quizzes.length, 0);
  const totalDuration = modules.reduce((sum, m) => {
    const lessonDuration = m.lessons.reduce(
      (lSum, l) => lSum + (l.durationSeconds || 0),
      0,
    );
    return sum + lessonDuration;
  }, 0);

  // Get course thumbnail
  const displayThumbnail = (() => {
    if (courseThumbnailUrl && courseThumbnailUrl.trim() !== "") {
      if (courseThumbnailUrl.startsWith("[LOCAL_FILE:")) {
        const localFile = getCourseThumbnailFile();
        if (localFile) {
          return URL.createObjectURL(localFile);
        }
      } else {
        return courseThumbnailUrl;
      }
    }

    for (const module of modules) {
      for (const lesson of module.lessons) {
        if (
          lesson.thumbnailUrl &&
          lesson.thumbnailUrl.trim() !== "" &&
          !lesson.thumbnailUrl.startsWith("[LOCAL_FILE:")
        ) {
          return lesson.thumbnailUrl;
        }
      }
    }

    return DEFAULT_COURSE_THUMBNAIL;
  })();

  // Format module items for display
  const modulesList = modules.map((module) => {
    const items: Array<{
      id: string;
      type: "lesson" | "video" | "quiz" | "document" | "pdf" | "ppt";
      title: string;
      duration?: string;
      questions?: number;
      fileSize?: string;
    }> = [];

    // Build items array based on order values if they exist
    const allContent = [
      ...module.lessons.map((lesson: any, index: number) => ({
        ...lesson,
        itemType: "lesson" as const,
        arrayIndex: index,
      })),
      ...module.quizzes.map((quiz: any, index: number) => ({
        ...quiz,
        itemType: "quiz" as const,
        arrayIndex: index,
      })),
    ];

    // Sort by order if all items have it, otherwise keep original array order
    const hasOrderValues = allContent.some((item) => item.order !== undefined);

    if (hasOrderValues) {
      // Sort by order field
      allContent.sort((a, b) => {
        const orderA = a.order ?? 999;
        const orderB = b.order ?? 999;
        return orderA - orderB;
      });
    }

    // Map to UI format
    allContent.forEach((item: any) => {
      if (item.itemType === "lesson") {
        const lessonType = (item.type || "lesson").toString().toLowerCase();
        const isDocument = ["document", "pdf", "ppt", "pptx", "docx", "slides"].includes(lessonType);
        const normalizedType =
          lessonType === "pptx" || lessonType === "slides"
            ? "ppt"
            : lessonType === "docx"
              ? "document"
              : lessonType === "video" || lessonType === "document" || lessonType === "pdf" || lessonType === "ppt"
                ? lessonType
                : "lesson";
        items.push({
          id: item.id,
          type: normalizedType,
          title: item.title.replace(/^Lesson\s+\d+(\.\d+)?\s*[-:]?\s*/i, ''),
          duration:
            !isDocument && (normalizedType === "lesson" || normalizedType === "video")
              ? `${Math.floor((item.durationSeconds || 0) / 60)} min`
              : undefined,
          fileSize:
            isDocument
              ? item.fileSize ||
                (item.file_size_bytes
                  ? `${(item.file_size_bytes / (1024 * 1024)).toFixed(1)} MB`
                  : undefined)
              : undefined,
        });
      } else {
        items.push({
          id: item.id,
          type: "quiz",
          title: item.title.replace(/^Quiz\s+\d+(\.\d+)?\s*[-:]?\s*/i, ''),
          questions: item.questions?.length || 0,
        });
      }
    });

    return {
      id: module.id,
      title: module.title,
      lessons: module.lessons.length,
      quizzes: module.quizzes.length,
      duration: `${Math.floor(module.lessons.reduce((sum, l) => sum + (l.durationSeconds || 0), 0) / 60)} min`,
      isCompleted: false,
      completedAt: null,
      items: items,
    };
  });

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
            <h1 className="text-2xl font-bold text-white">
              {courseName || "Untitled Course"}
            </h1>
            <p className="text-sm text-slate-400">Course Preview</p>
          </div>
        </div>
        <Badge
          variant="outline"
          className="gap-2 px-4 py-2 bg-slate-700 text-white border-slate-600"
        >
          <Eye className="h-4 w-4" />
          Preview Mode
        </Badge>
      </div>

      <main className="container mx-auto px-6 py-8">
        {/* Course Header */}
        <div className="gradient-card border border-border rounded-xl p-8 mb-6">
          <div className="flex gap-8">
            <img
              src={displayThumbnail}
              alt={courseName}
              className="w-64 h-48 object-cover rounded-lg"
              onError={(e) => {
                e.currentTarget.src = DEFAULT_COURSE_THUMBNAIL;
              }}
            />
            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-[32px] font-bold pr-2">
                    {courseName || "Untitled Course"}
                  </h1>
                  <p className="text-muted-foreground mt-1 mb-2">
                    by Shalom Instructor
                  </p>
                  <Badge
                    className="my-2 py-2 px-3"
                    style={{
                      backgroundColor: getCategoryColor(),
                    }}
                  >
                    <div
                      className="h-3 rounded-full"
                      style={{
                        backgroundColor: getCategoryColor(),
                        width: "fit-content",
                      }}
                    />
                    {getCategoryName()}
                  </Badge>
                </div>
                <Badge className="status-badge-draft py-2 px-3">DRAFT</Badge>
              </div>

              <p className="text-foreground mb-6">
                {courseDescription || "No description provided"}
              </p>

              {courseOutcomes.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                    Course Outcomes
                  </h3>
                  <ul className="grid gap-2">
                    {courseOutcomes.map((outcome, index) => (
                      <li
                        key={`${outcome}-${index}`}
                        className="flex items-start gap-2 text-sm text-foreground"
                      >
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
                        <span>{outcome}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <div>
                    <div className="text-2xl font-bold">-</div>
                    <div className="text-xs text-muted-foreground">
                      Students
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-warning" />
                  <div>
                    <div className="text-2xl font-bold">-</div>
                    <div className="text-xs text-muted-foreground">Ratings</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-success" />
                  <div>
                    <div className="text-2xl font-bold">-</div>
                    <div className="text-xs text-muted-foreground">
                      Completion
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-accent" />
                  <div>
                    <div className="text-2xl font-bold">
                      -{/* {Math.floor(totalDuration / 3600)}h */}
                    </div>
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
                  {modules.length} modules • {totalLessons} lessons •{" "}
                  {totalQuizzes} quizzes
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
                            <span className="font-semibold">
                              {module.title}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
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
                            className="flex items-center justify-between p-3 rounded hover:bg-muted/10"
                          >
                            <div className="flex items-center gap-3">
                              {item.type === "lesson" || item.type === "video" ? (
                                <Video className="h-4 w-4 text-accent" />
                              ) : item.type === "document" || item.type === "pdf" || item.type === "ppt" ? (
                                <FileText className="h-4 w-4 text-primary" />
                              ) : (
                                <MessageSquare className="h-4 w-4 text-warning" />
                              )}
                              <div className="flex flex-col gap-1">
                                <span className="text-sm">{item.title}</span>
                                {(item.type === "pdf" || item.type === "document" || item.type === "ppt") && (
                                  <span className="text-xs text-muted-foreground uppercase">
                                    {item.type === "pdf" ? "PDF" : item.type === "document" ? "DOCX" : "PPTX"}
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {item.type === "lesson" || item.type === "video"
                                ? item.duration
                                : item.type === "pdf" || item.type === "document" || item.type === "ppt"
                                  ? item.fileSize || "Document"
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
                <h2 className="text-2xl font-bold">Course Review</h2>
              </div>

              <div className="text-center py-12">
                <MessageSquare className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">No reviews yet</p>
                <p className="text-sm text-muted-foreground">
                  Students will be able to leave reviews once they complete the
                  course.
                </p>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Actions */}
            {/* Preview Note */}{" "}
            <div className="gradient-card border border-blue-500/50 rounded-xl p-6 bg-blue-500/10">
              <h3 className="font-semibold mb-2 text-blue-400">Preview Mode</h3>
              <p className="text-sm text-muted-foreground">
                This is how your course will appear to students. Save your
                changes to publish the course.
              </p>
            </div>
            <div className="gradient-card border border-border rounded-xl p-6">
              <h3 className="font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <Button className="w-full gap-2" disabled>
                  <UserPlus className="h-4 w-4" />
                  Enroll Students
                </Button>
                <Button variant="outline" className="w-full" disabled>
                  View Enrolled Students
                </Button>
              </div>
            </div>
            {/* Enrolled Students Preview */}
            {/* <div className="gradient-card border border-border rounded-xl p-6">
              <h3 className="font-semibold mb-4">Recently Active Students</h3>
              <div className="space-y-3">
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No students enrolled yet
                  </p>
                </div>
              </div>
            </div> */}
            {/* Course Stats */}
            {/* <div className="gradient-card border border-border rounded-xl p-6">
              <h3 className="font-semibold mb-4">Course Statistics</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span className="font-medium">N/A</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Updated</span>
                  <span className="font-medium">N/A</span>
                </div>
              </div>
            </div> */}
          </div>
        </div>
      </main>
    </div>
  );
};
