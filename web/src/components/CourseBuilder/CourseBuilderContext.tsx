/*
COURSE BUILDER VALIDATION RULES
1. COURSE LEVEL (2 Rules)
Title Required - Must have non-empty title
≥1 Module Required - Course must have at least one module

2. MODULE LEVEL (1 Rule)
No Empty Modules - Each module must have ≥1 lesson OR ≥1 quiz

3. LESSON LEVEL (2 Rules)
Video Lesson - Must have video URL or uploaded file
PDF Lesson - Must have PDF URL or uploaded file

4. QUIZ LEVEL (1 Rule)
≥1 Question Required - Each quiz must have at least one question

5. QUESTION LEVEL (4 Rules)
Question Text Required - Every question must have text
Options Required - Multiple choice/True-False must have options
Correct Answer Required - Must select a correct answer
Multiple Correct - At least one answer must be selected
*/

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import courseService from "../../services/courseService";
import categoryService from "@/services/categoryService";
import { useAuth } from "../../contexts/AuthContext";
import { StorageService } from "../../services/storageService";
import { useCategories } from "../../hooks/useCategories";
import { Colors } from "@/constants";
import { useUser } from '@/contexts/UserContext';
import { postNotification } from "@/services/notificationService";
import { Student } from "@/services";

// Types
export interface Question {
  id: string;
  text: string;
  type: string;
  options: string[];
  correctAnswer: number | number[]; // Support multiple correct answers
  imageUrl: string | null;
  points: number;
  sampleAnswer?: string; // For short answer questions
  matchingPairs?: { left: string; right: string }[]; // For matching questions
}

export interface Quiz {
  id: string;
  title: string;
  baseTitle?: string;
  status: string;
  passingScore: number;
  maxAttempts?: number | null;
  questions: Question[];
  order?: number;
}

export interface Lesson {
  id: string;
  title: string;
  baseTitle?: string;
  type: "video" | "document"; // Simplified: video or document
  status: string;
  content: string;
  videoUrl: string; // For video lessons
  resourceUrl?: string; // For document lessons (PDF, PPTX, DOCX)
  resourceType?: string; // Specific document type: 'pdf', 'document' (DOCX), 'slides' (PPTX)
  thumbnailUrl?: string;
  durationSeconds?: number;
  isPreview?: boolean;
  order?: number;
  fileSize?: number; // For document file size
  isDownloadable?: boolean; // For document download permission
}

export interface Module {
  id: string;
  title: string;
  description: string;
  status: string;
  expanded: boolean;
  lessons: Lesson[];
  quizzes: Quiz[];
}

export interface PendingCategoryChanges {
  created: Array<{ tempId: string; name: string; color: string }>;
  updated: Array<{ id: string; name: string; color: string }>;
  deleted: Array<string>;
}

export interface Toast {
  msg: string;
  type: "success" | "error";
}

export interface SelectedItem {
  type: "module" | "lesson" | "quiz";
  id: string;
}

export interface DraggedItem {
  type: "module" | "lesson" | "quiz";
  id: string;
}

// Modal state interface
export interface ModalState {
  isOpen: boolean;
  title: string;
  message: string;
  type: "success" | "error" | "warning" | "info";
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  onConfirm?: () => void;
}

// Context Interface
interface CourseBuilderContextType {
  // Course state
  courseName: string;
  setCourseName: (name: string) => void;
  courseDescription: string;
  setCourseDescription: (description: string) => void;
  courseOutcomes: string[];
  setCourseOutcomes: (
    outcomes: string[] | ((prev: string[]) => string[]),
  ) => void;
  courseCategory: string;
  setCourseCategory: (category: string) => void;
  localCategories: Array<{ id: string; name: string; color?: string }>;
  setLocalCategories: (
    categories:
      | Array<{ id: string; name: string; color?: string }>
      | ((
          prev: Array<{ id: string; name: string; color?: string }>,
        ) => Array<{ id: string; name: string; color?: string }>),
  ) => void;
  courseThumbnailUrl: string;
  setCourseThumbnailUrl: (url: string) => void;
  courseStatus: string;
  setCourseStatus: (status: string) => void;
  modules: Module[];
  setModules: (modules: Module[]) => void;
  isLoadingCourse: boolean;
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (value: boolean) => void;

  //Pending category changes
  pendingCategoryChanges: PendingCategoryChanges;
  setPendingCategoryChanges: (
    changes:
      | PendingCategoryChanges
      | ((prev: PendingCategoryChanges) => PendingCategoryChanges),
  ) => void;

  // Helper to reset pending changes
  clearPendingCategoryChanges: () => void;
  revertCategoryChanges: () => void;
  originalCourseCategory: string;

  // UI state
  selectedItem: SelectedItem | null;
  setSelectedItem: (item: SelectedItem | null) => void;
  sidebarWidth: number;
  setSidebarWidth: (width: number) => void;
  rightSidebarWidth: number;
  setRightSidebarWidth: (width: number) => void;
  isResizing: string | null;
  setIsResizing: (side: string | null) => void;
  previewMode: boolean;
  setPreviewMode: (mode: boolean) => void;
  toast: Toast | null;
  setToast: (toast: Toast | null) => void;
  modalState: ModalState;
  setModalState: (state: ModalState) => void;
  showModal: (config: Omit<ModalState, "isOpen">) => void;
  closeModal: () => void;
  showValidationErrors: boolean;
  setShowValidationErrors: (value: boolean) => void;

