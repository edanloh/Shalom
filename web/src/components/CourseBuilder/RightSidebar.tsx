import React, { useState } from "react";
import {
  Save,
  BarChart3,
  Clock,
  Users,
  BookOpen,
  Eye,
  Globe,
  Archive,
  X,
} from "lucide-react";
import { useCourseBuilder } from "./CourseBuilderContext";
import { Colors } from "../../constants/Colors";

// Module-level cache for course thumbnail file
const courseThumbnailFileCache: { file: File | null } = { file: null };

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
    courseThumbnailUrl,
    setCourseThumbnailUrl,
    courseStatus,
    setCourseStatus,
    setHasUnsavedChanges,
  } = useCourseBuilder();

  const [thumbnailInputType, setThumbnailInputType] = useState<'url' | 'upload'>('url');
  const [selectedThumbnailFile, setSelectedThumbnailFile] = useState<File | null>(null);

  // Restore state from cache on mount
  React.useEffect(() => {
    if (courseThumbnailUrl?.startsWith('[LOCAL_FILE:')) {
      // Restore from cache
      const cachedFile = courseThumbnailFileCache.file || (window as any).__courseThumbnailFile;
      if (cachedFile) {
        setSelectedThumbnailFile(cachedFile);
        setThumbnailInputType('upload');
      }
    } else if (courseThumbnailUrl && courseThumbnailUrl.trim() !== '') {
      // It's a URL
      setThumbnailInputType('url');
    }
  }, [courseThumbnailUrl]);

  const handleThumbnailFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedThumbnailFile(file);
      courseThumbnailFileCache.file = file;
      (window as any).__courseThumbnailFile = file;
      setCourseThumbnailUrl(`[LOCAL_FILE: ${file.name}]`);
      setHasUnsavedChanges(true);
    }
  };

  const clearThumbnail = () => {
    setSelectedThumbnailFile(null);
    courseThumbnailFileCache.file = null;
    (window as any).__courseThumbnailFile = null;
    setCourseThumbnailUrl('');
    setHasUnsavedChanges(true);
  };

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
          <textarea
            rows={2}
            value={courseName}
            onChange={(e) => {
              setCourseName(e.target.value);
              setHasUnsavedChanges(true);
            }}
            style={{ 
              backgroundColor: Colors.textInputBg,
              borderColor: Colors.gray600,
              color: Colors.textPrimary,
              wordWrap: 'break-word',
              overflowWrap: 'break-word'
            }}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:border-opacity-80 resize-y"
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
              color: Colors.textPrimary,
              wordWrap: 'break-word',
              overflowWrap: 'break-word'
            }}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:border-opacity-80 resize-y"
            placeholder="Enter course description..."
          />
        </div>

        {/* Course Thumbnail */}
        <div>
          <label
            style={{ color: Colors.textSecondary }}
            className="block text-sm font-medium mb-2"
          >
            Course Thumbnail (optional)
          </label>
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => {
                setThumbnailInputType('url');
              }}
              disabled={thumbnailInputType === 'upload' && (!!selectedThumbnailFile || !!courseThumbnailUrl?.startsWith('[LOCAL_FILE:'))}
              style={{
                backgroundColor: thumbnailInputType === 'url' ? Colors.accent : Colors.gray800,
                color: Colors.textPrimary,
                opacity: (thumbnailInputType === 'upload' && (!!selectedThumbnailFile || !!courseThumbnailUrl?.startsWith('[LOCAL_FILE:'))) ? 0.5 : 1,
                cursor: (thumbnailInputType === 'upload' && (!!selectedThumbnailFile || !!courseThumbnailUrl?.startsWith('[LOCAL_FILE:'))) ? 'not-allowed' : 'pointer',
              }}
              className="px-3 py-1 rounded text-sm"
            >
              URL
            </button>
            <button
              onClick={() => {
                setThumbnailInputType('upload');
              }}
              disabled={thumbnailInputType === 'url' && !!courseThumbnailUrl && !courseThumbnailUrl.startsWith('[LOCAL_FILE:')}
              style={{
                backgroundColor: thumbnailInputType === 'upload' ? Colors.accent : Colors.gray800,
                color: Colors.textPrimary,
                opacity: (thumbnailInputType === 'url' && !!courseThumbnailUrl && !courseThumbnailUrl.startsWith('[LOCAL_FILE:')) ? 0.5 : 1,
                cursor: (thumbnailInputType === 'url' && !!courseThumbnailUrl && !courseThumbnailUrl.startsWith('[LOCAL_FILE:')) ? 'not-allowed' : 'pointer',
              }}
              className="px-3 py-1 rounded text-sm"
            >
              Upload File
            </button>
          </div>
          {thumbnailInputType === 'url' ? (
            <div>
              <input
                type="url"
                value={courseThumbnailUrl?.startsWith('[LOCAL_FILE:') ? '' : (courseThumbnailUrl || "")}
                onChange={(e) => {
                  setCourseThumbnailUrl(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                style={{
                  backgroundColor: Colors.textInputBg,
                  borderColor: Colors.gray600,
                  color: Colors.textPrimary,
                }}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:border-opacity-80"
                placeholder="https://..."
              />
              {courseThumbnailUrl && !courseThumbnailUrl.startsWith('[LOCAL_FILE:') && (
                <>
                  <div className="mt-2 px-2 py-1 rounded flex items-center justify-between" style={{ backgroundColor: Colors.gray800 }}>
                    <span style={{ color: Colors.textSecondary, fontSize: '13px' }}>
                      📎 Thumbnail URL added
                    </span>
                    <button
                      onClick={clearThumbnail}
                      style={{ color: Colors.textSecondary }}
                      className="ml-2 hover:text-red-500 hover:bg-red-900/20 p-1 rounded transition-colors"
                      title="Clear thumbnail"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-3">
                    <label
                      style={{ color: Colors.textSecondary }}
                      className="block text-sm font-medium mb-2"
                    >
                      Thumbnail Preview
                    </label>
                    <div
                      className="rounded overflow-hidden border"
                      style={{
                        borderColor: Colors.gray600,
                        maxWidth: '100%'
                      }}
                    >
                      <img
                        src={courseThumbnailUrl}
                        alt="Thumbnail preview"
                        style={{
                          width: '100%',
                          height: 'auto',
                          display: 'block'
                        }}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.parentElement!.innerHTML = '<p style="padding: 20px; text-align: center; color: #94a3b8;">Failed to load image</p>';
                        }}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div>
              <div>
                <input
                  key={`course-thumbnail`}
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailFileChange}
                  style={{
                    backgroundColor: Colors.textInputBg,
                    borderColor: Colors.gray600,
                    color: Colors.textPrimary,
                  }}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:border-opacity-80"
                />
                {(selectedThumbnailFile || courseThumbnailUrl?.startsWith('[LOCAL_FILE:')) && (
                  <div className="mt-2 px-2 py-1 rounded flex items-center justify-between" style={{ backgroundColor: Colors.gray800 }}>
                    <span style={{ color: Colors.textSecondary, fontSize: '13px' }}>
                      📎 {selectedThumbnailFile?.name || courseThumbnailUrl?.split('[LOCAL_FILE: ')[1]?.replace(']', '')}
                    </span>
                    <button
                      onClick={clearThumbnail}
                      style={{ color: Colors.textSecondary }}
                      className="ml-2 hover:text-red-500 hover:bg-red-900/20 p-1 rounded transition-colors"
                      title="Clear thumbnail"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
              {selectedThumbnailFile && (
                <div className="mt-3">
                  <label
                    style={{ color: Colors.textSecondary }}
                    className="block text-sm font-medium mb-2"
                  >
                    Thumbnail Preview
                  </label>
                  <div
                    className="rounded overflow-hidden border"
                    style={{
                      borderColor: Colors.gray600,
                      maxWidth: '100%'
                    }}
                  >
                    <img
                      src={URL.createObjectURL(selectedThumbnailFile)}
                      alt="Thumbnail preview"
                      style={{
                        width: '100%',
                        height: 'auto',
                        display: 'block'
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
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

            <p style={{ color: Colors.textSecondary }} className="text-xs">
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
                <BarChart3 className="h-4 w-4" style={{ color: Colors.streakFire }} />
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
