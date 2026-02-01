import React from "react";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  GripVertical,
  Plus,
  Trash2,
  Video,
  ClipboardCheck
} from "lucide-react";
import { useCourseBuilder } from "./CourseBuilderContext";
import { useDragAndDrop } from "./useDragAndDrop";
import { useContentManagement } from "./useContentManagement";
import { Button } from "../ui/button";

export const LeftSidebar = () => {
  const {
    modules,
    selectedItem,
    setSelectedItem,
    sidebarWidth,
    setSidebarWidth,
    isResizing,
    setIsResizing,
    toggleModuleExpansion,
  } = useCourseBuilder();

  const {
    draggedItem,
    draggedOver,
    handleDragStart,
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
  } = useDragAndDrop();

  const {
    addModule,
    deleteModule,
    addLesson,
    deleteLesson,
    addQuiz,
    deleteQuiz,
  } = useContentManagement();

  const handleMouseDown = () => {
    setIsResizing("left");
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isResizing === "left") {
      const newWidth = (e.clientX / window.innerWidth) * 100;
      if (newWidth >= 15 && newWidth <= 50) {
        setSidebarWidth(newWidth);
      }
    }
  };

  const handleMouseUp = () => {
    setIsResizing(null);
  };

  React.useEffect(() => {
    if (isResizing === "left") {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isResizing]);

  return (
    <div
      className="bg-slate-800 border-r border-slate-700 flex flex-col relative overflow-hidden px-3"
      style={{ width: `${sidebarWidth}%` }}
    >
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Course Content</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        <Button onClick={addModule} className="w-full gap-2 mt-2 mb-2">
          <Plus className="h-4 w-4" />
          Add New Module
        </Button>
        {modules.map((module) => (
          <ModuleItem
            key={module.id}
            module={module}
            selectedItem={selectedItem}
            setSelectedItem={setSelectedItem}
            draggedItem={draggedItem}
            draggedOver={draggedOver}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            onToggleExpansion={toggleModuleExpansion}
            onDeleteModule={deleteModule}
            onAddLesson={addLesson}
            onDeleteLesson={deleteLesson}
            onAddQuiz={addQuiz}
            onDeleteQuiz={deleteQuiz}
          />
        ))}
      </div>

      <div
        className="absolute top-0 right-0 w-1 h-full bg-slate-600 hover:bg-blue-500 cursor-col-resize transition-colors"
        onMouseDown={handleMouseDown}
      />
    </div>
  );
};

interface ModuleItemProps {
  module: any;
  selectedItem: any;
  setSelectedItem: (item: any) => void;
  draggedItem: any;
  draggedOver: any;
  onDragStart: (e: React.DragEvent, item: any) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnter: (e: React.DragEvent, item: any) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, item: any) => void;
  onDragEnd: () => void;
  onToggleExpansion: (moduleId: string) => void;
  onDeleteModule: (moduleId: string) => void;
  onAddLesson: (moduleId: string, lessonType?: 'video' | 'pdf') => void;
  onDeleteLesson: (moduleId: string, lessonId: string) => void;
  onAddQuiz: (moduleId: string) => void;
  onDeleteQuiz: (moduleId: string, quizId: string) => void;
}

