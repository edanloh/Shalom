import React from "react";
import {
  Save,
  BarChart3,
  Clock,
  Users,
  BookOpen,
  Eye,
  Globe,
  Archive,
} from "lucide-react";
import { useCourseBuilder } from "./CourseBuilderContext";
import { Colors } from "../../constants/Colors";

export const RightSidebar = () => {
  const {
    rightSidebarWidth,
    setRightSidebarWidth,
    isResizing,
    setIsResizing,
    modules,
    courseName,
    setCourseName,
    courseDescription,
    setCourseDescription,
    courseStatus,
    setCourseStatus,
    setHasUnsavedChanges,
  } = useCourseBuilder();

  const handleMouseDown = () => {
    setIsResizing("right");
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isResizing === "right") {
      const newWidth =
        ((window.innerWidth - e.clientX) / window.innerWidth) * 100;
      if (newWidth >= 15 && newWidth <= 50) {
        setRightSidebarWidth(newWidth);
      }
    }
  };

  const handleMouseUp = () => {
    setIsResizing(null);
  };

  // Add event listeners
  React.useEffect(() => {
    if (isResizing === "right") {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isResizing]);

  // Calculate statistics
  const totalLessons = modules.reduce((sum, m) => sum + m.lessons.length, 0);
  const totalQuizzes = modules.reduce((sum, m) => sum + m.quizzes.length, 0);
  const totalPoints = modules.reduce(
    (sum, m) =>
      sum +
      m.quizzes.reduce(
        (quizSum, q) =>
          quizSum +
          q.questions.reduce((pointSum, qu) => pointSum + qu.points, 0),
        0
      ),
    0
  );

  return (
    <div
      style={{ 
        backgroundColor: Colors.backgroundGray,
        borderLeft: `1px solid ${Colors.gray800}`,
        width: `${rightSidebarWidth}%`
      }}
      className="flex flex-col relative"
    >
      {/* Resize Handle */}
      <div
        style={{ 
          backgroundColor: Colors.gray500
        }}
        className="absolute top-0 left-0 w-1 h-full cursor-col-resize transition-colors hover:opacity-80"
        onMouseDown={handleMouseDown}
      />
      {/* Content */}
      <div className="flex-1 p-4 space-y-5 overflow-y-auto">
        {/* Header */}
        <div 
          style={{ borderBottom: `1px solid ${Colors.gray800}` }}
          className="p-2"
        >
          <h3 
            style={{ color: Colors.textPrimary }}
            className="text-lg font-semibold mb-2"
          >
            Course Info
          </h3>
        </div>
        {/* Course Name */}
        <div>
          <label 
            style={{ color: Colors.textSecondary }}
            className="block text-sm font-medium mb-2"
          >
            Course Title
          </label>
          <input
            type="text"
            value={courseName}
            onChange={(e) => {
              setCourseName(e.target.value);
              setHasUnsavedChanges(true);
            }}
            style={{ 
              backgroundColor: Colors.textInputBg,
              borderColor: Colors.gray600,
              color: Colors.textPrimary
            }}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:border-opacity-80"
            placeholder="Enter course title"
          />
        </div>

        {/* Course Description */}
        <div>
          <label 
            style={{ color: Colors.textSecondary }}
            className="block text-sm font-medium mb-2"
          >
            Course Description
          </label>
          <textarea
            rows={4}
            value={courseDescription}
            onChange={(e) => {
              setCourseDescription(e.target.value);
              setHasUnsavedChanges(true);
            }}
            style={{ 
              backgroundColor: Colors.textInputBg,
              borderColor: Colors.gray600,
              color: Colors.textPrimary
            }}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:border-opacity-80 resize-none"
            placeholder="Enter course description..."
          />
        </div>

        {/* Course Status */}
        <div>
          <label 
            style={{ color: Colors.textSecondary }}
            className="block text-sm font-medium mb-2"
          >
            Publication Status
          </label>
          <div className="space-y-3">
            <select
              value={courseStatus}
              onChange={(e) => {
                setCourseStatus(e.target.value);
                setHasUnsavedChanges(true);
              }}
              style={{ 
                backgroundColor: Colors.textInputBg,
                borderColor: Colors.gray600,
                color: Colors.textPrimary
              }}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:border-opacity-80"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>

            <div className="flex items-center gap-2 text-sm">
              {courseStatus === "draft" && (
                <>
                  <Clock className="h-4 w-4" style={{ color: Colors.yellow }} />
                  <span style={{ color: Colors.yellow }}>In Development</span>
                </>
              )}
              {courseStatus === "published" && (
                <>
                  <Globe className="h-4 w-4" style={{ color: Colors.green }} />
                  <span style={{ color: Colors.green }}>Live & Available</span>
                </>
              )}
              {courseStatus === "archived" && (
                <>
                  <Archive className="h-4 w-4" style={{ color: Colors.gray500 }} />
                  <span style={{ color: Colors.gray500 }}>Archived</span>
                </>
              )}
            </div>

            <p style={{ color: Colors.textMuted }} className="text-xs">
              {courseStatus === "draft" &&
                "Course is in development and not visible to students"}
              {courseStatus === "published" &&
                "Course is live and available to students"}
              {courseStatus === "archived" &&
                "Course is archived and no longer available"}
            </p>
          </div>
        </div>

        {/* Course Statistics */}
        <div>
          <label 
            style={{ color: Colors.textSecondary }}
            className="block text-sm font-medium mb-3"
          >
            Course Statistics
          </label>
          <div className="space-y-3">
            <div 
              style={{ backgroundColor: Colors.textInputBg }}
              className="flex items-center justify-between p-3 rounded"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" style={{ color: Colors.secondary }} />
                <span style={{ color: Colors.textSecondary }} className="text-sm">Modules</span>
              </div>
              <span style={{ color: Colors.textPrimary }} className="text-lg font-semibold">
                {modules.length}
              </span>
            </div>

            <div 
              style={{ backgroundColor: Colors.textInputBg }}
              className="flex items-center justify-between p-3 rounded"
            >
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" style={{ color: Colors.green }} />
                <span style={{ color: Colors.textSecondary }} className="text-sm">Lessons</span>
              </div>
              <span style={{ color: Colors.textPrimary }} className="text-lg font-semibold">
                {totalLessons}
              </span>
            </div>

            <div 
              style={{ backgroundColor: Colors.textInputBg }}
              className="flex items-center justify-between p-3 rounded"
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" style={{ color: Colors.accent }} />
                <span style={{ color: Colors.textSecondary }} className="text-sm">Quizzes</span>
              </div>
              <span style={{ color: Colors.textPrimary }} className="text-lg font-semibold">
                {totalQuizzes}
              </span>
            </div>

            <div 
              style={{ backgroundColor: Colors.textInputBg }}
              className="flex items-center justify-between p-3 rounded"
            >
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" style={{ color: Colors.yellow }} />
                <span style={{ color: Colors.textSecondary }} className="text-sm">Total Points</span>
              </div>
              <span style={{ color: Colors.textPrimary }} className="text-lg font-semibold">
                {totalPoints}
              </span>
            </div>
          </div>
        </div>

        {/* Course Actions */}
        {/* <div>
          <label className="block text-sm font-medium text-slate-300 mb-3">
            Actions
          </label>
          <div className="space-y-2">
            <button className="w-full flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
              <Save className="h-4 w-4" />
              Save Course
            </button>
            
            <button className="w-full flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
              <Eye className="h-4 w-4" />
              Preview Course
            </button>
            
            {courseStatus === "draft" && (
              <button 
                onClick={() => setCourseStatus("published")}
                className="w-full flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                <Globe className="h-4 w-4" />
                Publish Course
              </button>
            )}
          </div>
        </div> */}
      </div>
    </div>
  );
};
