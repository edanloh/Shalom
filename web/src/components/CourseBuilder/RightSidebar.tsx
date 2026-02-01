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
  Plus,
  Palette,
  AlertTriangle,
  Info,
  Undo,
  Edit2,
  Trash2,
  ChevronDown,
} from "lucide-react";
import { useCourseBuilder } from "./CourseBuilderContext";
import { useCategories } from "../../hooks/useCategories";
import { Colors } from "../../constants/Colors";
import categoryService from "@/services/categoryService";

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
    courseOutcomes,
    setCourseOutcomes,
    showValidationErrors,
    courseCategory,
    setCourseCategory,
    courseThumbnailUrl,
    setCourseThumbnailUrl,
    courseStatus,
    setCourseStatus,
    setHasUnsavedChanges,

    pendingCategoryChanges,
    setPendingCategoryChanges,
    revertCategoryChanges,
    originalCourseCategory,
    localCategories,
    setLocalCategories,
  } = useCourseBuilder();

  const {
    categories,
    loading: categoriesLoading,
    error: categoriesError,
  } = useCategories();

  const [thumbnailInputType, setThumbnailInputType] = useState<
    "url" | "upload"
  >("url");
  const [selectedThumbnailFile, setSelectedThumbnailFile] =
    useState<File | null>(null);

  // Modal states
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState("#6366F1");

  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState("");
  const [editCategoryName, setEditCategoryName] = useState("");
  const [editCategoryColor, setEditCategoryColor] = useState("#6366F1");

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [affectedCoursesCount, setAffectedCoursesCount] = useState(0);
  const [affectedCourses, setAffectedCourses] = useState<
    Array<{
      id: string;
      title: string;
    }>
  >([]);

  // Restore state from cache on mount
  React.useEffect(() => {
    if (courseThumbnailUrl?.startsWith("[LOCAL_FILE:")) {
      const cachedFile =
        courseThumbnailFileCache.file || (window as any).__courseThumbnailFile;
      if (cachedFile) {
        setSelectedThumbnailFile(cachedFile);
        setThumbnailInputType("upload");
      }
    } else if (courseThumbnailUrl && courseThumbnailUrl.trim() !== "") {
      setThumbnailInputType("url");
    }
  }, [courseThumbnailUrl]);

  const handleThumbnailFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
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
    setCourseThumbnailUrl("");
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

  const handleOutcomeChange = (index: number, value: string) => {
    setCourseOutcomes((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
    setHasUnsavedChanges(true);
  };

  const handleAddOutcome = () => {
    setCourseOutcomes((prev) => [...prev, ""]);
    setHasUnsavedChanges(true);
  };

  const handleRemoveOutcome = (index: number) => {
    setCourseOutcomes((prev) => prev.filter((_, i) => i !== index));
    setHasUnsavedChanges(true);
  };

  /**
   * Helper function: Check if the currently selected category is General
   * This updates reactively when courseCategory or localCategories change
   */
  const isCurrentCategoryGeneral = React.useCallback((): boolean => {
    // If no category selected, it defaults to General
    if (!courseCategory || courseCategory === "") return true;

    // Find the current category in localCategories
    const currentCategory = localCategories.find(
      (cat) => cat.id === courseCategory,
    );

    // Check if the name is "General" (case-insensitive)
    return currentCategory?.name.toLowerCase() === "general";
  }, [courseCategory, localCategories]); // ← Re-runs when these change!

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
        0,
      ),
    0,
  );

  // Handler for adding a new category (local only until Save is clicked)
  const handleAddCategory = () => {
    if (!newCategoryName.trim()) {
      alert("Please enter a category name");
      return;
    }

    // Check for duplicate names
    if (
      localCategories.some(
        (cat) =>
          cat.name.toLowerCase() === newCategoryName.trim().toLowerCase(),
      )
    ) {
      alert("A category with this name already exists");
      return;
    }

    const tempId = `temp-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`;
    const newCategory = {
      id: tempId,
      name: newCategoryName.trim(),
      color: newCategoryColor,
    };

    setLocalCategories((prev) =>
      [...prev, newCategory].sort((a, b) => a.name.localeCompare(b.name)),
    );
    setPendingCategoryChanges((prev) => ({
      ...prev,
      created: [
        ...prev.created,
        { tempId, name: newCategoryName.trim(), color: newCategoryColor },
      ],
    }));
    setCourseCategory(tempId);
    setHasUnsavedChanges(true);
    setNewCategoryName("");
    setNewCategoryColor("#6366F1");
    setShowAddCategoryModal(false);
  };

  const handleRevertCategoryChanges = () => {
    // Call context's revert function
    revertCategoryChanges();

    // Reload categories from server (reset local state)
    setLocalCategories(categories);

    // Close any open modals
    setShowAddCategoryModal(false);
    setShowEditCategoryModal(false);
    setShowDeleteConfirm(false);
    setEditingCategoryId("");
    setAffectedCourses([]);
  };

  // Handler for editing a category (local only until Save is clicked)
  const handleEditCategory = async () => {
    if (!editCategoryName.trim()) {
      alert("Please enter a category name");
      return;
    }

    // Check for duplicate names (excluding current category)
    if (
      localCategories.some(
        (cat) =>
          cat.id !== editingCategoryId &&
          cat.name.toLowerCase() === editCategoryName.trim().toLowerCase(),
      )
    ) {
      alert("A category with this name already exists");
      return;
    }

    setLocalCategories((prev) =>
      prev
        .map((cat) =>
          cat.id === editingCategoryId
            ? {
                ...cat,
                name: editCategoryName.trim(),
                color: editCategoryColor,
              }
            : cat,
        )
        .sort((a, b) => a.name.localeCompare(b.name)),
    );

    // Track the change
    if (!editingCategoryId.startsWith("temp-")) {
      setPendingCategoryChanges((prev) => {
        const existing = prev.updated.find((u) => u.id === editingCategoryId);
        if (existing) {
          return {
            ...prev,
            updated: prev.updated.map((u) =>
              u.id === editingCategoryId
                ? {
                    id: editingCategoryId,
                    name: editCategoryName.trim(),
                    color: editCategoryColor,
                  }
                : u,
            ),
          };
        }
        return {
          ...prev,
          updated: [
            ...prev.updated,
            {
              id: editingCategoryId,
              name: editCategoryName.trim(),
              color: editCategoryColor,
            },
          ],
        };
      });
    } else {
      // Update in created list if it's a temp category
      setPendingCategoryChanges((prev) => ({
        ...prev,
        created: prev.created.map((c) =>
          c.tempId === editingCategoryId
            ? {
                tempId: editingCategoryId,
                name: editCategoryName.trim(),
                color: editCategoryColor,
              }
            : c,
        ),
      }));
    }

    setHasUnsavedChanges(true);
    setShowEditCategoryModal(false);
    setEditingCategoryId("");
  };

  // Handler for deleting a category (local only until Save is clicked)
  const handleDeleteCategory = () => {
    // Remove from local categories list
    setLocalCategories((prev) =>
      prev.filter((cat) => cat.id !== editingCategoryId),
    );

    // Track the deletion (but don't execute until save)
    if (!editingCategoryId.startsWith("temp-")) {
      setPendingCategoryChanges((prev) => ({
        ...prev,
        deleted: [...prev.deleted, editingCategoryId],
        updated: prev.updated.filter((u) => u.id !== editingCategoryId),
      }));
    } else {
      // Remove from created list if it's a temp category
      setPendingCategoryChanges((prev) => ({
        ...prev,
        created: prev.created.filter((c) => c.tempId !== editingCategoryId),
      }));
    }

    // If the deleted category was selected, clear selection (defaults to General)
    if (courseCategory === editingCategoryId) {
      // Find General category ID from localCategories
      const generalCategory = localCategories.find(
        (cat) => cat.name.toLowerCase() === "general",
      );

      if (generalCategory) {
        setCourseCategory(generalCategory.id); // ✅ Use actual ID!
      } else {
        // Fallback: set to empty string (backend will use General)
        setCourseCategory("");
      }
    }

    setHasUnsavedChanges(true);
    setShowDeleteConfirm(false);
    setShowEditCategoryModal(false);
    setEditingCategoryId("");
    setAffectedCourses([]);
  };

  const openEditModal = () => {
    const selectedCategory = localCategories.find(
      (cat) => cat.id === courseCategory,
    );
    if (selectedCategory) {
      setEditingCategoryId(selectedCategory.id);
      setEditCategoryName(selectedCategory.name);
      setEditCategoryColor(selectedCategory.color || "#6366F1");
      setShowEditCategoryModal(true);
    }
  };

  const openDeleteConfirm = async (categoryIdToDelete?: string) => {
    // Try multiple sources for the category ID
    const categoryId =
      categoryIdToDelete || editingCategoryId || courseCategory;

    // Validate category ID before proceeding
    const category = localCategories.find((cat) => cat.id === categoryId);
    const isGeneral = category?.name.toLowerCase() === "general";

    if (!categoryId || categoryId.trim() === "" || isGeneral) {
      console.error(
        "[openDeleteConfirm] Cannot delete General category or no valid category ID!",
      );
      alert("General category cannot be deleted");
      return;
    }

    // Update editingCategoryId for use in handleDeleteCategory
    setEditingCategoryId(categoryId);

    // Show modal
    setShowDeleteConfirm(true);
    setAffectedCourses([]);
    setAffectedCoursesCount(0);

    try {
      const courses = await categoryService.getAffectedCourses(categoryId);

      setAffectedCourses(courses);
      setAffectedCoursesCount(courses.length);
    } catch (error) {
      console.error(
        "[openDeleteConfirm] Error fetching affected courses:",
        error,
      );
    }
  };

  // Color palette for category selection
  const colorOptions = Object.keys(Colors)
    .filter((key) => key.startsWith("category"))
    .sort() // ensures categoryDefault, category2, category3... order
    .map((key) => Colors[key as keyof typeof Colors]);

  // Get selected category details for display
  const selectedCategory = localCategories.find(
    (cat) => cat.id === courseCategory,
  );

  // Check if current category is being deleted
  const isCurrentCategoryBeingDeleted =
    courseCategory && pendingCategoryChanges.deleted.includes(courseCategory);

  return (
    <div
      style={{
        backgroundColor: Colors.backgroundGray,
        borderLeft: `1px solid ${Colors.gray800}`,
        width: `${rightSidebarWidth}%`,
      }}
      className="flex flex-col relative"
    >
      {/* Resize Handle */}
      <div
        style={{ backgroundColor: Colors.gray500 }}
        className="absolute top-0 left-0 w-1 h-full cursor-col-resize transition-colors hover:opacity-80"
        onMouseDown={handleMouseDown}
      />

      {/* Content */}
      <div className="flex-1 p-4 space-y-5 overflow-y-auto">
        {/* Header */}
        <div
          style={{ borderBottom: `1px solid ${Colors.gray800}` }}
          className="pb-3"
        >
          <h3
            style={{ color: Colors.textPrimary }}
            className="text-lg font-semibold"
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
            Course Title<span className="text-red-500 ml-1">*</span>
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
              wordWrap: "break-word",
              overflowWrap: "break-word",
            }}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:border-opacity-80 resize-y"
            placeholder="Enter course title"
          />
          {showValidationErrors && !courseName.trim() && (
            <p className="text-xs text-red-400 mt-1">Course title is required.</p>
          )}
        </div>

        {/* Course Description */}
        <div>
          <label
            style={{ color: Colors.textSecondary }}
            className="block text-sm font-medium mb-2"
          >
            Course Description<span className="text-red-500 ml-1">*</span>
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
              wordWrap: "break-word",
              overflowWrap: "break-word",
            }}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:border-opacity-80 resize-y"
            placeholder="Enter course description..."
          />
          {showValidationErrors && !courseDescription.trim() && (
            <p className="text-xs text-red-400 mt-1">
              Course description is required.
            </p>
          )}
        </div>

        {/* Course Outcomes */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label
              style={{ color: Colors.textSecondary }}
              className="block text-sm font-medium"
            >
              Course Outcomes
            </label>
            <button
              onClick={handleAddOutcome}
              style={{ color: Colors.accent }}
              className="flex items-center gap-1 text-xs hover:opacity-80 transition-opacity"
              title="Add outcome"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="font-medium">Add</span>
            </button>
          </div>
          <div className="space-y-2">
            {courseOutcomes.length === 0 && (
              <>
                <p
                  className="text-xs text-center py-2"
                  style={{ color: Colors.gray500 }}
                >
                  No outcomes yet.
                </p>
                <div
                  style={{
                    backgroundColor: Colors.textInputBg,
                    borderColor: Colors.gray600,
                    color: Colors.textSecondary,
                  }}
                  className="mt-2 px-3 py-2 border rounded text-xs flex items-center gap-2"
                >
                  <Info className="h-4 w-4 flex-shrink-0" />
                  <span>
                    Add outcomes to describe what learners will achieve.
                  </span>
                </div>
              </>
            )}
            {courseOutcomes.map((outcome, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={outcome}
                  onChange={(e) => handleOutcomeChange(index, e.target.value)}
                  style={{
                    backgroundColor: Colors.textInputBg,
                    borderColor: Colors.gray600,
                    color: Colors.textPrimary,
                  }}
                  className="flex-1 px-3 py-2 border rounded focus:outline-none focus:border-opacity-80"
                  placeholder={`Outcome ${index + 1}`}
                />
                <button
                  onClick={() => handleRemoveOutcome(index)}
                  className="p-2 rounded hover:opacity-80 transition-opacity"
                  style={{
                    backgroundColor: Colors.gray800,
                    color: Colors.textSecondary,
                    borderColor: Colors.gray600,
                    borderWidth: 1,
                  }}
                  title="Remove outcome"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Course Category - Improved UI with General as default */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label
              style={{ color: Colors.textSecondary }}
              className="block text-sm font-medium"
            >
              Course Category<span className="text-red-500 ml-1">*</span>
            </label>
            <button
              onClick={() => setShowAddCategoryModal(true)}
              style={{ color: Colors.accent }}
              className="flex items-center gap-1 text-xs hover:opacity-80 transition-opacity"
              title="Add new category"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="font-medium">New</span>
            </button>
          </div>

          {categoriesLoading ? (
            <div
              style={{
                backgroundColor: Colors.textInputBg,
                borderColor: Colors.gray600,
                color: Colors.textSecondary,
              }}
              className="w-full px-3 py-2 border rounded text-sm"
            >
              Loading categories...
            </div>
          ) : (
            <div className="space-y-3">
              {/* Enhanced Category Selection Dropdown */}
              <div className="relative">
                <select
                  value={
                    courseCategory ||
                    localCategories.find(
                      (cat) => cat.name.toLowerCase() === "general",
                    )?.id ||
                    ""
                  }
                  onChange={(e) => {
                    setCourseCategory(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  style={{
                    backgroundColor: Colors.textInputBg,
                    borderColor: selectedCategory
                      ? selectedCategory.color
                      : Colors.gray600,
                    borderWidth: selectedCategory ? "2px" : "1px",
                    color: Colors.textPrimary,
                    paddingLeft:
                      selectedCategory &&
                      selectedCategory.name.toLowerCase() !== "general"
                        ? "2.5rem"
                        : "0.75rem",
                  }}
                  className="w-full px-3 py-2.5 border rounded focus:outline-none focus:ring-2 focus:ring-opacity-50 appearance-none cursor-pointer"
                >
                  {/* ALWAYS show General as first option */}
                  <option
                    value={
                      localCategories.find(
                        (cat) => cat.name.toLowerCase() === "general",
                      )?.id || ""
                    }
                  >
                    General (Default)
                  </option>
                  {/* Show other categories, excluding General if it's in the list */}
                  {localCategories
                    .filter((cat) => cat.name.toLowerCase() !== "general")
                    .map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                </select>

                {/* Color indicator badge - only for non-General categories */}
                {selectedCategory &&
                  selectedCategory.name.toLowerCase() !== "general" && (
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <div
                        style={{ backgroundColor: selectedCategory.color }}
                        className="w-4 h-4 rounded-full"
                      />
                    </div>
                  )}

                {/* Dropdown arrow icon */}
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <ChevronDown
                    className="h-4 w-4"
                    style={{ color: Colors.textSecondary }}
                  />
                </div>
              </div>

              {/* Warning if current category is being deleted */}
              {isCurrentCategoryBeingDeleted && (
                <div
                  style={{
                    backgroundColor: "#FEF3C7",
                    borderColor: "#F59E0B",
                    color: "#92400E",
                  }}
                  className="flex items-start gap-2 p-3 border rounded text-xs mt-3"
                >
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium mb-1">⚠️ Category Deleted</p>
                    <p>
                      This course will be moved to <strong>"General"</strong>{" "}
                      category when you save.
                    </p>
                  </div>
                </div>
              )}

              {/* Show indicator when no category selected after deletion */}
              {(courseCategory === "" ||
                selectedCategory?.name.toLowerCase() === "general") &&
                pendingCategoryChanges.deleted.length > 0 && (
                  <div
                    style={{
                      backgroundColor: Colors.textInputBg,
                      borderColor: "#F59E0B",
                      color: "#F59E0B",
                    }}
                    className="mt-2 px-3 py-2 border rounded text-sm flex items-center gap-2"
                  >
                    <Info className="h-4 w-4 flex-shrink-0" />
                    <span>Will be assigned to "General" on save</span>
                  </div>
                )}

              {/* Edit/Delete buttons - ONLY for non-General categories */}
              {courseCategory &&
                courseCategory !== "" &&
                selectedCategory?.name.toLowerCase() !== "general" &&
                !isCurrentCategoryBeingDeleted && (
                  <div className="flex gap-2 w-full mt-2">
                    <button
                      onClick={openEditModal}
                      style={{
                        backgroundColor: Colors.gray800,
                        color: Colors.accent,
                        borderColor: Colors.accent,
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border rounded text-sm font-medium hover:opacity-80 transition-opacity"
                    >
                      <Edit2 className="h-4 w-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (
                          !courseCategory ||
                          selectedCategory?.name.toLowerCase() === "general"
                        ) {
                          alert("General category cannot be deleted");
                          return;
                        }
                        openDeleteConfirm(courseCategory);
                      }}
                      style={{
                        backgroundColor: Colors.gray800,
                        color: "#EF4444",
                        borderColor: "#EF4444",
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border rounded text-sm font-medium hover:opacity-80 transition-opacity"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                )}

              {/* Revert Button - only show if there are pending changes */}
              {(pendingCategoryChanges.created.length > 0 ||
                pendingCategoryChanges.updated.length > 0 ||
                pendingCategoryChanges.deleted.length > 0) && (
                <button
                  onClick={handleRevertCategoryChanges}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 border rounded text-sm font-medium hover:opacity-80 transition-opacity mt-2"
                  style={{
                    backgroundColor: Colors.gray800,
                    borderColor: Colors.yellow,
                    color: Colors.starGold,
                  }}
                >
                  <Undo className="h-4 w-4" />
                  Revert All Changes
                </button>
              )}

              {/* Info notice about category changes */}
              {pendingCategoryChanges.updated.length > 0 && (
                <div
                  style={{
                    backgroundColor: "#FEF3C7",
                    borderColor: "#F59E0B",
                    color: "#92400E",
                  }}
                  className="flex items-start gap-2 p-3 border rounded text-xs"
                >
                  <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <p>
                    Category changes will affect all courses using this category
                    when you save.
                  </p>
                </div>
              )}

              {/* Info box for General category */}
              {(courseCategory === "" || courseCategory === "general") &&
                pendingCategoryChanges.deleted.length === 0 && (
                  <div
                    style={{
                      backgroundColor: Colors.textInputBg,
                      borderColor: Colors.gray600,
                      color: Colors.textSecondary,
                    }}
                    className="mt-2 px-3 py-2 border rounded text-xs flex items-center gap-2"
                  >
                    <Info className="h-4 w-4 flex-shrink-0" />
                    <span>
                      <strong>General</strong> is the default category. It
                      cannot be edited or deleted.
                    </span>
                  </div>
                )}

              {categoriesError && (
                <p style={{ color: "#EF4444" }} className="text-xs">
                  Error loading categories
                </p>
              )}
            </div>
          )}
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
              onClick={() => setThumbnailInputType("url")}
              disabled={
                thumbnailInputType === "upload" &&
                (!!selectedThumbnailFile ||
                  !!courseThumbnailUrl?.startsWith("[LOCAL_FILE:"))
              }
              style={{
                backgroundColor:
                  thumbnailInputType === "url" ? Colors.accent : Colors.gray800,
                color: Colors.textPrimary,
                opacity:
                  thumbnailInputType === "upload" &&
                  (!!selectedThumbnailFile ||
                    !!courseThumbnailUrl?.startsWith("[LOCAL_FILE:"))
                    ? 0.5
                    : 1,
                cursor:
                  thumbnailInputType === "upload" &&
                  (!!selectedThumbnailFile ||
                    !!courseThumbnailUrl?.startsWith("[LOCAL_FILE:"))
                    ? "not-allowed"
                    : "pointer",
              }}
              className="px-3 py-1 rounded text-sm"
            >
              URL
            </button>
            <button
              onClick={() => setThumbnailInputType("upload")}
              disabled={
                thumbnailInputType === "url" &&
                !!courseThumbnailUrl &&
                !courseThumbnailUrl.startsWith("[LOCAL_FILE:")
              }
              style={{
                backgroundColor:
                  thumbnailInputType === "upload"
                    ? Colors.accent
                    : Colors.gray800,
                color: Colors.textPrimary,
                opacity:
                  thumbnailInputType === "url" &&
                  !!courseThumbnailUrl &&
                  !courseThumbnailUrl.startsWith("[LOCAL_FILE:")
                    ? 0.5
                    : 1,
                cursor:
                  thumbnailInputType === "url" &&
                  !!courseThumbnailUrl &&
                  !courseThumbnailUrl.startsWith("[LOCAL_FILE:")
                    ? "not-allowed"
                    : "pointer",
              }}
              className="px-3 py-1 rounded text-sm"
            >
              Upload File
            </button>
          </div>
          {thumbnailInputType === "url" ? (
            <div>
              <input
                type="url"
                value={
                  courseThumbnailUrl?.startsWith("[LOCAL_FILE:")
                    ? ""
                    : courseThumbnailUrl || ""
                }
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
              {courseThumbnailUrl &&
                !courseThumbnailUrl.startsWith("[LOCAL_FILE:") && (
                  <>
                    <div
                      className="mt-2 px-2 py-1 rounded flex items-center justify-between"
                      style={{ backgroundColor: Colors.gray800 }}
                    >
                      <span
                        style={{
                          color: Colors.textSecondary,
                          fontSize: "13px",
                        }}
                      >
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
                          maxWidth: "100%",
                        }}
                      >
                        <img
                          src={courseThumbnailUrl}
                          alt="Thumbnail preview"
                          style={{
                            width: "100%",
                            height: "auto",
                            display: "block",
                          }}
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            e.currentTarget.parentElement!.innerHTML =
                              '<p style="padding: 20px; text-align: center; color: #94a3b8;">Failed to load image</p>';
                          }}
                        />
                      </div>
                    </div>
                  </>
                )}
            </div>
          ) : (
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
              {(selectedThumbnailFile ||
                courseThumbnailUrl?.startsWith("[LOCAL_FILE:")) && (
                <div
                  className="mt-2 px-2 py-1 rounded flex items-center justify-between"
                  style={{ backgroundColor: Colors.gray800 }}
                >
                  <span
                    style={{ color: Colors.textSecondary, fontSize: "13px" }}
                  >
                    📎{" "}
                    {selectedThumbnailFile?.name ||
                      courseThumbnailUrl
                        ?.split("[LOCAL_FILE: ")[1]
                        ?.replace("]", "")}
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
                      maxWidth: "100%",
                    }}
                  >
                    <img
                      src={URL.createObjectURL(selectedThumbnailFile)}
                      alt="Thumbnail preview"
                      style={{
                        width: "100%",
                        height: "auto",
                        display: "block",
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Course Status - TOGGLE VERSION */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label
              style={{ color: Colors.textSecondary }}
              className="block text-sm font-medium"
            >
              Publication Status<span className="text-red-500 ml-1">*</span>
            </label>
            {/* Status Badge */}
            <div
              className="flex items-center gap-2 text-xs font-medium px-3 py-1 rounded-full"
              style={{
                backgroundColor:
                  courseStatus === "published"
                    ? "rgba(34, 197, 94, 0.1)"
                    : "rgba(251, 191, 36, 0.1)",
                color:
                  courseStatus === "published" ? Colors.green : Colors.yellow,
                border: `1px solid ${courseStatus === "published" ? Colors.green : Colors.yellow}`,
              }}
            >
              {courseStatus === "draft" && <Clock className="h-3 w-3" />}
              {courseStatus === "published" && <Globe className="h-3 w-3" />}
              <span>{courseStatus === "draft" ? "Draft" : "Published"}</span>
            </div>
          </div>

          {/* Toggle Switch - Clickable Card */}
          <div
            onClick={() => {
              const newStatus =
                courseStatus === "draft" ? "published" : "draft";
              setCourseStatus(newStatus);
              setHasUnsavedChanges(true);
            }}
            className="cursor-pointer"
          >
            <div
              className="flex items-center justify-between w-full p-4 rounded-lg border transition-all hover:shadow-md"
              style={{
                backgroundColor:
                  courseStatus === "published"
                    ? "rgba(34, 197, 94, 0.05)"
                    : Colors.textInputBg,
                borderColor:
                  courseStatus === "published" ? Colors.green : Colors.gray600,
                borderWidth: courseStatus === "published" ? "2px" : "1px",
              }}
            >
              <div className="flex items-center gap-3">
                {/* Toggle Switch */}
                <div
                  className="relative w-12 h-6 rounded-full transition-colors"
                  style={{
                    backgroundColor:
                      courseStatus === "published"
                        ? Colors.green
                        : Colors.gray600,
                  }}
                >
                  <div
                    className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ease-in-out"
                    style={{
                      transform:
                        courseStatus === "published"
                          ? "translateX(24px)"
                          : "translateX(0)",
                    }}
                  />
                </div>

                {/* Text */}
                <div>
                  <div
                    className="font-medium text-sm"
                    style={{ color: Colors.textPrimary }}
                  >
                    {courseStatus === "published" ? "Published" : "Draft"}
                  </div>
                  <div
                    className="text-xs"
                    style={{ color: Colors.textSecondary }}
                  >
                    {courseStatus === "draft"
                      ? "Hidden from students"
                      : "Visible to students"}
                  </div>
                </div>
              </div>

              {/* Icon */}
              {courseStatus === "draft" ? (
                <Clock className="h-5 w-5" style={{ color: Colors.yellow }} />
              ) : (
                <Globe className="h-5 w-5" style={{ color: Colors.green }} />
              )}
            </div>
          </div>

          {/* Info Box */}
          <div
            className="mt-3 p-3 rounded-lg text-xs"
            style={{
              backgroundColor:
                courseStatus === "published"
                  ? "rgba(34, 197, 94, 0.05)"
                  : "rgba(251, 191, 36, 0.05)",
              borderLeft: `3px solid ${courseStatus === "published" ? Colors.green : Colors.yellow}`,
            }}
          >
            <div className="flex items-start gap-2">
              {courseStatus === "draft" ? (
                <>
                  <Clock
                    className="h-4 w-4 flex-shrink-0 mt-0.5"
                    style={{ color: Colors.yellow }}
                  />
                  <div style={{ color: Colors.textSecondary }}>
                    <p className="font-medium mb-1">Development Mode</p>
                    <p>
                      Your course is in draft mode. Students cannot see or
                      enroll in this course. Click to publish when ready.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Globe
                    className="h-4 w-4 flex-shrink-0 mt-0.5"
                    style={{ color: Colors.green }}
                  />
                  <div style={{ color: Colors.textSecondary }}>
                    <p className="font-medium mb-1">Live Course</p>
                    <p>
                      Your course is published and visible to all students. They
                      can browse, enroll, and start learning.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Course Statistics */}
        {/* <div>
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
                <BookOpen
                  className="h-4 w-4"
                  style={{ color: Colors.secondary }}
                />
                <span
                  style={{ color: Colors.textSecondary }}
                  className="text-sm"
                >
                  Modules
                </span>
              </div>
              <span
                style={{ color: Colors.textPrimary }}
                className="text-lg font-semibold"
              >
                {modules.length}
              </span>
            </div>

            <div
              style={{ backgroundColor: Colors.textInputBg }}
              className="flex items-center justify-between p-3 rounded"
            >
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" style={{ color: Colors.green }} />
                <span
                  style={{ color: Colors.textSecondary }}
                  className="text-sm"
                >
                  Lessons
                </span>
              </div>
              <span
                style={{ color: Colors.textPrimary }}
                className="text-lg font-semibold"
              >
                {totalLessons}
              </span>
            </div>

            <div
              style={{ backgroundColor: Colors.textInputBg }}
              className="flex items-center justify-between p-3 rounded"
            >
              <div className="flex items-center gap-2">
                <BarChart3
                  className="h-4 w-4"
                  style={{ color: Colors.streakFire }}
                />
                <span
                  style={{ color: Colors.textSecondary }}
                  className="text-sm"
                >
                  Quizzes
                </span>
              </div>
              <span
                style={{ color: Colors.textPrimary }}
                className="text-lg font-semibold"
              >
                {totalQuizzes}
              </span>
            </div>

            <div
              style={{ backgroundColor: Colors.textInputBg }}
              className="flex items-center justify-between p-3 rounded"
            >
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" style={{ color: Colors.yellow }} />
                <span
                  style={{ color: Colors.textSecondary }}
                  className="text-sm"
                >
                  Total Points
                </span>
              </div>
              <span
                style={{ color: Colors.textPrimary }}
                className="text-lg font-semibold"
              >
                {totalPoints}
              </span>
            </div>
          </div>
        </div> */}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            style={{
              backgroundColor: Colors.backgroundGray,
              border: `1px solid ${Colors.gray800}`,
            }}
            className="rounded-lg p-6 w-96 max-w-[90%] shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h2
                  style={{ color: Colors.textPrimary }}
                  className="text-lg font-semibold mb-1"
                >
                  Delete Category?
                </h2>
                <p style={{ color: Colors.textSecondary }} className="text-sm">
                  {affectedCourses.length === 0 && affectedCoursesCount === 0
                    ? "Checking for affected courses..."
                    : affectedCourses.length > 0
                      ? `This will affect ${affectedCourses.length} course${affectedCourses.length !== 1 ? "s" : ""}`
                      : "This category is not currently in use"}
                </p>
              </div>
            </div>

            {/* Show loading while fetching */}
            {affectedCourses.length === 0 && affectedCoursesCount === 0 ? (
              <div
                className="mb-4 p-3 border rounded text-sm text-center"
                style={{
                  backgroundColor: Colors.textInputBg,
                  borderColor: Colors.gray600,
                  color: Colors.textSecondary,
                }}
              >
                <div className="animate-pulse">Loading courses...</div>
              </div>
            ) : (
              <>
                {/* Important notice */}
                <div
                  style={{
                    backgroundColor: "#FEF3C7",
                    borderColor: "#F59E0B",
                    color: "#92400E",
                  }}
                  className="mb-4 p-3 border rounded text-sm"
                >
                  <p className="font-medium mb-1">⚠️ Important</p>
                  <p className="text-xs">
                    {affectedCourses.length === 0 ? (
                      <>This category is not being used and will be deleted.</>
                    ) : (
                      <>
                        All courses using this category will be moved to{" "}
                        <strong>"General"</strong> when you save.
                      </>
                    )}
                  </p>
                </div>

                {/* List affected courses */}
                {affectedCourses.length > 0 && (
                  <div
                    style={{
                      backgroundColor: "#F3F4F6",
                      borderColor: "#D1D5DB",
                      color: "#374151",
                    }}
                    className="mb-4 p-3 border rounded text-sm max-h-48 overflow-y-auto"
                  >
                    <p className="font-medium mb-2">
                      📚 {affectedCourses.length} course(s) affected:
                    </p>
                    <ul className="space-y-1 text-xs">
                      {affectedCourses.map((course) => (
                        <li key={course.id} className="truncate">
                          • {course.title}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Warning if this course is affected */}
                {courseCategory === editingCategoryId && (
                  <div
                    style={{
                      backgroundColor: "#FEF3C7",
                      borderColor: "#F59E0B",
                      color: "#92400E",
                    }}
                    className="mb-4 p-3 border rounded text-xs flex items-start gap-2"
                  >
                    <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <p>
                      <strong>This course</strong> is also using this category
                      and will be moved to "General".
                    </p>
                  </div>
                )}
              </>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleDeleteCategory}
                style={{ backgroundColor: "#EF4444" }}
                className="flex-1 px-4 py-2 rounded text-white font-medium hover:opacity-90"
              >
                {affectedCourses.length > 0 ? "Delete & Reassign" : "Delete"}
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setAffectedCourses([]);
                }}
                style={{
                  backgroundColor: Colors.gray800,
                  color: Colors.textPrimary,
                }}
                className="px-4 py-2 rounded font-medium hover:opacity-80"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {showEditCategoryModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowEditCategoryModal(false)}
        >
          <div
            style={{
              backgroundColor: Colors.backgroundGray,
              border: `1px solid ${Colors.gray800}`,
            }}
            className="rounded-lg p-6 w-96 max-w-[90%] shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2
                style={{ color: Colors.textPrimary }}
                className="text-lg font-semibold flex items-center gap-2"
              >
                <Edit2 className="h-5 w-5" />
                Edit Category
              </h2>
              <button
                onClick={() => setShowEditCategoryModal(false)}
                style={{ color: Colors.textSecondary }}
                className="hover:text-red-500 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Warning about affecting other courses */}
            <div
              style={{
                backgroundColor: "#FEF3C7",
                borderColor: "#F59E0B",
                color: "#92400E",
              }}
              className="mb-4 p-3 border rounded text-xs"
            >
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <p>
                  Changes to this category will affect all courses using it when
                  you save the course.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  style={{ color: Colors.textSecondary }}
                  className="block text-sm font-medium mb-2"
                >
                  Category Name
                </label>
                <input
                  type="text"
                  value={editCategoryName}
                  onChange={(e) => setEditCategoryName(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleEditCategory()}
                  style={{
                    backgroundColor: Colors.textInputBg,
                    borderColor: Colors.gray600,
                    color: Colors.textPrimary,
                  }}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:border-opacity-80"
                  placeholder="Category name"
                />
              </div>

              <div>
                <label
                  style={{ color: Colors.textSecondary }}
                  className="block text-sm font-medium mb-2 flex items-center gap-2"
                >
                  <Palette className="h-4 w-4" />
                  Choose Color
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      onClick={() => setEditCategoryColor(color)}
                      style={{
                        backgroundColor: color,
                        border:
                          editCategoryColor === color
                            ? `3px solid ${Colors.gray200}`
                            : `2px solid ${Colors.gray800}`,
                      }}
                      className="h-10 rounded transition-all hover:scale-110"
                      title={color}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleEditCategory}
                  disabled={!editCategoryName.trim()}
                  style={{
                    backgroundColor: Colors.accent,
                    opacity: !editCategoryName.trim() ? 0.5 : 1,
                  }}
                  className="flex-1 px-4 py-2 rounded text-white font-medium hover:opacity-90 transition-opacity disabled:cursor-not-allowed"
                >
                  Update Category
                </button>
                <button
                  onClick={() => setShowEditCategoryModal(false)}
                  style={{
                    backgroundColor: Colors.gray800,
                    color: Colors.textPrimary,
                  }}
                  className="px-4 py-2 rounded font-medium hover:opacity-80 transition-opacity"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {showAddCategoryModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowAddCategoryModal(false)}
        >
          <div
            style={{
              backgroundColor: Colors.backgroundGray,
              border: `1px solid ${Colors.gray800}`,
            }}
            className="rounded-lg p-6 w-96 max-w-[90%] shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2
                style={{ color: Colors.textPrimary }}
                className="text-lg font-semibold flex items-center gap-2"
              >
                <Plus className="h-5 w-5" style={{ color: Colors.accent }} />
                New Category
              </h2>
              <button
                onClick={() => setShowAddCategoryModal(false)}
                style={{ color: Colors.textSecondary }}
                className="hover:text-red-500 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  style={{ color: Colors.textSecondary }}
                  className="block text-sm font-medium mb-2"
                >
                  Category Name
                </label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleAddCategory()}
                  style={{
                    backgroundColor: Colors.textInputBg,
                    borderColor: Colors.gray600,
                    color: Colors.textPrimary,
                  }}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:border-opacity-80"
                  placeholder="e.g., Web Development"
                  autoFocus
                />
              </div>

              <div>
                <label
                  style={{ color: Colors.textSecondary }}
                  className="block text-sm font-medium mb-2 flex items-center gap-2"
                >
                  <Palette className="h-4 w-4" />
                  Choose Color
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewCategoryColor(color)}
                      style={{
                        backgroundColor: color,
                        border:
                          newCategoryColor === color
                            ? `3px solid ${Colors.accent}`
                            : `2px solid ${Colors.gray600}`,
                      }}
                      className="h-10 rounded transition-all hover:scale-110"
                      title={color}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleAddCategory}
                  disabled={!newCategoryName.trim()}
                  style={{
                    backgroundColor: Colors.accent,
                    opacity: !newCategoryName.trim() ? 0.5 : 1,
                  }}
                  className="flex-1 px-4 py-2 rounded text-white font-medium hover:opacity-90 transition-opacity disabled:cursor-not-allowed"
                >
                  Create Category
                </button>
                <button
                  onClick={() => setShowAddCategoryModal(false)}
                  style={{
                    backgroundColor: Colors.gray800,
                    color: Colors.textPrimary,
                  }}
                  className="px-4 py-2 rounded font-medium hover:opacity-80 transition-opacity"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
