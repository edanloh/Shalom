import { useCourseBuilder, Module, Lesson, Quiz, Question } from './CourseBuilderContext';
import { useDragAndDrop } from './useDragAndDrop';

export const useContentManagement = () => {
  const {
    modules,
    setModules,
    showToast,
  } = useCourseBuilder();

  const { updateContentNumbering } = useDragAndDrop();

  // Module functions
  const addModule = () => {
    const moduleNumber = modules.length + 1;
    const newModule: Module = {
      id: `m${Date.now()}`,
      title: `Module ${moduleNumber}: New Module`,
      description: "Add a description for this module...",
      status: "draft",
      expanded: true,
      lessons: [],
      quizzes: [],
    };
    setModules([...modules, newModule]);
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
  const addLesson = (moduleId: string) => {
    let updatedModules = modules.map((m) => {
      if (m.id === moduleId) {
        return {
          ...m,
          lessons: [
            ...m.lessons,
            {
              id: `l${Date.now()}`,
              title: `New Lesson`, // Will be updated by numbering
              baseTitle: "New Lesson",
              type: "video",
              status: "draft",
              content: "",
              videoUrl: "",
            },
          ],
        };
      }
      return m;
    });
    
    // Update numbering after adding
    updatedModules = updateContentNumbering(updatedModules);
    setModules(updatedModules);
  };

  const deleteLesson = (moduleId: string, lessonId: string) => {
    let updatedModules = modules.map((m) =>
      m.id === moduleId
        ? { ...m, lessons: m.lessons.filter((l) => l.id !== lessonId) }
        : m
    );
    updatedModules = updateContentNumbering(updatedModules);
    setModules(updatedModules);
  };

  const updateLesson = (moduleId: string, lessonId: string, updates: Partial<Lesson>) => {
    let updatedModules = modules.map((m) =>
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
    
    setModules(updatedModules);
  };

  // Quiz functions
  const addQuiz = (moduleId: string) => {
    let updatedModules = modules.map((m) => {
      if (m.id === moduleId) {
        return {
          ...m,
          quizzes: [
            ...m.quizzes,
            {
              id: `q${Date.now()}`,
              title: `New Quiz`, // Will be updated by numbering
              baseTitle: "New Quiz",
              status: "draft",
              passingScore: 70,
              questions: [],
            },
          ],
        };
      }
      return m;
    });
    
    // Update numbering after adding
    updatedModules = updateContentNumbering(updatedModules);
    setModules(updatedModules);
  };

  const deleteQuiz = (moduleId: string, quizId: string) => {
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