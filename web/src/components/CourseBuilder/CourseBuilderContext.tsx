import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import courseService from '../../services/courseService';
import moduleService from '../../services/moduleService';
import apiService from '../../services/apiService';
import { useAuth } from '../../contexts/AuthContext';

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
  questions: Question[];
  order?: number;
}

export interface Lesson {
  id: string;
  title: string;
  baseTitle?: string;
  type: string;
  status: string;
  content: string;
  videoUrl: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  isPreview?: boolean;
  order?: number;
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

export interface Toast {
  msg: string;
  type: 'success' | 'error';
}

export interface SelectedItem {
  type: 'module' | 'lesson' | 'quiz';
  id: string;
}

export interface DraggedItem {
  type: 'module' | 'lesson' | 'quiz';
  id: string;
}

// Modal state interface
export interface ModalState {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
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
  courseStatus: string;
  setCourseStatus: (status: string) => void;
  modules: Module[];
  setModules: (modules: Module[]) => void;
  isLoadingCourse: boolean;
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (value: boolean) => void;
  
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
  showModal: (config: Omit<ModalState, 'isOpen'>) => void;
  closeModal: () => void;
  
  // Drag and drop state
  draggedItem: DraggedItem | null;
  setDraggedItem: (item: DraggedItem | null) => void;
  draggedOver: DraggedItem | null;
  setDraggedOver: (item: DraggedItem | null) => void;
  
