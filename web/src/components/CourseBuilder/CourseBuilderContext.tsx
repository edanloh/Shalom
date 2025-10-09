import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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

// Context Interface
interface CourseBuilderContextType {
  // Course state
  courseName: string;
  setCourseName: (name: string) => void;
  courseStatus: string;
  setCourseStatus: (status: string) => void;
  modules: Module[];
  setModules: (modules: Module[]) => void;
  
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
  
  // Drag and drop state
  draggedItem: DraggedItem | null;
  setDraggedItem: (item: DraggedItem | null) => void;
  draggedOver: DraggedItem | null;
  setDraggedOver: (item: DraggedItem | null) => void;
  
  // Utility functions
  showToast: (msg: string, type?: 'success' | 'error') => void;
  toggleModuleExpansion: (moduleId: string) => void;
}

// Create Context
const CourseBuilderContext = createContext<CourseBuilderContextType | undefined>(undefined);

// Provider Component
interface CourseBuilderProviderProps {
  children: ReactNode;
}

export const CourseBuilderProvider = ({ children }: CourseBuilderProviderProps) => {
  // Course state
  const [courseName, setCourseName] = useState("Data Science Fundamentals");
  const [courseStatus, setCourseStatus] = useState("draft");
  const [modules, setModules] = useState<Module[]>([
    {
      id: "m1",
      title: "Module 1: Introduction to Data Science",
      description: "Learn the fundamentals of data science and explore key concepts",
      status: "published",
      expanded: true,
      lessons: [
        {
          id: "l1",
          title: "Lesson 1.1: A",
          baseTitle: "A",
          type: "video",
          status: "published",
          content: "Lesson A content...",
          videoUrl: "https://example.com/video1.mp4",
        },
        {
          id: "l2",
          title: "Lesson 1.2: B",
          baseTitle: "B",
          type: "video",
          status: "draft",
          content: "Lesson B content...",
          videoUrl: "",
        },
      ],
      quizzes: [
        {
          id: "q1",
          title: "Quiz 1.1: Quiz 1",
          baseTitle: "Quiz 1",
          status: "published",
          passingScore: 70,
          questions: [
            {
              id: "qq1",
              text: "What is Data Science?",
              type: "multiple-choice",
              options: [
                "Computer Science",
                "Statistics",
                "Data + Science",
                "All of above",
              ],
              correctAnswer: 3,
              imageUrl: null,
              points: 2,
            },
          ],
        },
      ],
    },
    {
      id: "m2",
      title: "Module 2: Data Collection & Preprocessing",
      description: "Master data collection techniques and cleaning methods",
      status: "draft",
      expanded: true,
      lessons: [
        {
          id: "l3",
          title: "Lesson 2.1: C",
          baseTitle: "C",
          type: "video",
          status: "draft",
          content: "Lesson C content...",
          videoUrl: "",
        },
      ],
      quizzes: [],
    },
  ]);

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
  
  // Drag and drop state
  const [draggedItem, setDraggedItem] = useState<DraggedItem | null>(null);
  const [draggedOver, setDraggedOver] = useState<DraggedItem | null>(null);
  
  // Utility functions
  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };
  
  const toggleModuleExpansion = (moduleId: string) => {
    setModules(modules.map(m => 
      m.id === moduleId ? { ...m, expanded: !m.expanded } : m
    ));
  };

  const value = {
    // Course state
    courseName,
    setCourseName,
    courseStatus,
    setCourseStatus,
    modules,
    setModules,
    
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
    
    // Drag and drop state
    draggedItem,
    setDraggedItem,
    draggedOver,
    setDraggedOver,
    
    // Utility functions
    showToast,
    toggleModuleExpansion,
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