import { useCourseBuilder, Module, Lesson, Quiz, Question } from './CourseBuilderContext';
import { useDragAndDrop } from './useDragAndDrop';

export const useContentManagement = () => {
  const {
    modules,
    setModules,
    showToast,
    setSelectedItem,
  } = useCourseBuilder();

  const { updateContentNumbering } = useDragAndDrop();

  // Module functions
  const addModule = () => {
    const moduleNumber = modules.length + 1;
    const newModuleId = `m${Date.now()}`;
    const newModule: Module = {
      id: newModuleId,
      title: `Module ${moduleNumber}: New Module`,
      description: "Add a description for this module...",
      status: "published",
      expanded: true,
      lessons: [],
      quizzes: [],
    };
    setModules([...modules, newModule]);
    
    // Auto-select the newly created module
    setSelectedItem({ type: 'module', id: newModuleId });
  };

  const deleteModule = (moduleId: string) => {
    let updatedModules = modules.filter((m) => m.id !== moduleId);
    updatedModules = modules.filter(m => m.id !== moduleId).map((module, index) => ({
      ...module,
      title: module.title.replace(/^Module \d+:/, `Module ${index + 1}:`),
    }));
    setModules(updatedModules);
  };

  const updateModule = (moduleId: string, updates: Partial<Module>) => {
    setModules(
      modules.map((m) =>
        m.id === moduleId ? { ...m, ...updates } : m
      )
    );
  };

  // Lesson functions
  const addLesson = (moduleId: string, lessonType: 'video' | 'pdf' = 'video') => {
    const newLessonId = `l${Date.now()}`;
    let updatedModules = modules.map((m) => {
      if (m.id === moduleId) {
        // Calculate next order based on max existing order value
        const allOrders = [
          ...m.lessons.map(l => l.order ?? 0),
          ...m.quizzes.map(q => q.order ?? 0)
        ];
        const maxOrder = allOrders.length > 0 ? Math.max(...allOrders) : -1;
        const nextOrder = maxOrder + 1;
        
        const newLesson: Lesson = {
          id: newLessonId,
          title: `New Lesson`, // Will be updated by numbering
          baseTitle: "New Lesson",
          type: lessonType,
          status: "draft",
          content: "",
          videoUrl: lessonType === 'video' ? "" : undefined,
          resourceUrl: lessonType === 'pdf' ? "" : undefined,
          isDownloadable: lessonType === 'pdf' ? true : undefined,
          order: nextOrder,
        } as Lesson;
        
        return {
          ...m,
          lessons: [...m.lessons, newLesson],
        };
      }
      return m;
    });
    
    // Update numbering after adding
    updatedModules = updateContentNumbering(updatedModules);
    setModules(updatedModules);
    
    // Auto-select the newly created lesson
    setSelectedItem({ type: 'lesson', id: newLessonId });
  };

  const deleteLesson = (moduleId: string, lessonId: string) => {
    // Clear selection if deleting the currently selected lesson
    setSelectedItem((current: any) => {
      if (current?.type === 'lesson' && current?.id === lessonId) {
        return null;
      }
      return current;
    });
    
    let updatedModules = modules.map((m) =>
      m.id === moduleId
        ? { ...m, lessons: m.lessons.filter((l) => l.id !== lessonId) }
        : m
    );
    updatedModules = updateContentNumbering(updatedModules);
    setModules(updatedModules);
  };

  const updateLesson = (moduleId: string, lessonId: string, updates: Partial<Lesson>) => {
    setModules((prevModules) => {
      let updatedModules = prevModules.map((m) =>
        m.id === moduleId
          ? {
              ...m,
              lessons: m.lessons.map((l) =>
                l.id === lessonId ? { ...l, ...updates } : l
              ),
            }
          : m
      );
      
      // If updating baseTitle, regenerate numbering
      if ('baseTitle' in updates) {
        updatedModules = updateContentNumbering(updatedModules);
      }
      
      return updatedModules;
    });
  };

  // Quiz functions
  const addQuiz = (moduleId: string) => {
    const newQuizId = `q${Date.now()}`;
    let updatedModules = modules.map((m) => {
      if (m.id === moduleId) {
        // Calculate next order based on max existing order value
        const allOrders = [
          ...m.lessons.map(l => l.order ?? 0),
          ...m.quizzes.map(q => q.order ?? 0)
        ];
        const maxOrder = allOrders.length > 0 ? Math.max(...allOrders) : -1;
        const nextOrder = maxOrder + 1;
        
        return {
          ...m,
          quizzes: [
            ...m.quizzes,
            {
              id: newQuizId,
              title: `New Quiz`, // Will be updated by numbering
              baseTitle: "New Quiz",
              status: "draft",
              passingScore: 70,
              maxAttempts: 1,
              order: nextOrder,
              questions: [
                {
                  id: `qq${Date.now()}`,
                  text: "New question",
                  type: "multiple-choice",
                  options: ["Option 1", "Option 2"],
                  correctAnswer: 0,
                  imageUrl: null,
                  points: 1,
                },
              ],
            },
          ],
        };
      }
      return m;
    });
    
    // Update numbering after adding
    updatedModules = updateContentNumbering(updatedModules);
    setModules(updatedModules);
    
    // Auto-select the newly created quiz
    setSelectedItem({ type: 'quiz', id: newQuizId });
  };

  const deleteQuiz = (moduleId: string, quizId: string) => {
    // Clear selection if deleting the currently selected quiz
    setSelectedItem((current: any) => {
      if (current?.type === 'quiz' && current?.id === quizId) {
        return null;
      }
      return current;
    });
    
    let updatedModules = modules.map((m) =>
      m.id === moduleId
        ? { ...m, quizzes: m.quizzes.filter((q) => q.id !== quizId) }
        : m
    );
    updatedModules = updateContentNumbering(updatedModules);
    setModules(updatedModules);
  };

  const updateQuiz = (moduleId: string, quizId: string, updates: Partial<Quiz>) => {
    let updatedModules = modules.map((m) =>
      m.id === moduleId
        ? {
            ...m,
            quizzes: m.quizzes.map((q) =>
              q.id === quizId ? { ...q, ...updates } : q
            ),
          }
        : m
    );
    
    // If updating baseTitle, regenerate numbering
    if ('baseTitle' in updates) {
      updatedModules = updateContentNumbering(updatedModules);
    }
    
    setModules(updatedModules);
  };

  // Question functions
  const addQuestion = (moduleId: string, quizId: string) => {
    setModules(
      modules.map((m) => {
        if (m.id === moduleId) {
          return {
            ...m,
            quizzes: m.quizzes.map((q) => {
              if (q.id === quizId) {
                return {
                  ...q,
                  questions: [
                    ...q.questions,
                    {
                      id: `qq${Date.now()}`,
                      text: "New question",
                      type: "multiple-choice",
                      options: ["Option 1", "Option 2"],
                      correctAnswer: 0,
                      imageUrl: null,
                      points: 1,
                    },
                  ],
                };
              }
              return q;
            }),
          };
        }
        return m;
      })
    );
  };

  const deleteQuestion = (moduleId: string, quizId: string, questionId: string) => {
    setModules(
      modules.map((m) => {
        if (m.id === moduleId) {
          return {
            ...m,
            quizzes: m.quizzes.map((q) => {
              if (q.id === quizId) {
                return {
                  ...q,
                  questions: q.questions.filter((qu) => qu.id !== questionId),
                };
              }
              return q;
            }),
          };
        }
        return m;
      })
    );
  };

  const updateQuestion = (moduleId: string, quizId: string, questionId: string, field: string, value: any) => {
    setModules(
      modules.map((m) => {
        if (m.id === moduleId) {
          return {
            ...m,
            quizzes: m.quizzes.map((q) => {
              if (q.id === quizId) {
                return {
                  ...q,
                  questions: q.questions.map((qu) =>
                    qu.id === questionId ? { ...qu, [field]: value } : qu
                  ),
                };
              }
              return q;
            }),
          };
        }
        return m;
      })
    );
  };

  const addOption = (moduleId: string, quizId: string, questionId: string) => {
    updateQuestion(moduleId, quizId, questionId, "options", [
      ...(modules.find(m => m.id === moduleId)?.quizzes.find(q => q.id === quizId)?.questions.find(qu => qu.id === questionId)?.options || []),
      "New option",
    ]);
  };

  const removeOption = (moduleId: string, quizId: string, questionId: string, index: number) => {
    const question = modules.find(m => m.id === moduleId)?.quizzes.find(q => q.id === quizId)?.questions.find(qu => qu.id === questionId);
    if (question) {
      updateQuestion(moduleId, quizId, questionId, "options", question.options.filter((_, i) => i !== index));
    }
  };

  return {
    // Module functions
    addModule,
    deleteModule,
    updateModule,
    
    // Lesson functions
    addLesson,
    deleteLesson,
    updateLesson,
    
    // Quiz functions
    addQuiz,
    deleteQuiz,
    updateQuiz,
    
    // Question functions
    addQuestion,
    deleteQuestion,
    updateQuestion,
    addOption,
    removeOption,
  };
};
