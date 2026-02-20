import {
  Eye,
  Save,
  Settings,
  Clock,
  Users,
  BarChart3,
  ArrowLeft,
} from "lucide-react";
import { useCourseBuilder } from "./CourseBuilderContext";
import { useNavigate } from "react-router-dom";
import { Colors } from "../../constants/Colors";

export const CourseBuilderHeader = () => {
  const navigate = useNavigate();
  const {
    courseName,
    previewMode,
    setPreviewMode,
    modules,
    saveCourse,
    isSaving,
    showModal,
    hasUnsavedChanges,
    pendingCategoryChanges,
  } = useCourseBuilder();

  const handleSave = async () => {
    showModal({
      title: "Save Course?",
      message:
        "Are you sure you want to save your changes? This will update the course for all students.",
      type: "warning",
      confirmText: "Save Changes",
      cancelText: "Cancel",
      showCancel: true,
      onConfirm: async () => {
        try {
          // Check if there are category changes
          const hasCategoryChanges =
            pendingCategoryChanges.created.length > 0 ||
            pendingCategoryChanges.updated.length > 0 ||
            pendingCategoryChanges.deleted.length > 0;

          // Call saveCourse - it will handle category changes internally
          const result = await saveCourse();
          // Check for validation errors
          if (
            !result.success &&
            result.validationErrors &&
            result.validationErrors.length > 0
          ) {
            showModal({
              title: "Save Failed",
              message: (
                <div style={{ textAlign: "left" }}>
                  {/* Each error on its own line */}
                  {result.validationErrors.map((error, index) => (
                    <div key={index} style={{ marginBottom: "8px" }}>
                      <span style={{ color: "#EF4444" }}></span> {error}
                    </div>
                  ))}
                </div>
              ),
              type: "error",
              confirmText: "OK",
              showCancel: false,
            });
            return; 
          }

          // Handle result
          if (result.success) {
            showModal({
              title: "Success!",
              message: "Course saved successfully!",
              type: "success",
              confirmText: "OK",
              showCancel: false,
              onConfirm: () => {
                if (result.courseId) {
                  navigate(`/course/${result.courseId}`);
                }
              },
            });
          } else {
            showModal({
              title: "Save Failed",
              message:
                result.message || "Failed to save course. Please try again.",
              type: "error",
              confirmText: "OK",
              showCancel: false,
            });
          }
        } catch (error) {
          console.error("Error in save process:", error);
          showModal({
            title: "Save Failed",
            message:
              error?.message ||
              "An unexpected error occurred. Please try again.",
            type: "error",
            confirmText: "OK",
            showCancel: false,
          });
        }
      },
    });
  };

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
        0,
      ),
    0,
  );

  return (
    <div
      style={{
        background: `linear-gradient(to right, ${Colors.cardBackground}, ${Colors.surface})`,
        borderBottom: `1px solid ${Colors.gray800}`,
      }}
      className="px-6 py-4 flex items-center justify-between"
    >
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          style={{
            backgroundColor: Colors.backgroundGray,
            color: Colors.textSecondary,
          }}
          className="p-2 rounded-lg hover:opacity-80 transition-opacity"
          title="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h4
            style={{ color: Colors.textPrimary }}
            className="text-3xl font-bold"
          >
            {courseName || "New Course"}
          </h4>
          <p style={{ color: Colors.textSecondary }} className="text-sm">
            Build and manage your course content
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div
          className="flex items-center gap-6 text-base"
          style={{ color: Colors.textPrimary }}
        >
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" style={{ color: Colors.yellow }} />
            <span>{modules.length} modules</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" style={{ color: Colors.green }} />
            <span>{totalLessons} lessons</span>
          </div>
          <div className="flex items-center gap-2">
            <BarChart3
              className="h-5 w-5"
              style={{ color: Colors.streakFire }}
            />
            <div className="flex flex-col leading-tight">
              <span>{totalQuizzes} quizzes</span>
              <span className="text-xs" style={{ color: Colors.textSecondary }}>
                Total: {totalPoints} points
              </span>
            </div>
          </div>
        </div>

        {/* Show unsaved changes indicator */}
        {hasUnsavedChanges && (
          <div
            style={{
              color: Colors.yellow,
              backgroundColor: `${Colors.yellow}20`,
              borderColor: Colors.yellow,
            }}
            className="flex items-center gap-2 px-3 py-1 rounded-lg border text-sm"
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: Colors.yellow }}
            />
            Unsaved changes
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={() => setPreviewMode(!previewMode)}
            style={{
              backgroundColor: Colors.secondary,
              color: Colors.textPrimary,
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
          >
            <Eye className="h-4 w-4" />
            {previewMode ? "Edit" : "Preview"}
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            style={{
              backgroundColor: Colors.green,
              color: Colors.textPrimary,
              opacity: isSaving ? 0.5 : 1,
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};
