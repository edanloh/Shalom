import { type Module, type Lesson, type Quiz, type Question } from './CourseBuilderContext';
import { useCourseBuilder } from './useCourseBuilder';
import { useDragAndDrop } from './useDragAndDrop';

export const useContentManagement = () => {
  const {
    modules,
    setModules,
    setHasUnsavedChanges,
    showToast,
    setSelectedItem,
  } = useCourseBuilder();

  const { updateContentNumbering } = useDragAndDrop();
  const markUnsaved = () => setHasUnsavedChanges(true);

  // Module functions
  const addModule = () => {
    const moduleNumber = modules.length + 1;
    const newModuleId = `m${Date.now()}`;
    const newModule: Module = {
      id: newModuleId,
      title: `Module ${moduleNumber}: `,
      description: "",
      status: "published",
      expanded: true,
      lessons: [],
      quizzes: [],
    };
    setModules([...modules, newModule]);
    markUnsaved();
    
    // Auto-select the newly created module
    setSelectedItem({ type: 'module', id: newModuleId });
  };

  const deleteModule = (moduleId: string) => {
    // Clear selection if deleting the currently selected module or its children
    setSelectedItem((current: any) => {
      if (!current) return current;
      if (current.type === "module" && current.id === moduleId) {
        return null;
      }
      if (current.type === "lesson" || current.type === "quiz") {
        const module = modules.find((m) => m.id === moduleId);
        if (!module) return current;
        const isChild =
          module.lessons.some((l) => l.id === current.id) ||
          module.quizzes.some((q) => q.id === current.id);
        return isChild ? null : current;
      }
      return current;
    });

    let updatedModules = modules.filter((m) => m.id !== moduleId);
    updatedModules = modules.filter(m => m.id !== moduleId).map((module, index) => ({
      ...module,
      title: module.title.replace(/^Module \d+:/, `Module ${index + 1}:`),
    }));
    setModules(updatedModules);
    markUnsaved();
  };

  const updateModule = (moduleId: string, updates: Partial<Module>) => {
    setModules(
      modules.map((m) =>
        m.id === moduleId ? { ...m, ...updates } : m
      )
    );
    markUnsaved();
  };

  // Lesson functions
  const addLesson = (moduleId: string, lessonType: 'video' | 'pdf' | 'document' | 'slides' = 'video') => {
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
        
        // Normalize type: pdf/slides/document all become 'document' type
        const normalizedType = lessonType === 'video' ? 'video' : 'document';
        // Store the specific subtype in resourceType
        const resourceSubType = lessonType === 'video' ? undefined : (lessonType === 'pdf' ? 'pdf' : lessonType);
        
        const newLesson: Lesson = {
          id: newLessonId,
          title: "",
          baseTitle: "",
          type: normalizedType,
          status: "draft",
          content: "",
          videoUrl: lessonType === 'video' ? "" : undefined,
          resourceUrl: lessonType !== 'video' ? "" : undefined,
          resourceType: resourceSubType,
          isDownloadable: lessonType !== 'video' ? true : undefined,
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
    markUnsaved();
    
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
    markUnsaved();
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
    markUnsaved();
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
              title: "",
              baseTitle: "",
              status: "draft",
              passingScore: 70,
              maxAttempts: 1,
              order: nextOrder,
              questions: [
                {
                  id: `qq${Date.now()}`,
                  text: "",
                  type: "multiple-choice",
                  options: ["", ""],
                  correctAnswer: null,
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
    markUnsaved();
    
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
    markUnsaved();
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
    markUnsaved();
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
                      text: "",
                      type: "multiple-choice",
                      options: ["", ""],
                      correctAnswer: null,
                      imageUrl: null,
                      points: 1,
                      matchingPairs: [],
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
    markUnsaved();
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
    markUnsaved();
  };

  const updateQuestion = (moduleId: string, quizId: string, questionId: string, field: string, value: any) => {
    setModules((prevModules) =>
      prevModules.map((m) => {
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
      }),
    );
    markUnsaved();
  };

  const addOption = (moduleId: string, quizId: string, questionId: string) => {
    setModules((prevModules) =>
      prevModules.map((m) => {
        if (m.id !== moduleId) return m;
        return {
          ...m,
          quizzes: m.quizzes.map((q) => {
            if (q.id !== quizId) return q;
            return {
              ...q,
              questions: q.questions.map((qu) => {
                if (qu.id !== questionId) return qu;
                return {
                  ...qu,
                  options: [...(qu.options || []), "New option"],
                };
              }),
            };
          }),
        };
      }),
    );
    markUnsaved();
  };

  const removeOption = (moduleId: string, quizId: string, questionId: string, index: number) => {
    setModules((prevModules) =>
      prevModules.map((m) => {
        if (m.id !== moduleId) return m;
        return {
          ...m,
          quizzes: m.quizzes.map((q) => {
            if (q.id !== quizId) return q;
            return {
              ...q,
              questions: q.questions.map((qu) => {
                if (qu.id !== questionId) return qu;

                const newOptions = (qu.options || []).filter((_, i) => i !== index);
                let newCorrectAnswer: any = qu.correctAnswer;

                if (qu.type === "multiple-choice" || qu.type === "true-false") {
                  if (typeof newCorrectAnswer === "number") {
                    if (index < newCorrectAnswer) {
                      newCorrectAnswer = newCorrectAnswer - 1;
                    } else if (index === newCorrectAnswer) {
                      newCorrectAnswer = null;
                    }
                  }
                } else if (qu.type === "multiple-correct" && Array.isArray(newCorrectAnswer)) {
                  newCorrectAnswer = newCorrectAnswer
                    .map((ansIdx: number) => {
                      if (index < ansIdx) return ansIdx - 1;
                      if (index === ansIdx) return -1;
                      return ansIdx;
                    })
                    .filter((idx: number) => idx >= 0);
                }

                return { ...qu, options: newOptions, correctAnswer: newCorrectAnswer };
              }),
            };
          }),
        };
      }),
    );
    markUnsaved();
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