const ModuleItem = ({
  module,
  selectedItem,
  setSelectedItem,
  draggedItem,
  draggedOver,
  onDragStart,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
  onDragEnd,
  onToggleExpansion,
  onDeleteModule,
  onAddLesson,
  onDeleteLesson,
  onAddQuiz,
  onDeleteQuiz,
}: ModuleItemProps) => {
  const isSelected = selectedItem?.type === "module" && selectedItem?.id === module.id;
  const isDragging = draggedItem?.id === module.id;
  const isDraggedOver = draggedOver?.type === "module" && draggedOver?.id === module.id;

  return (
    <div
      key={module.id}
      className={`drag-item bg-slate-700 rounded-lg border border-slate-600 overflow-hidden transition-all ${
        isDraggedOver ? "drag-over border-blue-400 bg-slate-600" : ""
      } ${isDragging ? "dragging opacity-50" : ""} ${
        isSelected
          ? "border-blue-500 ring-1 ring-blue-500"
          : "hover:border-slate-500"
      }`}
      draggable
      onDragStart={(e) => {
        onDragStart(e, { type: "module", id: module.id, data: module });
        e.dataTransfer.effectAllowed = "move";
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        onDragOver(e);
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDragEnter(e, { type: "module", id: module.id });
      }}
      onDragLeave={(e) => {
        e.stopPropagation();
        onDragLeave(e);
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDrop(e, { type: "module", id: module.id });
      }}
      onDragEnd={(e) => {
        e.preventDefault();
        onDragEnd();
      }}
    >
      <div
        className="flex items-center gap-2 p-3 hover:bg-slate-600 cursor-pointer group transition-colors"
        onClick={() => setSelectedItem({ type: "module", id: module.id })}
      >
        <GripVertical
          className={`h-4 w-4 text-slate-400 transition-all duration-200 ${
            draggedItem
              ? "opacity-100 text-blue-400"
              : "opacity-0 group-hover:opacity-100"
          } cursor-grab active:cursor-grabbing`}
        />
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpansion(module.id);
          }}
          className="text-slate-300 hover:text-white transition-colors"
        >
          {module.expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
        <span className="flex-1 text-sm font-medium text-white truncate">
          {module.title}
        </span>
        <div
          onClick={(e) => e.stopPropagation()}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <button
            onClick={() => onDeleteModule(module.id)}
            className="p-1 hover:bg-red-600/20 rounded text-red-400 hover:text-red-300 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {module.expanded && (
        <div
          className={`bg-slate-750 border-t border-slate-600 pl-6 pr-2 py-2 space-y-1 max-h-72 overflow-y-auto transition-all duration-300 ${
            (draggedItem?.type === "lesson" || draggedItem?.type === "quiz") &&
            draggedOver?.type === "module" &&
            draggedOver?.id === module.id
              ? "drag-placeholder bg-blue-900/20 border-blue-400"
              : ""
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            onDragOver(e);
          }}
          onDragEnter={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDragEnter(e, { type: "module", id: module.id });
          }}
          onDragLeave={(e) => {
            e.stopPropagation();
            onDragLeave(e);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDrop(e, { type: "module", id: module.id });
          }}
        >
          {module.lessons.length === 0 && module.quizzes.length === 0 && (
            <p className="text-slate-500 text-xs italic py-2 text-center">
              Drop lessons and quizzes here
            </p>
          )}

          {/* Unified content display - merge lessons and quizzes by order */}
          {(() => {
            // Combine lessons and quizzes with type info
            const allContent = [
              ...module.lessons.map((lesson: any) => ({ ...lesson, itemType: 'lesson' })),
              ...module.quizzes.map((quiz: any) => ({ ...quiz, itemType: 'quiz' }))
            ];
            
            // Sort by order field, fallback to original separate ordering
            allContent.sort((a, b) => {
              if (a.order !== undefined && b.order !== undefined) {
                return a.order - b.order;
              }
              // Fallback: lessons first, then quizzes (preserve original behavior)
              if (a.itemType !== b.itemType) {
                return a.itemType === 'lesson' ? -1 : 1;
              }
              return 0;
            });

            return allContent.map((item: any) => {
              if (item.itemType === 'lesson') {
                return (
                  <LessonItem
                    key={item.id}
                    lesson={item}
                    moduleId={module.id}
                    selectedItem={selectedItem}
                    setSelectedItem={setSelectedItem}
                    draggedItem={draggedItem}
                    draggedOver={draggedOver}
                    onDragStart={onDragStart}
                    onDragOver={onDragOver}
                    onDragEnter={onDragEnter}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    onDragEnd={onDragEnd}
                    onDeleteLesson={onDeleteLesson}
                  />
                );
              } else {
                return (
                  <QuizItem
                    key={item.id}
                    quiz={item}
                    moduleId={module.id}
                    selectedItem={selectedItem}
                    setSelectedItem={setSelectedItem}
                    draggedItem={draggedItem}
                    draggedOver={draggedOver}
                    onDragStart={onDragStart}
                    onDragOver={onDragOver}
                    onDragEnter={onDragEnter}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    onDragEnd={onDragEnd}
                    onDeleteQuiz={onDeleteQuiz}
                  />
                );
              }
            });
          })()}

          {/* Keep the add buttons at the bottom */}

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => {
                setSelectedItem({ type: "module", id: module.id });
                onAddLesson(module.id, "video");
              }}
              className="flex-1 px-3 py-2 bg-slate-600 hover:bg-slate-500 text-slate-300 hover:text-white text-xs rounded transition-colors"
            >
              + Video
            </button>
            <button
              onClick={() => {
                setSelectedItem({ type: "module", id: module.id });
                onAddLesson(module.id, "pdf");
              }}
              className="flex-1 px-3 py-2 bg-slate-600 hover:bg-slate-500 text-slate-300 hover:text-white text-xs rounded transition-colors"
            >
              + Document
            </button>
            <button
              onClick={() => {
                setSelectedItem({ type: "module", id: module.id });
                onAddQuiz(module.id);
              }}
              className="flex-1 px-3 py-2 bg-slate-600 hover:bg-slate-500 text-slate-300 hover:text-white text-xs rounded transition-colors"
            >
              + Quiz
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

interface LessonItemProps {
  lesson: any;
  moduleId: string;
  selectedItem: any;
  setSelectedItem: (item: any) => void;
  draggedItem: any;
  draggedOver: any;
  onDragStart: (e: React.DragEvent, item: any) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnter: (e: React.DragEvent, item: any) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, item: any) => void;
  onDragEnd: () => void;
  onDeleteLesson: (moduleId: string, lessonId: string) => void;
}

const LessonItem = ({
  lesson,
  moduleId,
  selectedItem,
  setSelectedItem,
  draggedItem,
  draggedOver,
  onDragStart,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
  onDragEnd,
  onDeleteLesson,
}: LessonItemProps) => {
  const isSelected = selectedItem?.type === "lesson" && selectedItem?.id === lesson.id;
  const isDragging = draggedItem?.id === lesson.id;
  const isDraggedOver = draggedOver?.type === "lesson" && draggedOver?.id === lesson.id;

  return (
    <div
      className={`drag-item flex items-center gap-2 p-2 hover:bg-slate-600 rounded cursor-pointer group text-slate-300 text-sm transition-all duration-200 ${
        isDraggedOver ? "drag-over bg-slate-500 border border-blue-400" : ""
      } ${isDragging ? "dragging opacity-50" : ""} ${
        isSelected ? "bg-slate-600 border border-blue-500" : ""
      }`}
      onClick={() => {
        setSelectedItem({ type: "lesson", id: lesson.id });
      }}
      draggable
      onDragStart={(e) => {
        e.stopPropagation();
        onDragStart(e, { type: "lesson", id: lesson.id, data: lesson, moduleId });
        e.dataTransfer.effectAllowed = "move";
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = "move";
        onDragOver(e);
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDragEnter(e, { type: "lesson", id: lesson.id });
      }}
      onDragLeave={(e) => {
        e.stopPropagation();
        onDragLeave(e);
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDrop(e, { type: "lesson", id: lesson.id, moduleId });
      }}
      onDragEnd={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDragEnd();
      }}
    >
      <GripVertical
        className={`h-3 w-3 text-slate-500 transition-all duration-200 ${
          draggedItem
            ? "opacity-100 text-blue-400"
            : "opacity-0 group-hover:opacity-100"
        } cursor-grab active:cursor-grabbing`}
      />
      {lesson.type === 'pdf' ? (
        <FileText className="h-4 w-4 mr-2" />
      ) : (
        <Video className="h-4 w-4 mr-2" />
      )}
      <span className="flex-1 truncate">{lesson.title}</span>
      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDeleteLesson(moduleId, lesson.id);
          }}
          className="p-1 hover:bg-red-600/20 rounded transition-all"
        >
          <Trash2 className="h-3 w-3 text-red-400" />
        </button>
      </div>
    </div>
  );
};

interface QuizItemProps {
  quiz: any;
  moduleId: string;
  selectedItem: any;
  setSelectedItem: (item: any) => void;
  draggedItem: any;
  draggedOver: any;
  onDragStart: (e: React.DragEvent, item: any) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnter: (e: React.DragEvent, item: any) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, item: any) => void;
  onDragEnd: () => void;
  onDeleteQuiz: (moduleId: string, quizId: string) => void;
}

const QuizItem = ({
  quiz,
  moduleId,
  selectedItem,
  setSelectedItem,
  draggedItem,
  draggedOver,
  onDragStart,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
  onDragEnd,
  onDeleteQuiz,
}: QuizItemProps) => {
  const isSelected = selectedItem?.type === "quiz" && selectedItem?.id === quiz.id;
  const isDragging = draggedItem?.id === quiz.id;
  const isDraggedOver = draggedOver?.type === "quiz" && draggedOver?.id === quiz.id;

  return (
    <div
      className={`drag-item flex items-center gap-2 p-2 hover:bg-slate-600 rounded cursor-pointer group text-slate-300 text-sm transition-all duration-200 ${
        isDraggedOver ? "drag-over bg-slate-500 border border-blue-400" : ""
      } ${isDragging ? "dragging opacity-50" : ""} ${
        isSelected ? "bg-slate-600 border border-blue-500" : ""
      }`}
      onClick={() => {
        setSelectedItem({ type: "quiz", id: quiz.id });
      }}
      draggable
      onDragStart={(e) => {
        e.stopPropagation();
        onDragStart(e, { type: "quiz", id: quiz.id, data: quiz, moduleId });
        e.dataTransfer.effectAllowed = "move";
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = "move";
        onDragOver(e);
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDragEnter(e, { type: "quiz", id: quiz.id });
      }}
      onDragLeave={(e) => {
        e.stopPropagation();
        onDragLeave(e);
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDrop(e, { type: "quiz", id: quiz.id, moduleId });
      }}
      onDragEnd={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDragEnd();
      }}
    >
      <GripVertical
        className={`h-3 w-3 text-slate-500 transition-all duration-200 ${
          draggedItem
            ? "opacity-100 text-blue-400"
            : "opacity-0 group-hover:opacity-100"
        } cursor-grab active:cursor-grabbing`}
      />
      <ClipboardCheck className="h-4 w-4 mr-2" />
      <span className="flex-1 truncate">{quiz.title}</span>
      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDeleteQuiz(moduleId, quiz.id);
          }}
          className="p-1 hover:bg-red-600/20 rounded transition-all"
        >
          <Trash2 className="h-3 w-3 text-red-400" />
        </button>
      </div>
    </div>
  );
};