  // Drag and drop state
  draggedItem: DraggedItem | null;
  setDraggedItem: (item: DraggedItem | null) => void;
  draggedOver: DraggedItem | null;
  setDraggedOver: (item: DraggedItem | null) => void;

  // Utility functions
  showToast: (msg: string, type?: "success" | "error") => void;
  toggleModuleExpansion: (moduleId: string) => void;
  saveCourse: () => Promise<{
    success: boolean;
    courseId?: string;
    message?: string;
    validationErrors?: string[];
  }>;
  currentCourseId: string | undefined;
  setCurrentCourseId: (id: string | undefined) => void;
  isSaving: boolean;
}

// Create Context
const CourseBuilderContext = createContext<
  CourseBuilderContextType | undefined
>(undefined);

// Provider Component
interface CourseBuilderProviderProps {
  children: ReactNode;
  courseId?: string; // Optional: for editing existing course
}

export const CourseBuilderProvider = ({
  children,
  courseId,
}: CourseBuilderProviderProps) => {
  const { user } = useUser(); // Get authenticated user for admin ID
  const { categories } = useCategories();

  // Course state - Start with empty data (will be loaded from API or kept empty for new course)
  const [courseName, setCourseName] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [courseOutcomes, setCourseOutcomes] = useState<string[]>([]);
  const [courseCategory, setCourseCategory] = useState("");
  const [courseThumbnailUrl, setCourseThumbnailUrl] = useState("");
  const [courseStatus, setCourseStatus] = useState("draft");
  const [modules, setModules] = useState<Module[]>([]);
  const [isLoadingCourse, setIsLoadingCourse] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [originalCourseCategory, setOriginalCourseCategory] =
    useState<string>("");
  const [localCategories, setLocalCategories] = useState<
    Array<{
      id: string;
      name: string;
      color?: string;
    }>
  >([]);

  // Track pending category changes
  const [pendingCategoryChanges, setPendingCategoryChanges] =
    useState<PendingCategoryChanges>({
      created: [],
      updated: [],
      deleted: [],
    });

  const clearPendingCategoryChanges = () => {
    setPendingCategoryChanges({
      created: [],
      updated: [],
      deleted: [],
    });
  };

  // Fetch course data when courseId is provided (editing existing course)
  useEffect(() => {
    const fetchCourseData = async () => {
      if (!courseId || courseId === "new") {
        // No courseId or 'new' means we're creating a new course, keep empty state
        console.log(
          "CourseBuilder: Creating new course (no courseId or courseId=new)",
        );
        return;
      }

      console.log("CourseBuilder: Loading course data for courseId:", courseId);
      setIsLoadingCourse(true);

      try {
        const adminId = user?.uuid || "550e8400-e29b-41d4-a716-446655440101";

        // Fetch all course data using the service
        const courseBuilderData = await courseService.getCourseBuilderData(
          courseId,
          adminId,
        );

        console.log("CourseBuilder: Course data loaded:", courseBuilderData);

        // Set course basic info
        setCourseName(courseBuilderData.courseName);
        setCourseDescription(courseBuilderData.courseDescription);
        setCourseOutcomes(courseBuilderData.courseOutcomes || []);
        setCourseThumbnailUrl(courseBuilderData.courseThumbnailUrl);
        setCourseStatus(courseBuilderData.courseStatus);

        // Set category
        setCourseCategory(courseBuilderData.courseCategory);
        setOriginalCourseCategory(courseBuilderData.courseCategory); // Save for revert
        console.log("Loaded category:", courseBuilderData.courseCategory);

        // Set modules with all transformations already applied
        setModules(courseBuilderData.modules);

        console.log(
          "CourseBuilder: Quiz questions check:",
          courseBuilderData.modules.map((m) => ({
            moduleTitle: m.title,
            quizzes: m.quizzes.map((q) => ({
              quizTitle: q.title,
              questionsCount: q.questions?.length || 0,
              questions: q.questions,
            })),
          })),
        );

        console.log(
          "CourseBuilder: Course data loaded with numbering:",
          courseBuilderData.modules,
        );
      } catch (error) {
        console.error("CourseBuilder: Error fetching course data:", error);
      } finally {
        setIsLoadingCourse(false);
      }
    };

    fetchCourseData();
  }, [courseId]);

  useEffect(() => {
    if (categories.length > 0 && localCategories.length === 0) {
      setLocalCategories(categories);
    }
  }, [categories, localCategories.length]);

  // Initialize order values for existing content
  useEffect(() => {
    const initializeOrderValues = () => {
      const updatedModules = modules.map((module) => {
        // Check if any lessons or quizzes lack order values
        const needsInitialization =
          module.lessons.some((lesson) => lesson.order === undefined) ||
          module.quizzes.some((quiz) => quiz.order === undefined);

        if (needsInitialization) {
          // Get all content and sort lessons first, then quizzes
          const allContent = [
            ...module.lessons.map((lesson, index) => ({
              ...lesson,
              itemType: "lesson" as const,
              order: lesson.order ?? index,
            })),
            ...module.quizzes.map((quiz, index) => ({
              ...quiz,
              itemType: "quiz" as const,
              order: quiz.order ?? module.lessons.length + index,
            })),
          ];

          // Sort by order and assign sequential values
          allContent.sort((a, b) => a.order - b.order);
          allContent.forEach((item, index) => {
            item.order = index;
          });

          // Separate back into lessons and quizzes
          const updatedLessons = allContent
            .filter((item) => item.itemType === "lesson")
            .map(({ itemType, ...lesson }) => lesson);
          const updatedQuizzes = allContent
            .filter((item) => item.itemType === "quiz")
            .map(({ itemType, ...quiz }) => quiz);

          return {
            ...module,
            lessons: updatedLessons,
            quizzes: updatedQuizzes,
          };
        }

        return module;
      });

      // Only update if changes were made
      if (JSON.stringify(updatedModules) !== JSON.stringify(modules)) {
        setModules(updatedModules);
      }
    };
    const getStudents = async () => {
      const studentsData = await courseService.getCourseStudents(currentCourseId);
      console.log('Enrolled students fetched for notifications:', studentsData);
      setEnrolledStudents(studentsData);
      const data = await courseService.getAllStudents();
      setAllStudents(data.students);
      console.log('All students fetched for notifications:', data.students);
    };
    initializeOrderValues();
    getStudents();
  }, []); // Run only once on mount

  // UI state
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(28);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(28);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    title: "",
    message: "",
    type: "info",
  });

  // Drag and drop state
  const [draggedItem, setDraggedItem] = useState<DraggedItem | null>(null);
  const [draggedOver, setDraggedOver] = useState<DraggedItem | null>(null);

  // Students
  const [enrolledStudents, setEnrolledStudents] = useState<Student[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  
  // Utility functions
  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const showModal = (config: Omit<ModalState, "isOpen">) => {
    setModalState({ ...config, isOpen: true });
  };

  const closeModal = () => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
  };

  const toggleModuleExpansion = (moduleId: string) => {
    setModules(
      modules.map((m) =>
        m.id === moduleId ? { ...m, expanded: !m.expanded } : m,
      ),
    );
  };

  // Save functionality
  const [currentCourseId, setCurrentCourseId] = useState<string | undefined>(
    courseId,
  );
  const [courseExistsInDb, setCourseExistsInDb] = useState(courseId !== "new" && courseId !== undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [showValidationErrors, setShowValidationErrors] = useState(false);

  // Upload all pending files (videos and thumbnails) before saving
  const uploadAllPendingFiles = async () => {
    const uploadedModules = [...modules];
    let hasErrors = false;
    let uploadedCourseThumbnailUrl = courseThumbnailUrl;

    console.log(
      "[uploadAllPendingFiles] Starting with courseThumbnailUrl:",
      courseThumbnailUrl,
    );

    // Upload course thumbnail if it's a local file
    if (courseThumbnailUrl?.startsWith("[LOCAL_FILE:")) {
      const courseThumbnailFile = (window as any).__courseThumbnailFile;
      if (courseThumbnailFile) {
        try {
          const { url, error } =
            await StorageService.uploadThumbnail(courseThumbnailFile);
          if (error) {
            console.error("Course thumbnail upload failed:", error);
            hasErrors = true;
          } else {
            console.log(
              "[uploadAllPendingFiles] Uploaded course thumbnail to:",
              url,
            );
            uploadedCourseThumbnailUrl = url;
            setCourseThumbnailUrl(url);
          }
        } catch (err) {
          console.error("Course thumbnail upload error:", err);
          hasErrors = true;
        }
      }
    } else {
      console.log(
        "[uploadAllPendingFiles] Course thumbnail is a URL, using directly:",
        uploadedCourseThumbnailUrl,
      );
    }

    // Upload all lesson files
    for (
      let moduleIndex = 0;
      moduleIndex < uploadedModules.length;
      moduleIndex++
    ) {
      const module = uploadedModules[moduleIndex];

      for (
        let lessonIndex = 0;
        lessonIndex < module.lessons.length;
        lessonIndex++
      ) {
        const lesson = module.lessons[lessonIndex];

        // Check if lesson has local files that need uploading
        const hasLocalThumbnail =
          lesson.thumbnailUrl?.startsWith("[LOCAL_FILE:");
        const hasLocalVideo = lesson.videoUrl?.startsWith("[LOCAL_FILE:");
        const hasLocalPdf = lesson.resourceUrl?.startsWith("[LOCAL_FILE:");

        if (hasLocalThumbnail || hasLocalVideo || hasLocalPdf) {
          // Get files from fileCache (from useVideoUpload)
          const cacheKey = `${module.id}-${lesson.id}`;
          const cachedFiles = (window as any).__lessonFileCache?.get(cacheKey);

          if (cachedFiles) {
            // Upload thumbnail
            if (hasLocalThumbnail && cachedFiles.thumbnailFile) {
              try {
                const { url, error } = await StorageService.uploadThumbnail(
                  cachedFiles.thumbnailFile,
                );
                if (error) {
                  console.error(
                    `Thumbnail upload failed for lesson ${lesson.title}:`,
                    error,
                  );
                  hasErrors = true;
                } else {
                  uploadedModules[moduleIndex].lessons[
                    lessonIndex
                  ].thumbnailUrl = url;
                }
              } catch (err) {
                console.error(
                  `Thumbnail upload error for lesson ${lesson.title}:`,
                  err,
                );
                hasErrors = true;
              }
            }

            // Upload video
            if (hasLocalVideo && cachedFiles.videoFile) {
              try {
                const { url, error } = await StorageService.uploadVideo(
                  cachedFiles.videoFile,
                );
                if (error) {
                  console.error(
                    `Video upload failed for lesson ${lesson.title}:`,
                    error,
                  );
                  hasErrors = true;
                } else {
                  uploadedModules[moduleIndex].lessons[lessonIndex].videoUrl =
                    url;
                }
              } catch (err) {
                console.error(
                  `Video upload error for lesson ${lesson.title}:`,
                  err,
                );
                hasErrors = true;
              }
            }

            // Upload PDF
            if (hasLocalPdf && cachedFiles.pdfFile) {
              try {
                const { url, error } = await StorageService.uploadPDF(
                  cachedFiles.pdfFile,
                );
                if (error) {
                  console.error(
                    `PDF upload failed for lesson ${lesson.title}:`,
                    error,
                  );
                  hasErrors = true;
                } else {
                  uploadedModules[moduleIndex].lessons[
                    lessonIndex
                  ].resourceUrl = url;
                  if (
                    !uploadedModules[moduleIndex].lessons[lessonIndex].fileSize
                  ) {
                    uploadedModules[moduleIndex].lessons[lessonIndex].fileSize =
                      cachedFiles.pdfFile.size;
                  }
                }
              } catch (err) {
                console.error(
                  `PDF upload error for lesson ${lesson.title}:`,
                  err,
                );
                hasErrors = true;
              }
            }
          }
        }
      }
    }

    // Upload all quiz question images
    for (
      let moduleIndex = 0;
      moduleIndex < uploadedModules.length;
      moduleIndex++
    ) {
      const module = uploadedModules[moduleIndex];

      for (let quizIndex = 0; quizIndex < module.quizzes.length; quizIndex++) {
        const quiz = module.quizzes[quizIndex];

        for (
          let questionIndex = 0;
          questionIndex < quiz.questions.length;
          questionIndex++
        ) {
          const question = quiz.questions[questionIndex];
          const imageUrl = question.imageUrl;

          if (!imageUrl || imageUrl.trim() === "") {
            continue;
          }

          // Check if it's already a Supabase URL
          if (imageUrl.includes("supabase.co/storage")) {
            continue;
          }

          // Ensure we have a valid course ID
          let courseIdForUpload = currentCourseId;
          if (!courseIdForUpload || courseIdForUpload === "new") {
            // Generate a new UUID for the course
            courseIdForUpload = crypto.randomUUID();
            setCurrentCourseId(courseIdForUpload);
          }

          // Handle local file upload
          if (imageUrl.startsWith("[LOCAL_FILE:")) {
            const cacheKey = `question-${module.id}-${quiz.id}-${question.id}`;
            const cachedFile = (window as any).__questionImageCache?.get(
              cacheKey,
            );

            if (cachedFile) {
              try {
                const { url, error } =
                  await StorageService.uploadQuestionImage(
                    cachedFile,
                    courseIdForUpload,
                  );
                if (error) {
                  console.error(
                    `Question image upload failed for quiz ${quiz.baseTitle || quiz.title}:`,
                    error,
                  );
                  hasErrors = true;
                } else {
                  uploadedModules[moduleIndex].quizzes[quizIndex].questions[
                    questionIndex
                  ].imageUrl = url;
                }
              } catch (err) {
                console.error(
                  `Question image upload error for quiz ${quiz.baseTitle || quiz.title}:`,
                  err,
                );
                hasErrors = true;
              }
            }
          }
          // Skip external URLs - they should already be uploaded to bucket
          // (handled immediately when URL is pasted in QuestionImageUpload component)
          else if (!imageUrl.includes("supabase.co/storage")) {
            console.warn(
              `Question image URL is not a Supabase storage URL: ${imageUrl}. This should have been uploaded when the URL was entered.`,
            );
          }
        }
      }
    }

    // Update modules with uploaded URLs
    setModules(uploadedModules);

    return { uploadedModules, uploadedCourseThumbnailUrl, hasErrors };
  };

  /**
   * Process all pending category changes before saving the course
   */
  const processCategoryChanges = async () => {
    console.log(
      "[processCategoryChanges] Starting with:",
      pendingCategoryChanges,
    );

    let finalCategoryId = courseCategory;

    // Step 1: Handle deleted categories FIRST
    for (const deletedCategoryId of pendingCategoryChanges.deleted) {
      console.log(
        "[processCategoryChanges] Processing deleted category:",
        deletedCategoryId,
      );

      // If this course uses the deleted category, it will be set to General by backend
      // But we need to delete the category first
      try {
        await categoryService.deleteCategory(deletedCategoryId);
        console.log(
          "[processCategoryChanges] Category deleted, courses reassigned to General by backend",
        );

        // If this course was using deleted category, we need to find General's ID
        if (courseCategory === deletedCategoryId) {
          const allCategories = await categoryService.getAllCategories();
          const generalCategory = allCategories.find(
            (c) => c.name === "General",
          );
          if (generalCategory) {
            finalCategoryId = generalCategory.id;
            setCourseCategory(generalCategory.id);
          } else {
            // Fallback to empty (backend will create General)
            finalCategoryId = "";
            setCourseCategory("");
          }
        }
      } catch (error) {
        console.error(
          "[processCategoryChanges] Error deleting category:",
          error,
        );
        throw new Error(
          `Failed to delete category: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }

    // Step 2: Handle created categories
    for (const newCat of pendingCategoryChanges.created) {
      console.log("[processCategoryChanges] Creating new category:", newCat);

      try {
        const createdCategory = await categoryService.createCategory(
          newCat.name,
          newCat.color,
        );

        console.log(
          "[processCategoryChanges] Category created with ID:",
          createdCategory.id,
        );

        // If this course uses the temp ID, update to real ID
        if (courseCategory === newCat.tempId) {
          console.log(
            "[processCategoryChanges] Updating course category from temp ID to real ID",
          );
          finalCategoryId = createdCategory.id;
          setCourseCategory(createdCategory.id);
        }
      } catch (error) {
        console.error(
          "[processCategoryChanges] Error creating category:",
          error,
        );
        throw new Error(
          `Failed to create category "${newCat.name}": ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }

    // Step 3: Handle updated categories
    for (const updatedCat of pendingCategoryChanges.updated) {
      console.log("[processCategoryChanges] Updating category:", updatedCat);
      console.log("[processCategoryChanges] updatedCat.id:", updatedCat.id);
      console.log("[processCategoryChanges] updatedCat.name:", updatedCat.name);
      console.log(
        "[processCategoryChanges] updatedCat.color:",
        updatedCat.color,
      );

      try {
        // Make sure you're passing the VALUES, not the object
        await categoryService.updateCategory(
          updatedCat.id, // string
          updatedCat.name, // string (NOT object)
          updatedCat.color, // string (NOT object)
        );
        console.log("[processCategoryChanges] Category updated successfully");
      } catch (error) {
        console.error(
          "[processCategoryChanges] Error updating category:",
          error,
        );
        throw new Error(
          `Failed to update category: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }

    // Clear pending changes after successful processing
    clearPendingCategoryChanges();

    // Update original category to new value
    setOriginalCourseCategory(finalCategoryId);

    console.log(
      "[processCategoryChanges] All category changes processed successfully",
    );
    return finalCategoryId;
  };

  /**
   * Revert all category changes and restore original state
   */
  const revertCategoryChanges = () => {
    console.log(
      "[revertCategoryChanges] Reverting to original category:",
      originalCourseCategory,
    );

    // Restore original category
    setCourseCategory(originalCourseCategory);

    // Clear all pending changes
    clearPendingCategoryChanges();
  };

  /**
   * Validate course data before saving
   * Returns an array of error messages, empty array if valid
   */
  const validateCourseData = (): string[] => {
    const errors: string[] = [];

    // 1. Course must have a title
    const courseTitle = courseName?.trim() || "";
    if (!courseTitle) {
      errors.push("❌ Course title is required");
    } else if (courseTitle.length < 3) {
      errors.push("❌ Course title must be at least 3 characters");
    }

    // 2. Course description required
    const courseDesc = courseDescription?.trim() || "";
    if (!courseDesc) {
      errors.push("❌ Course description is required");
    } else if (courseDesc.length < 10) {
      errors.push("❌ Course description must be at least 10 characters");
    }

    // 3. Course must have at least one module
    if (modules.length === 0) {
      errors.push("❌ Course must have at least one module");
    }

    // 4. Validate each module
    modules.forEach((module, moduleIndex) => {
      const moduleNumber = moduleIndex + 1;
      const moduleTitle = (module.title || "")
        .replace(/^Module \d+:\s*/, "")
        .trim();

      if (!moduleTitle) {
        errors.push(`❌ Module ${moduleNumber}: Title is required`);
      }

      // Check if module is empty (no lessons and no quizzes)
      if (module.lessons.length === 0 && module.quizzes.length === 0) {
        errors.push(
          `❌ Module ${moduleNumber} "${module.title}" is empty. ` +
            `Please add at least one lesson or quiz, or delete the module.`,
        );
      }

      // Validate lessons in this module
      module.lessons.forEach((lesson, lessonIndex) => {
        const lessonNumber = lessonIndex + 1;
        const lessonTitle = (lesson.baseTitle || lesson.title || "")
          .replace(/^Lesson \d+\.\d+:\s*/, "")
          .trim();
        const lessonIdentifier = `Lesson ${moduleNumber}.${lessonNumber} "${lessonTitle}"`;

        if (!lessonTitle) {
          errors.push(`❌ Lesson ${moduleNumber}.${lessonNumber}: Title is required.`);
        }

        if (lesson.type === "video") {
          // Video lessons must have a video URL or uploaded file
          const hasVideo =
            lesson.videoUrl &&
            lesson.videoUrl.trim() !== "" &&
            lesson.videoUrl !== "[LOCAL_FILE: ]";

          if (!hasVideo) {
            errors.push(
              `❌ ${lessonIdentifier}: Video is required. ` +
                `Please add a video URL or upload a video file.`,
            );
          }
        } else if (lesson.type === "pdf") {
          // PDF lessons must have a resource URL or uploaded file
          const hasPDF =
            lesson.resourceUrl &&
            lesson.resourceUrl.trim() !== "" &&
            lesson.resourceUrl !== "[LOCAL_FILE: ]";

          if (!hasPDF) {
            errors.push(
              `❌ ${lessonIdentifier}: PDF document is required. ` +
                `Please add a PDF URL or upload a PDF file.`,
            );
          }
        }
      });

      // Validate quizzes in this module
      module.quizzes.forEach((quiz, quizIndex) => {
        const quizNumber = quizIndex + 1;
        const quizTitle = (quiz.baseTitle || quiz.title || "")
          .replace(/^Quiz \d+\.\d+:\s*/, "")
          .trim();
        const quizIdentifier = `Quiz ${moduleNumber}.${quizNumber} "${quizTitle}"`;

        if (!quizTitle) {
          errors.push(`❌ Quiz ${moduleNumber}.${quizNumber}: Title is required.`);
        }

        if (quiz.maxAttempts !== null && quiz.maxAttempts !== undefined) {
          if (Number.isNaN(Number(quiz.maxAttempts)) || Number(quiz.maxAttempts) < 1) {
            errors.push(`❌ ${quizIdentifier}: Max attempts must be at least 1 or set to unlimited.`);
          }
        }

        // Quiz must have at least one question
        if (!quiz.questions || quiz.questions.length === 0) {
          errors.push(`❌ ${quizIdentifier}: Must have at least one question.`);
        }

        // Validate each question
        quiz.questions.forEach((question, qIndex) => {
          const questionNumber = qIndex + 1;
          const questionIdentifier = `${quizIdentifier} - Question ${questionNumber}`;

          // Question must have text
          if (!question.text || !question.text.trim()) {
            errors.push(`❌ ${questionIdentifier}: Question text is required.`);
          }

          // Validate based on question type
          if (
            question.type === "multiple-choice" ||
            question.type === "multiple-correct" ||
            question.type === "true-false"
          ) {
            // Must have options
            const options = question.options || [];
            const hasOptions = options.length > 0;
            const nonEmptyOptions = options.filter((opt) => String(opt).trim() !== "");

            if (!hasOptions || nonEmptyOptions.length === 0) {
              errors.push(
                `❌ ${questionIdentifier}: Must have answer options.`,
              );
            }

            // Must have a correct answer selected
            if (
              question.correctAnswer === undefined ||
              question.correctAnswer === null
            ) {
              errors.push(
                `❌ ${questionIdentifier}: Must select a correct answer.`,
              );
            }

            // For multiple-correct, ensure at least one answer is selected
            if (
              question.type === "multiple-correct" &&
              Array.isArray(question.correctAnswer) &&
              question.correctAnswer.length === 0
            ) {
              errors.push(
                `❌ ${questionIdentifier}: Must select at least one correct answer.`,
              );
            }

            // Validate correct answer index(es) for multiple-choice / multiple-correct
            if (
              question.type === "multiple-choice" &&
              typeof question.correctAnswer === "number" &&
              options.length > 0 &&
              (question.correctAnswer < 0 || question.correctAnswer >= options.length)
            ) {
              errors.push(
                `❌ ${questionIdentifier}: Correct answer must be a valid option.`,
              );
            }

            if (
              question.type === "multiple-correct" &&
              Array.isArray(question.correctAnswer) &&
              options.length > 0
            ) {
              const invalidIndex = question.correctAnswer.some(
                (idx: number) => idx < 0 || idx >= options.length,
              );
              if (invalidIndex) {
                errors.push(
                  `❌ ${questionIdentifier}: One or more correct answers are invalid.`,
                );
              }
            }
          }
        });
      });
    });

    return errors;
  };

  const saveCourse = async (): Promise<{
    success: boolean;
    courseId?: string;
    message?: string;
    validationErrors?: string[];
  }> => {
    // STEP 0: VALIDATE BEFORE DOING ANYTHING
    const validationErrors = validateCourseData();

    if (validationErrors.length > 0) {
      setShowValidationErrors(true);
      return {
        success: false,
        message: `Validation failed: ${validationErrors.length} error(s) found`,
        validationErrors: validationErrors, // ← Return array
      };
    }

    console.log("[saveCourse] ✓ Validation passed!");
    setShowValidationErrors(false);

    // Continue with existing save logic...
    setIsSaving(true);
    try {
      // Step 0 - Process category changes FIRST
      console.log("[saveCourse] Processing category changes...");
      let finalCategoryId;
      try {
        finalCategoryId = await processCategoryChanges();
        console.log(
          "[saveCourse] Category changes processed, final category ID:",
          finalCategoryId,
        );
      } catch (error) {
        console.error("[saveCourse] Category processing failed:", error);
        showModal({
          title: "Category Error",
          message:
            error instanceof Error
              ? error.message
              : "Failed to process category changes",
          type: "error",
          confirmText: "OK",
          showCancel: false,
        });
        return {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "Category processing failed",
        };
      }

      // Step 1: Upload all pending files first
      console.log("Uploading pending files...");
      const { uploadedModules, uploadedCourseThumbnailUrl, hasErrors } =
        await uploadAllPendingFiles();

      if (hasErrors) {
        showModal({
          title: "Upload Warning",
          message:
            "Some files failed to upload. Check console for details. Continue saving?",
          type: "warning",
          confirmText: "Continue",
          showCancel: true,
        });
        // Note: In a real implementation, you'd want to wait for user confirmation
      }

      let finalCourseId = currentCourseId;

      // Transform modules from CourseBuilder format to backend API format
      // Use uploadedModules which has the Supabase URLs instead of local file markers
      // IMPORTANT: Include IDs for existing items to preserve student progress
      // Extract baseTitle (user input) instead of full title with "Lesson X.Y:" prefix
      const transformedModules = uploadedModules.map((module, index) => ({
        id: module.id, // Preserve section ID for UPDATE (not INSERT)
        title: module.title,
        description: module.description || "",
        order: index, // Add order index for each module
        lessons: module.lessons.map((lesson, lessonIndex) => ({
          id: lesson.id, // Preserve video/resource ID for UPDATE
          // Save only the user's custom title, not the "Lesson X.Y:" prefix
          title:
            lesson.baseTitle ||
            lesson.title.replace(/^Lesson \d+\.\d+:\s*/, ""),
          content: lesson.content || "",
          type: lesson.type || "video", // Include lesson type
          videoUrl: lesson.type === "video" ? lesson.videoUrl || null : null,
          resourceUrl:
            lesson.type !== "video" ? lesson.resourceUrl || null : null,
          resourceType:
            lesson.type !== "video" ? lesson.resourceType || null : null,
          thumbnailUrl: lesson.thumbnailUrl || null,
          durationSeconds:
            lesson.type === "video" ? lesson.durationSeconds || 0 : undefined,
          order: lesson.order ?? lessonIndex, // Use existing order or index
          durationMinutes:
            lesson.type === "video"
              ? Math.floor((lesson.durationSeconds || 0) / 60)
              : undefined,
          isPreview: lesson.isPreview || false,
          isDownloadable:
            lesson.type !== "video"
              ? (lesson.isDownloadable ?? true)
              : undefined,
          fileSize:
            lesson.type !== "video"
              ? (lesson.fileSize ?? (lesson as any).fileSizeBytes)
              : undefined,
        })),
        quizzes: module.quizzes.map((quiz, quizIndex) => ({
          id: quiz.id, // Preserve quiz ID for UPDATE
          // Save only the user's custom title, not the "Quiz X.Y:" prefix
          title: quiz.baseTitle || quiz.title.replace(/^Quiz \d+\.\d+:\s*/, ""),
          passingScore: quiz.passingScore || 70,
          maxAttempts: quiz.maxAttempts === null ? null : quiz.maxAttempts ?? 1,
          order: quiz.order ?? quizIndex, // Use existing order or index
          questions: quiz.questions.map((q, qIndex) => {
            // Prepare correctAnswer for database storage
            // Save actual option values (not indices) so options can be scrambled on mobile
            let correctAnswerForDb: string | string[] | number[];

            if (q.type === "multiple-choice" || q.type === "multiple_choice") {
              // Single answer: store the actual option text
              const answerIndex = typeof q.correctAnswer === "number" ? q.correctAnswer : 0;
              correctAnswerForDb = q.options[answerIndex] || "";
            } else if (q.type === "true-false") {
              // True/False: store the actual option text ("True" or "False")
              const answerIndex = q.correctAnswer === 0 ? 0 : 1;
              correctAnswerForDb = q.options[answerIndex] || "True";
            } else if (q.type === "multiple-correct") {
              // Multiple answers: store array of actual option texts
              if (Array.isArray(q.correctAnswer)) {
                correctAnswerForDb = q.correctAnswer
                  .filter((idx: any) => typeof idx === "number" && idx >= 0 && idx < q.options.length)
                  .map((idx: number) => q.options[idx]);
              } else {
                correctAnswerForDb = [];
              }
            } else {
              // For other types (short-answer, matching), store as-is
              correctAnswerForDb = String(q.correctAnswer || "");
            }

            return {
              id: q.id, // Preserve question ID for UPDATE
              text: q.text,
              type: q.type,
              options: q.options || [],
              correctAnswer: correctAnswerForDb,
              explanation: q.sampleAnswer || "",
              points: q.points || 1,
              order: qIndex, // Add order for questions
              imageUrl: q.imageUrl || null, // Include image URL
              matchingPairs: q.matchingPairs || [], // Include matching pairs
            };
          }),
        })),
      }));

      // Step 1: Create or update the course WITH full module structure
      if (!courseExistsInDb) {
        console.log("Creating new course with modules:", courseName);

        // Use courseService.createCourseWithModules which calls /createCourse endpoint
        const courseData = {
          courseId: currentCourseId && currentCourseId !== "new" ? currentCourseId : undefined, // Pass pre-generated ID if exists
          title: courseName,
          category: finalCategoryId || "",
          description: courseDescription || "Course description",
          thumbnailUrl: uploadedCourseThumbnailUrl || null,
          level: 'Beginner', // TODO: Add level selector in UI
          instructorId: user?.uuid, // Get from auth context
          instructorName: user?.name || 'Instructor', // Get from auth context
          modules: transformedModules,
          outcomes: courseOutcomes.map((outcome) => outcome.trim()).filter(Boolean),
          requirements: [], // TODO: Add requirements in UI
        };

        const response =
          await courseService.createCourseWithModules(courseData);
        finalCourseId = response.courseId;

        if (!finalCourseId) {
          throw new Error("Failed to get course ID from response");
        }

        setCurrentCourseId(finalCourseId);
        setCourseExistsInDb(true);
        console.log("Course created with ID:", finalCourseId);

        // Update URL to reflect the new course ID (so subsequent saves use UPDATE)
        if (typeof window !== "undefined") {
          window.history.replaceState(
            null,
            "",
            `/course-builder/${finalCourseId}`,
          );
        }
      } else {
        console.log("Updating course with modules:", currentCourseId);
        const updateData = {
          title: courseName,
          description: courseDescription,
          category: finalCategoryId || "", // CHANGED: Use categoryId (empty = General)
          thumbnailUrl: uploadedCourseThumbnailUrl || null,
          isPublished: courseStatus === "published",
          modules: transformedModules,
          outcomes: courseOutcomes.map((outcome) => outcome.trim()).filter(Boolean),
        };

        console.log("check course category:", courseCategory);

        await courseService.updateCourseWithModules(
          currentCourseId,
          updateData,
        );
        console.log("Course updated successfully");
      }

      // Show success modal
      showModal({
        title: "Success!",
        message:
          currentCourseId && currentCourseId !== "new"
            ? "Course updated successfully!"
            : "Course created successfully!",
        type: "success",
        confirmText: "OK",
        showCancel: false,
      });

      try {
        if (currentCourseId && currentCourseId !== 'new' ) {
          // Generate random uuid
          const notificationId = crypto.randomUUID();
          await postNotification({
            userIds: enrolledStudents.map(student => student.id.toString()),
            title: `${courseName}`,
            message: `${courseName} has been updated! Check out the latest content.`,
            type: `course_announcement-${currentCourseId}-${notificationId}`,
          });
        } else {
          // Generate random uuid
          const notificationId = crypto.randomUUID();
          await postNotification({
            userIds: allStudents.map(student => student.id.toString()),
            title: `${courseName}`,
            message: `New course ${courseName} has been created! Check it out now.`,
            type: `course_announcement-${currentCourseId}-${notificationId}`,
          });
        }
      } catch (notificationError) {
        console.error('Error sending notifications to students:', notificationError);
      }
      
      setHasUnsavedChanges(false); // Reset after successful save
      return { success: true, courseId: finalCourseId };
    } catch (error) {
      console.error("Error saving course:", error);

      // Show error modal
      showModal({
        title: "Save Failed",
        message:
          error instanceof Error
            ? error.message
            : "Failed to save course. Please try again.",
        type: "error",
        confirmText: "OK",
        showCancel: false,
      });

      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      };
    } finally {
      setIsSaving(false);
    }
  };

  // Update currentCourseId when courseId prop changes
  useEffect(() => {
    setCurrentCourseId(courseId);
    setCourseExistsInDb(courseId !== "new" && courseId !== undefined);
  }, [courseId]);

  const value = {
    // Course state
    courseName,
    setCourseName,
    courseDescription,
    setCourseDescription,
    courseOutcomes,
    setCourseOutcomes,
    courseCategory,
    setCourseCategory,
    courseThumbnailUrl,
    setCourseThumbnailUrl,
    courseStatus,
    setCourseStatus,
    modules,
    setModules,
    isLoadingCourse,
    hasUnsavedChanges,
    setHasUnsavedChanges,

    // UI state
    selectedItem,
    setSelectedItem,
    sidebarWidth,
    setSidebarWidth,
    rightSidebarWidth,
    setRightSidebarWidth,
    isResizing,
    setIsResizing,
    previewMode,
    setPreviewMode,
    toast,
    setToast,
    modalState,
    setModalState,
    showModal,
    closeModal,
    showValidationErrors,
    setShowValidationErrors,

    // Drag and drop state
    draggedItem,
    setDraggedItem,
    draggedOver,
    setDraggedOver,

    // Utility functions
    showToast,
    toggleModuleExpansion,
    saveCourse,
    currentCourseId,
    setCurrentCourseId,
    isSaving,

    localCategories,
    setLocalCategories,
    revertCategoryChanges,
    originalCourseCategory,
    pendingCategoryChanges,
    setPendingCategoryChanges,
    clearPendingCategoryChanges,
  };

  return (
    <CourseBuilderContext.Provider value={value}>
      {children}
    </CourseBuilderContext.Provider>
  );
};

export const useCourseBuilder = () => {
  const context = useContext(CourseBuilderContext);
  if (!context) {
    throw new Error(
      "useCourseBuilder must be used within CourseBuilderProvider",
    );
  }
  return context;
};
