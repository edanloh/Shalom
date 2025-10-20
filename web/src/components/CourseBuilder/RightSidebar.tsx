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

export const RightSidebar = () => {
  const {
    rightSidebarWidth,
    setRightSidebarWidth,
    isResizing,
    setIsResizing,
    modules,
    courseName,
    setCourseName,
    courseStatus,
    setCourseStatus,
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
      className="bg-slate-800 border-l border-slate-700 flex flex-col relative"
      style={{ width: `${rightSidebarWidth}%` }}
    >
      {/* Resize Handle */}
      <div
        className="absolute top-0 left-0 w-1 h-full bg-slate-600 hover:bg-blue-500 cursor-col-resize transition-colors"
        onMouseDown={handleMouseDown}
      />
      {/* Content */}
      <div className="flex-1 p-4 space-y-5 overflow-y-auto">
        {/* Header */}
        <div className="p-2 border-b border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-2">Course Info</h3>
        </div>
        {/* Course Name */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Course Title
          </label>
          <input
            type="text"
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            placeholder="Enter course title"
          />
        </div>

        {/* Course Description */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Course Description
          </label>
          <textarea
            rows={4}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 resize-none"
            placeholder="Enter course description..."
          />
        </div>

        {/* Course Status */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Publication Status
          </label>
          <div className="space-y-3">
            <select
              value={courseStatus}
              onChange={(e) => setCourseStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>

            <div className="flex items-center gap-2 text-sm">
              {courseStatus === "draft" && (
                <>
                  <Clock className="h-4 w-4 text-yellow-400" />
                  <span className="text-yellow-400">In Development</span>
                </>
              )}
              {courseStatus === "published" && (
                <>
                  <Globe className="h-4 w-4 text-green-400" />
                  <span className="text-green-400">Live & Available</span>
                </>
              )}
              {courseStatus === "archived" && (
                <>
                  <Archive className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-400">Archived</span>
                </>
              )}
            </div>

            <p className="text-xs text-slate-400">
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
          <label className="block text-sm font-medium text-slate-300 mb-3">
            Course Statistics
          </label>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-700 rounded">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-blue-400" />
                <span className="text-sm text-slate-300">Modules</span>
              </div>
              <span className="text-lg font-semibold text-white">
                {modules.length}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-700 rounded">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-green-400" />
                <span className="text-sm text-slate-300">Lessons</span>
              </div>
              <span className="text-lg font-semibold text-white">
                {totalLessons}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-700 rounded">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-purple-400" />
                <span className="text-sm text-slate-300">Quizzes</span>
              </div>
              <span className="text-lg font-semibold text-white">
                {totalQuizzes}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-700 rounded">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-400" />
                <span className="text-sm text-slate-300">Total Points</span>
              </div>
              <span className="text-lg font-semibold text-white">
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