  // Utility functions
  showToast: (msg: string, type?: 'success' | 'error') => void;
  toggleModuleExpansion: (moduleId: string) => void;
  saveCourse: () => Promise<{ success: boolean; courseId?: string; message?: string }>;
  currentCourseId: string | undefined;
  isSaving: boolean;
}

// Create Context
const CourseBuilderContext = createContext<CourseBuilderContextType | undefined>(undefined);

// Provider Component
interface CourseBuilderProviderProps {
  children: ReactNode;
  courseId?: string; // Optional: for editing existing course
}

export const CourseBuilderProvider = ({ children, courseId }: CourseBuilderProviderProps) => {
  const { user } = useAuth(); // Get authenticated user for admin ID
  
  // Course state - Start with empty data (will be loaded from API or kept empty for new course)
  const [courseName, setCourseName] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [courseStatus, setCourseStatus] = useState("draft");
  const [modules, setModules] = useState<Module[]>([]);
  const [isLoadingCourse, setIsLoadingCourse] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Fetch course data when courseId is provided (editing existing course)
  useEffect(() => {
    const fetchCourseData = async () => {
      if (!courseId || courseId === 'new') {
        // No courseId or 'new' means we're creating a new course, keep empty state
        console.log('CourseBuilder: Creating new course (no courseId or courseId=new)');
        return;
      }

      console.log('CourseBuilder: Loading course data for courseId:', courseId);
      setIsLoadingCourse(true);
      try {
        // Fetch course basic info
        const course = await courseService.getCourseById(courseId);
        if (!course) {
          console.error(`Course with ID ${courseId} not found`);
          return;
        }
        console.log('CourseBuilder: Course loaded:', course);

        // Fetch modules with lessons and quizzes (instructor view with quiz questions)
        const adminId = user?.id || 'default-admin-id';
        const moduleDetails = await moduleService.getCourseModules(courseId, adminId);
        console.log('CourseBuilder: Modules loaded:', moduleDetails);
        console.log('CourseBuilder: Quiz questions check:', 
          moduleDetails.map(m => ({ 
            moduleTitle: m.title, 
            quizzes: m.quizzes.map((q: any) => ({ 
              quizTitle: q.title, 
              questionsCount: q.questions?.length || 0,
              questions: q.questions 
            }))
          }))
        );

        // Transform API data to CourseBuilder format
        setCourseName(course.title || "");
        setCourseDescription(course.description || "");
        setCourseStatus(course.status || "draft");
        
        const transformedModules: Module[] = moduleDetails.map((module) => ({
          id: module.id.toString(),
          title: module.title,
          description: module.description || "",
          status: "published", // Assume published if exists
          expanded: false,
          lessons: module.lessons.map((lesson) => ({
            id: lesson.id.toString(),
            title: lesson.title,
            baseTitle: lesson.title,
            type: "video",
            status: "published",
            content: lesson.content || "",
            videoUrl: lesson.video_url || "",
            thumbnailUrl: lesson.thumbnail_url || "",
            durationSeconds: lesson.duration_seconds || 0,
            isPreview: lesson.is_preview || false,
            order: lesson.order_index
          })),
          quizzes: module.quizzes.map((quiz: any) => {
            console.log('Processing quiz:', quiz.title, 'Questions:', quiz.questions);
            return {
              id: quiz.id.toString(),
              title: quiz.title,
              baseTitle: quiz.title, // Store user's custom title
              status: "published",
              passingScore: quiz.passing_score || 70,
              questions: (quiz.questions || []).map((question: any) => {
                console.log('Transforming question:', question);
                
                // Parse correctAnswer: Backend stores actual answer text, convert to index
                let correctAnswer: number | number[];
                const questionType = question.type || 'multiple-choice';
                const options = question.options || [];
                
                if (questionType === 'multiple-choice' || questionType === 'multiple_choice') {
                  // Backend stores answer as text, find its index in options
                  if (typeof question.correctAnswer === 'string') {
                    const answerIndex = options.findIndex((opt: string) => opt === question.correctAnswer);
                    correctAnswer = answerIndex >= 0 ? answerIndex : 0;
                  } else if (typeof question.correctAnswer === 'number') {
                    correctAnswer = question.correctAnswer;
                  } else {
                    correctAnswer = 0;
                  }
                } else if (questionType === 'true-false') {
                  // For true/false, convert text answer to index (0 = True, 1 = False)
                  if (question.correctAnswer === 'True' || question.correctAnswer === true) {
                    correctAnswer = 0;
                  } else if (question.correctAnswer === 'False' || question.correctAnswer === false) {
                    correctAnswer = 1;
                  } else {
                    correctAnswer = typeof question.correctAnswer === 'number' ? question.correctAnswer : 0;
                  }
                } else if (questionType === 'multiple-correct') {
                  // Multiple correct answers - convert array of texts to array of indices
                  if (Array.isArray(question.correctAnswer)) {
                    correctAnswer = question.correctAnswer.map((ans: any) => {
                      if (typeof ans === 'string') {
                        const idx = options.findIndex((opt: string) => opt === ans);
                        return idx >= 0 ? idx : 0;
                      }
                      return typeof ans === 'number' ? ans : 0;
                    });
                  } else {
                    correctAnswer = [0];
                  }
                } else {
                  correctAnswer = 0;
                }

                return {
                  id: question.id.toString(),
                  text: question.text || question.question_text || '', // Backend returns 'question_text'
                  type: questionType,
                  options: options,
                  correctAnswer,
                  imageUrl: question.imageUrl || null,
                  points: question.points || 1,
                  sampleAnswer: question.explanation || '',
                  matchingPairs: question.matchingPairs || []
                };
              }),
              order: quiz.order_index || 0
            };
          })
        }));

        console.log('CourseBuilder: Transformed modules:', transformedModules);
        
        // Apply numbering to all lessons and quizzes (Lesson X.Y, Quiz X.Y format)
        const numberedModules = transformedModules.map((module, moduleIndex) => ({
          ...module,
          lessons: module.lessons.map((lesson, lessonIndex) => {
            const baseTitle = lesson.baseTitle || lesson.title.replace(/^Lesson \d+\.\d+:\s*/, '');
            return {
              ...lesson,
              baseTitle: baseTitle,
              title: `Lesson ${moduleIndex + 1}.${lessonIndex + 1}: ${baseTitle}`,
            };
          }),
          quizzes: module.quizzes.map((quiz, quizIndex) => {
            const baseTitle = quiz.baseTitle || quiz.title.replace(/^Quiz \d+\.\d+:\s*/, '');
            return {
              ...quiz,
              baseTitle: baseTitle,
              title: `Quiz ${moduleIndex + 1}.${quizIndex + 1}: ${baseTitle}`,
            };
          }),
        }));
        
        setModules(numberedModules);
        console.log('CourseBuilder: Course data loaded with numbering:', numberedModules);
      } catch (error) {
        console.error('CourseBuilder: Error fetching course data:', error);
      } finally {
        setIsLoadingCourse(false);
      }
    };

    fetchCourseData();
  }, [courseId]);

  // Initialize order values for existing content
  useEffect(() => {
    const initializeOrderValues = () => {
      const updatedModules = modules.map(module => {
        // Check if any lessons or quizzes lack order values
        const needsInitialization = 
          module.lessons.some(lesson => lesson.order === undefined) ||
          module.quizzes.some(quiz => quiz.order === undefined);

        if (needsInitialization) {
          // Get all content and sort lessons first, then quizzes
          const allContent = [
            ...module.lessons.map((lesson, index) => ({ 
              ...lesson, 
              itemType: 'lesson' as const, 
              order: lesson.order ?? index 
            })),
            ...module.quizzes.map((quiz, index) => ({ 
              ...quiz, 
              itemType: 'quiz' as const, 
              order: quiz.order ?? (module.lessons.length + index) 
            }))
          ];

          // Sort by order and assign sequential values
          allContent.sort((a, b) => a.order - b.order);
          allContent.forEach((item, index) => {
            item.order = index;
          });

          // Separate back into lessons and quizzes
          const updatedLessons = allContent
            .filter(item => item.itemType === 'lesson')
            .map(({ itemType, ...lesson }) => lesson);
          const updatedQuizzes = allContent
            .filter(item => item.itemType === 'quiz')
            .map(({ itemType, ...quiz }) => quiz);

          return {
            ...module,
            lessons: updatedLessons,
            quizzes: updatedQuizzes
          };
        }

        return module;
      });

      // Only update if changes were made
      if (JSON.stringify(updatedModules) !== JSON.stringify(modules)) {
        setModules(updatedModules);
      }
    };

    initializeOrderValues();
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
    title: '',
    message: '',
    type: 'info',
  });
  
  // Drag and drop state
  const [draggedItem, setDraggedItem] = useState<DraggedItem | null>(null);
  const [draggedOver, setDraggedOver] = useState<DraggedItem | null>(null);
  
  // Utility functions
  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const showModal = (config: Omit<ModalState, 'isOpen'>) => {
    setModalState({ ...config, isOpen: true });
  };

  const closeModal = () => {
    setModalState(prev => ({ ...prev, isOpen: false }));
  };
  
  const toggleModuleExpansion = (moduleId: string) => {
    setModules(modules.map(m => 
      m.id === moduleId ? { ...m, expanded: !m.expanded } : m
    ));
  };

  // Save functionality
  const [currentCourseId, setCurrentCourseId] = useState<string | undefined>(courseId);
  const [isSaving, setIsSaving] = useState(false);

  const saveCourse = async (): Promise<{ success: boolean; courseId?: string; message?: string }> => {
    if (!courseName.trim()) {
      return { success: false, message: 'Please enter a course name' };
    }

    setIsSaving(true);
    try {
      let finalCourseId = currentCourseId;

      // Transform modules from CourseBuilder format to backend API format
      // IMPORTANT: Include IDs for existing items to preserve student progress
      // Extract baseTitle (user input) instead of full title with "Lesson X.Y:" prefix
      const transformedModules = modules.map((module, index) => ({
        id: module.id, // Preserve section ID for UPDATE (not INSERT)
        title: module.title,
        description: module.description || '',
        order: index, // Add order index for each module
        lessons: module.lessons.map((lesson, lessonIndex) => ({
          id: lesson.id, // Preserve video ID for UPDATE
          // Save only the user's custom title, not the "Lesson X.Y:" prefix
          title: lesson.baseTitle || lesson.title.replace(/^Lesson \d+\.\d+:\s*/, ''),
          content: lesson.content || '',
          videoUrl: lesson.videoUrl || null,
          thumbnailUrl: lesson.thumbnailUrl || null,
          durationSeconds: lesson.durationSeconds || 0,
          order: lesson.order ?? lessonIndex, // Use existing order or index
          durationMinutes: Math.floor((lesson.durationSeconds || 0) / 60),
          isPreview: lesson.isPreview || false
        })),
        quizzes: module.quizzes.map((quiz, quizIndex) => ({
          id: quiz.id, // Preserve quiz ID for UPDATE
          // Save only the user's custom title, not the "Quiz X.Y:" prefix
          title: quiz.baseTitle || quiz.title.replace(/^Quiz \d+\.\d+:\s*/, ''),
          passingScore: quiz.passingScore || 70,
          order: quiz.order ?? quizIndex, // Use existing order or index
          questions: quiz.questions.map((q, qIndex) => {
            // Convert correctAnswer index back to actual answer text for database
            let correctAnswerForDb: string | string[];
            
            if (q.type === 'multiple-choice' || q.type === 'multiple_choice') {
              // Single answer: convert index to text
              correctAnswerForDb = typeof q.correctAnswer === 'number' 
                ? (q.options[q.correctAnswer] || '') 
                : String(q.correctAnswer);
            } else if (q.type === 'true-false') {
              // True/False: convert index to text
              correctAnswerForDb = q.correctAnswer === 0 ? 'True' : 'False';
            } else if (q.type === 'multiple-correct') {
              // Multiple answers: convert array of indices to array of texts
              if (Array.isArray(q.correctAnswer)) {
                correctAnswerForDb = q.correctAnswer.map((idx: number) => 
                  typeof idx === 'number' ? (q.options[idx] || '') : String(idx)
                );
              } else {
                correctAnswerForDb = [String(q.correctAnswer)];
              }
            } else {
              // For other types (short-answer, matching), store as-is
              correctAnswerForDb = String(q.correctAnswer || '');
            }
            
            return {
              id: q.id, // Preserve question ID for UPDATE
              text: q.text,
              type: q.type,
              options: q.options || [],
              correctAnswer: correctAnswerForDb,
              explanation: q.sampleAnswer || '',
              points: q.points || 1,
              order: qIndex // Add order for questions
            };
          })
        }))
      }));

      // Step 1: Create or update the course WITH full module structure
      if (!currentCourseId || currentCourseId === 'new') {
        console.log('Creating new course with modules:', courseName);
        
        // Backend createCourse expects full structure
        // Use apiService.post directly to bypass TypeScript restrictions
        const courseData = {
          title: courseName,
          category: 'Programming', // TODO: Add category selector in UI
          description: courseDescription || 'Course description',
          level: 'Beginner', // TODO: Add level selector in UI
          instructorId: user?.id || '550e8400-e29b-41d4-a716-446655440101', // Get from auth context
          instructorName: user?.name || 'Instructor', // Get from auth context
          modules: transformedModules,
          outcomes: [], // TODO: Add outcomes in UI
          requirements: [] // TODO: Add requirements in UI
        };

        const response = await apiService.post('/courses', courseData) as any;
        finalCourseId = response.data?.course?.id || response.data?.id || response.id;
        
        if (!finalCourseId) {
          throw new Error('Failed to get course ID from response');
        }
        
        setCurrentCourseId(finalCourseId);
        console.log('Course created with ID:', finalCourseId);
        
        // Update URL to reflect the new course ID (so subsequent saves use UPDATE)
        if (typeof window !== 'undefined') {
          window.history.replaceState(null, '', `/course-builder/${finalCourseId}`);
        }
        
      } else {
        console.log('Updating course with modules:', currentCourseId);
        
        // Backend updateCourse accepts full structure including modules
        // Use apiService.put directly to bypass type restrictions
        const updateData = {
          title: courseName,
          description: courseDescription,
          isPublished: courseStatus === 'published',
          modules: transformedModules
        };

        await apiService.put(`/courses/${currentCourseId}`, updateData);
        console.log('Course updated successfully');
      }

      // Show success modal
      showModal({
        title: 'Success!',
        message: currentCourseId && currentCourseId !== 'new' 
          ? 'Course updated successfully!' 
          : 'Course created successfully!',
        type: 'success',
        confirmText: 'OK',
        showCancel: false,
      });
      
      setHasUnsavedChanges(false); // Reset after successful save
      return { success: true, courseId: finalCourseId };
      
    } catch (error) {
      console.error('Error saving course:', error);
      
      // Show error modal
      showModal({
        title: 'Save Failed',
        message: error instanceof Error ? error.message : 'Failed to save course. Please try again.',
        type: 'error',
        confirmText: 'OK',
        showCancel: false,
      });
      
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    } finally {
      setIsSaving(false);
    }
  };

  // Update currentCourseId when courseId prop changes
  useEffect(() => {
    setCurrentCourseId(courseId);
  }, [courseId]);

  const value = {
    // Course state
    courseName,
    setCourseName,
    courseDescription,
    setCourseDescription,
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
    isSaving,
  };

  return (
    <CourseBuilderContext.Provider value={value}>
      {children}
    </CourseBuilderContext.Provider>
  );
};

// Custom hook to use the context
export const useCourseBuilder = () => {
  const context = useContext(CourseBuilderContext);
  if (context === undefined) {
    throw new Error('useCourseBuilder must be used within a CourseBuilderProvider');
  }
  return context;
};