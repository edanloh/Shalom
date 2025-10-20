import { useCourseBuilder, DraggedItem, Module } from './CourseBuilderContext';

export const useDragAndDrop = () => {
  const {
    modules,
    setModules,
    draggedItem,
    setDraggedItem,
    draggedOver,
    setDraggedOver,
    showToast,
  } = useCourseBuilder();

  // Update module numbering
  const updateModuleNumbering = (modulesList: Module[]) => {
    return modulesList.map((module, index) => ({
      ...module,
      title: module.title.replace(/^Module \d+:/, `Module ${index + 1}:`),
    }));
  };

  // Helper function to assign order values to all content in a module
  const assignOrderValues = (module: Module) => {
    // Combine all content and sort by current order (or fallback to type-based order)
    const allContent = [
      ...module.lessons.map(lesson => ({ ...lesson, itemType: 'lesson' as const })),
      ...module.quizzes.map(quiz => ({ ...quiz, itemType: 'quiz' as const }))
    ];
    
    // Sort by existing order, or fallback to lessons-first ordering
    allContent.sort((a, b) => {
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
      }
      if (a.itemType !== b.itemType) {
        return a.itemType === 'lesson' ? -1 : 1;
      }
      return 0;
    });
    
    // Assign new sequential order values
    allContent.forEach((item, index) => {
      item.order = index;
    });
    
    // Separate back into lessons and quizzes arrays
    const updatedLessons = allContent.filter(item => item.itemType === 'lesson').map(({ itemType, ...lesson }) => lesson);
    const updatedQuizzes = allContent.filter(item => item.itemType === 'quiz').map(({ itemType, ...quiz }) => quiz);
    
    return {
      ...module,
      lessons: updatedLessons,
      quizzes: updatedQuizzes
    };
  };

  // Helper function to insert item at specific order position
  const insertAtOrder = (module: Module, item: any, itemType: 'lesson' | 'quiz', targetOrder: number) => {
    // Get all content and sort by order
    let allContent = [
      ...module.lessons.map(lesson => ({ ...lesson, itemType: 'lesson' as const })),
      ...module.quizzes.map(quiz => ({ ...quiz, itemType: 'quiz' as const }))
    ];
    
    // Remove the item if it already exists (for moves within same module)
    allContent = allContent.filter(content => content.id !== item.id);
    
    // Add the new item with target order
    const newItem = { ...item, itemType, order: targetOrder };
    allContent.push(newItem);
    
    // Sort by order
    allContent.sort((a, b) => (a.order || 0) - (b.order || 0));
    
    // Reassign sequential order values
    allContent.forEach((content, index) => {
      content.order = index;
    });
    
    // Separate back into arrays
    const updatedLessons = allContent.filter(content => content.itemType === 'lesson').map(({ itemType, ...lesson }) => lesson);
    const updatedQuizzes = allContent.filter(content => content.itemType === 'quiz').map(({ itemType, ...quiz }) => quiz);
    
    return {
      ...module,
      lessons: updatedLessons,
      quizzes: updatedQuizzes
    };
  };

  // Update lesson and quiz numbering within modules
  const updateContentNumbering = (modulesList: Module[]) => {
    return modulesList.map((module, moduleIndex) => ({
      ...module,
      lessons: module.lessons.map((lesson, lessonIndex) => ({
        ...lesson,
        baseTitle: lesson.baseTitle || lesson.title.replace(/^Lesson \d+\.\d+:\s*/, ''),
        title: `Lesson ${moduleIndex + 1}.${lessonIndex + 1}: ${lesson.baseTitle || lesson.title.replace(/^Lesson \d+\.\d+:\s*/, '')}`,
      })),
      quizzes: module.quizzes.map((quiz, quizIndex) => ({
        ...quiz,
        baseTitle: quiz.baseTitle || quiz.title.replace(/^Quiz \d+\.\d+:\s*/, ''),
        title: `Quiz ${moduleIndex + 1}.${quizIndex + 1}: ${quiz.baseTitle || quiz.title.replace(/^Quiz \d+\.\d+:\s*/, '')}`,
      })),
    }));
  };

  const handleDragStart = (e: React.DragEvent, item: DraggedItem) => {
    console.log('Drag started:', item);
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", "");

    setTimeout(() => {
      document.body.classList.add("dragging");
    }, 10);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragEnter = (e: React.DragEvent, targetItem: DraggedItem) => {
    e.preventDefault();
    if (draggedItem && (draggedItem.id !== targetItem.id || draggedItem.type !== targetItem.type)) {
      setDraggedOver(targetItem);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDraggedOver(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetItem: DraggedItem) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedOver(null);
    document.body.classList.remove("dragging");

    if (!draggedItem) {
      setDraggedItem(null);
      return;
    }

    if (
      draggedItem.id === targetItem.id &&
      draggedItem.type === targetItem.type
    ) {
      setDraggedItem(null);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const mouseY = e.clientY;
    const itemCenter = rect.top + rect.height / 2;
    const dropBelow = mouseY > itemCenter;

    console.log('Drop operation:', {
      draggedItem,
      targetItem,
      dropBelow,
      draggedType: draggedItem.type,
      targetType: targetItem.type,
    });

    let updatedModules = [...modules];
    let moveSuccessful = false;

    // Handle module reordering
    if (draggedItem.type === "module" && targetItem.type === "module") {
      const draggedIndex = modules.findIndex((m) => m.id === draggedItem.id);
      const targetIndex = modules.findIndex((m) => m.id === targetItem.id);

      if (
        draggedIndex !== -1 &&
        targetIndex !== -1 &&
        draggedIndex !== targetIndex
      ) {
        const [draggedModule] = updatedModules.splice(draggedIndex, 1);

        let insertIndex = targetIndex;
        if (dropBelow) {
          insertIndex =
            draggedIndex < targetIndex ? targetIndex : targetIndex + 1;
        } else {
          insertIndex =
            draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
        }

        updatedModules.splice(insertIndex, 0, draggedModule);
        updatedModules = updateModuleNumbering(updatedModules);
        moveSuccessful = true;
      }
    }

    // Handle lesson operations
    else if (draggedItem.type === "lesson") {
      const sourceModule = modules.find((m) =>
        m.lessons.some((l) => l.id === draggedItem.id)
      );

      if (sourceModule) {
        const draggedLesson = sourceModule.lessons.find(
          (l) => l.id === draggedItem.id
        );
        const sourceIndex = sourceModule.lessons.findIndex(
          (l) => l.id === draggedItem.id
        );

        // Dropping on a lesson
        if (targetItem.type === "lesson") {
          const targetModule = modules.find((m) =>
            m.lessons.some((l) => l.id === targetItem.id)
          );

          if (targetModule) {
            const targetIndex = targetModule.lessons.findIndex(
              (l) => l.id === targetItem.id
            );

            if (sourceModule.id === targetModule.id) {
              // Same module - reorder within module using order-based positioning
              if (sourceIndex !== targetIndex) {
                const targetLesson = targetModule.lessons.find(l => l.id === targetItem.id);
                if (targetLesson) {
                  const targetOrder = targetLesson.order || 0;
                  const insertOrder = dropBelow ? targetOrder + 0.5 : targetOrder - 0.5;
                  const updatedLesson = { ...draggedLesson, order: insertOrder };

                  updatedModules = modules.map((m) => {
                    if (m.id === sourceModule.id) {
                      const filteredLessons = m.lessons.filter(l => l.id !== draggedItem.id);
                      return { 
                        ...m, 
                        lessons: [...filteredLessons, updatedLesson]
                      };
                    }
                    return m;
                  });

                  // Reassign order values to maintain proper sequence
                  updatedModules = updatedModules.map(m => 
                    m.id === sourceModule.id ? assignOrderValues(m) : m
                  );
                  moveSuccessful = true;
                }
              }
            } else {
              // Different modules - move between modules using order-based positioning
              const targetLesson = targetModule.lessons.find(l => l.id === targetItem.id);
              if (targetLesson) {
                const targetOrder = targetLesson.order || 0;
                const insertOrder = dropBelow ? targetOrder + 0.5 : targetOrder - 0.5;
                const updatedLesson = { ...draggedLesson, order: insertOrder };

                updatedModules = modules.map((m) => {
                  if (m.id === sourceModule.id) {
                    return {
                      ...m,
                      lessons: m.lessons.filter((l) => l.id !== draggedItem.id),
                    };
                  }
                  if (m.id === targetModule.id) {
                    return { ...m, lessons: [...m.lessons, updatedLesson] };
                  }
                  return m;
                });

                // Reassign order values to maintain proper sequence for target module
                updatedModules = updatedModules.map(m => 
                  m.id === targetModule.id ? assignOrderValues(m) : m
                );
                moveSuccessful = true;
              }
            }
          }
        }
        // Dropping lesson on a quiz - insert at relative position using order
        else if (targetItem.type === "quiz") {
          const targetModule = modules.find((m) =>
            m.quizzes.some((q) => q.id === targetItem.id)
          );

          if (targetModule) {
            const targetQuiz = targetModule.quizzes.find(q => q.id === targetItem.id);
            if (targetQuiz) {
              // Calculate target order based on quiz position
              const targetOrder = targetQuiz.order || 0;
              const insertOrder = dropBelow ? targetOrder + 0.5 : targetOrder - 0.5;

              // Update the lesson with new order
              const updatedLesson = { ...draggedLesson, order: insertOrder };

              updatedModules = modules.map((m) => {
                if (m.id === sourceModule.id) {
                  // Remove lesson from source module
                  const filteredLessons = m.lessons.filter((l) => l.id !== draggedItem.id);
                  
                  if (m.id === targetModule.id) {
                    // Same module - add lesson with new order
                    return { ...m, lessons: [...filteredLessons, updatedLesson] };
                  } else {
                    // Different module - just remove from source
                    return { ...m, lessons: filteredLessons };
                  }
                }
                if (m.id === targetModule.id && m.id !== sourceModule.id) {
                  // Different module - add lesson with new order
                  return { ...m, lessons: [...m.lessons, updatedLesson] };
                }
                return m;
              });

              // Reassign order values to maintain proper sequence for target module
              if (targetModule) {
                updatedModules = updatedModules.map(m => 
                  m.id === targetModule.id ? assignOrderValues(m) : m
                );
              }
              moveSuccessful = true;
            }
          }
        }
        // Dropping on a module
        else if (targetItem.type === "module") {
          updatedModules = modules.map((m) => {
            if (m.id === sourceModule.id && m.id !== targetItem.id) {
              return {
                ...m,
                lessons: m.lessons.filter((l) => l.id !== draggedItem.id),
              };
            }
            if (m.id === targetItem.id) {
              return { ...m, lessons: [...(m.lessons || []), draggedLesson] };
            }
            return m;
          });
          moveSuccessful = true;
        }

        if (moveSuccessful) {
          updatedModules = updateContentNumbering(updatedModules);
        }
      }
    }

    // Handle quiz operations
    else if (draggedItem.type === "quiz") {
      const sourceModule = modules.find((m) =>
        m.quizzes.some((q) => q.id === draggedItem.id)
      );

      if (sourceModule) {
        const draggedQuiz = sourceModule.quizzes.find(
          (q) => q.id === draggedItem.id
        );
        const sourceIndex = sourceModule.quizzes.findIndex(
          (q) => q.id === draggedItem.id
        );

        // Dropping on a quiz
        if (targetItem.type === "quiz") {
          const targetModule = modules.find((m) =>
            m.quizzes.some((q) => q.id === targetItem.id)
          );

          if (targetModule) {
            const targetIndex = targetModule.quizzes.findIndex(
              (q) => q.id === targetItem.id
            );

            if (sourceModule.id === targetModule.id) {
              // Same module - reorder within module using order-based positioning
              if (sourceIndex !== targetIndex) {
                const targetQuiz = targetModule.quizzes.find(q => q.id === targetItem.id);
                if (targetQuiz) {
                  const targetOrder = targetQuiz.order || 0;
                  const insertOrder = dropBelow ? targetOrder + 0.5 : targetOrder - 0.5;
                  const updatedQuiz = { ...draggedQuiz, order: insertOrder };

                  updatedModules = modules.map((m) => {
                    if (m.id === sourceModule.id) {
                      const filteredQuizzes = m.quizzes.filter(q => q.id !== draggedItem.id);
                      return { 
                        ...m, 
                        quizzes: [...filteredQuizzes, updatedQuiz]
                      };
                    }
                    return m;
                  });

                  // Reassign order values to maintain proper sequence
                  updatedModules = updatedModules.map(m => 
                    m.id === sourceModule.id ? assignOrderValues(m) : m
                  );
                  moveSuccessful = true;
                }
              }
            } else {
              // Different modules - move between modules using order-based positioning
              const targetQuiz = targetModule.quizzes.find(q => q.id === targetItem.id);
              if (targetQuiz) {
                const targetOrder = targetQuiz.order || 0;
                const insertOrder = dropBelow ? targetOrder + 0.5 : targetOrder - 0.5;
                const updatedQuiz = { ...draggedQuiz, order: insertOrder };

                updatedModules = modules.map((m) => {
                  if (m.id === sourceModule.id) {
                    return {
                      ...m,
                      quizzes: m.quizzes.filter((q) => q.id !== draggedItem.id),
                    };
                  }
                  if (m.id === targetModule.id) {
                    return { ...m, quizzes: [...m.quizzes, updatedQuiz] };
                  }
                  return m;
                });

                // Reassign order values to maintain proper sequence for target module
                updatedModules = updatedModules.map(m => 
                  m.id === targetModule.id ? assignOrderValues(m) : m
                );
                moveSuccessful = true;
              }
            }
          }
        }
        // Dropping quiz on a lesson - insert at relative position using order
        else if (targetItem.type === "lesson") {
          const targetModule = modules.find((m) =>
            m.lessons.some((l) => l.id === targetItem.id)
          );

          if (targetModule) {
            const targetLesson = targetModule.lessons.find(l => l.id === targetItem.id);
            if (targetLesson) {
              // Calculate target order based on lesson position
              const targetOrder = targetLesson.order || 0;
              const insertOrder = dropBelow ? targetOrder + 0.5 : targetOrder - 0.5;

              // Update the quiz with new order
              const updatedQuiz = { ...draggedQuiz, order: insertOrder };

              updatedModules = modules.map((m) => {
                if (m.id === sourceModule.id) {
                  // Remove quiz from source module
                  const filteredQuizzes = m.quizzes.filter((q) => q.id !== draggedItem.id);
                  
                  if (m.id === targetModule.id) {
                    // Same module - add quiz with new order
                    return { ...m, quizzes: [...filteredQuizzes, updatedQuiz] };
                  } else {
                    // Different module - just remove from source
                    return { ...m, quizzes: filteredQuizzes };
                  }
                }
                if (m.id === targetModule.id && m.id !== sourceModule.id) {
                  // Different module - add quiz with new order
                  return { ...m, quizzes: [...m.quizzes, updatedQuiz] };
                }
                return m;
              });

              // Reassign order values to maintain proper sequence for target module
              if (targetModule) {
                updatedModules = updatedModules.map(m => 
                  m.id === targetModule.id ? assignOrderValues(m) : m
                );
              }
              moveSuccessful = true;
            }
          }
        }
        // Dropping on a module
        else if (targetItem.type === "module") {
          updatedModules = modules.map((m) => {
            if (m.id === sourceModule.id && m.id !== targetItem.id) {
              return {
                ...m,
                quizzes: m.quizzes.filter((q) => q.id !== draggedItem.id),
              };
            }
            if (m.id === targetItem.id) {
              return { ...m, quizzes: [...(m.quizzes || []), draggedQuiz] };
            }
            return m;
          });
          moveSuccessful = true;
        }

        if (moveSuccessful) {
          updatedModules = updateContentNumbering(updatedModules);
        }
      }
    }

    if (moveSuccessful) {
      console.log('Move successful, checking for duplicates...');
      const itemCounts = new Map();
      updatedModules.forEach(module => {
        module.lessons.forEach(lesson => {
          const key = `lesson-${lesson.id}`;
          itemCounts.set(key, (itemCounts.get(key) || 0) + 1);
        });
        module.quizzes.forEach(quiz => {
          const key = `quiz-${quiz.id}`;
          itemCounts.set(key, (itemCounts.get(key) || 0) + 1);
        });
      });

      console.log('Item counts:', Object.fromEntries(itemCounts));
      const hasDuplicates = Array.from(itemCounts.values()).some(count => count > 1);

      if (!hasDuplicates) {
        setModules(updatedModules);
        // showToast(
        //   `${
        //     draggedItem.type.charAt(0).toUpperCase() + draggedItem.type.slice(1)
        //   } moved successfully`
        // );
      } else {
        console.error("Duplicate items detected, move cancelled");
        // showToast("Move failed - duplicate items detected", "error");
      }
    }

    setDraggedItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDraggedOver(null);
    document.body.classList.remove("dragging");
  };

  return {
    draggedItem,
    draggedOver,
    handleDragStart,
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
    updateContentNumbering,
    updateModuleNumbering,
  };
};