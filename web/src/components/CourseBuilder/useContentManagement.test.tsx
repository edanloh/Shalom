import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useContentManagement } from './useContentManagement';

const mockUseCourseBuilder = vi.fn();
const mockUseDragAndDrop = vi.fn();

vi.mock('./useCourseBuilder', () => ({
  useCourseBuilder: () => mockUseCourseBuilder(),
}));

vi.mock('./useDragAndDrop', () => ({
  useDragAndDrop: () => mockUseDragAndDrop(),
}));

describe('useContentManagement', () => {
  const setModules = vi.fn();
  const setSelectedItem = vi.fn();
  const showToast = vi.fn();
  const updateContentNumbering = vi.fn((value) => value);

  const baseModules = [
    {
      id: 'm1',
      title: 'Module 1: Intro',
      description: '',
      status: 'published',
      expanded: true,
      lessons: [
        {
          id: 'l1',
          title: 'Lesson 1.1: Intro Video',
          baseTitle: 'Intro Video',
          type: 'video',
          status: 'draft',
          content: '',
          videoUrl: '',
          order: 0,
        },
      ],
      quizzes: [
        {
          id: 'q1',
          title: 'Quiz 1.1: Quick Quiz',
          baseTitle: 'Quick Quiz',
          status: 'draft',
          passingScore: 70,
          questions: [
            {
              id: 'qq1',
              text: 'Q1',
              type: 'multiple-choice',
              options: ['A', 'B', 'C'],
              correctAnswer: 2,
              imageUrl: null,
              points: 1,
            },
          ],
          order: 1,
        },
      ],
    },
    {
      id: 'm2',
      title: 'Module 2: Advanced',
      description: '',
      status: 'published',
      expanded: true,
      lessons: [],
      quizzes: [],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseDragAndDrop.mockReturnValue({
      updateContentNumbering,
    });

    mockUseCourseBuilder.mockReturnValue({
      modules: structuredClone(baseModules),
      setModules,
      showToast,
      setSelectedItem,
    });
  });

  it('addModule appends a module and selects it', () => {
    vi.spyOn(Date, 'now').mockReturnValue(12345);

    const { result } = renderHook(() => useContentManagement());

    result.current.addModule();

    expect(setModules).toHaveBeenCalledTimes(1);
    const nextModules = setModules.mock.calls[0][0];
    expect(nextModules).toHaveLength(3);
    expect(nextModules[2]).toMatchObject({
      id: 'm12345',
      title: 'Module 3: ',
      lessons: [],
      quizzes: [],
    });
    expect(setSelectedItem).toHaveBeenCalledWith({
      type: 'module',
      id: 'm12345',
    });
  });

  it('deleteModule renumbers remaining module titles', () => {
    const { result } = renderHook(() => useContentManagement());

    result.current.deleteModule('m1');

    expect(setModules).toHaveBeenCalledTimes(1);
    const nextModules = setModules.mock.calls[0][0];
    expect(nextModules).toHaveLength(1);
    expect(nextModules[0].id).toBe('m2');
    expect(nextModules[0].title).toBe('Module 1: Advanced');
  });

  it('addLesson normalizes document subtype and marks selected lesson', () => {
    vi.spyOn(Date, 'now').mockReturnValue(999);

    const { result } = renderHook(() => useContentManagement());

    result.current.addLesson('m1', 'pdf');

    expect(updateContentNumbering).toHaveBeenCalledTimes(1);
    const numberedModules = setModules.mock.calls[0][0];
    const changedModule = numberedModules.find((m: any) => m.id === 'm1');
    const addedLesson = changedModule.lessons.find((l: any) => l.id === 'l999');

    expect(addedLesson).toMatchObject({
      type: 'document',
      resourceType: 'pdf',
      resourceUrl: '',
      isDownloadable: true,
    });
    expect(setSelectedItem).toHaveBeenCalledWith({
      type: 'lesson',
      id: 'l999',
    });
  });

  it('updateLesson uses updater function and can re-number when baseTitle changes', () => {
    const { result } = renderHook(() => useContentManagement());

    result.current.updateLesson('m1', 'l1', { baseTitle: 'Updated title' });

    expect(setModules).toHaveBeenCalledTimes(1);
    const updater = setModules.mock.calls[0][0];
    expect(typeof updater).toBe('function');

    const updated = updater(structuredClone(baseModules));
    const lesson = updated[0].lessons.find((l: any) => l.id === 'l1');
    expect(lesson.baseTitle).toBe('Updated title');
    expect(updateContentNumbering).toHaveBeenCalledTimes(1);
  });

  it('removeOption adjusts single correctAnswer index when option before it is removed', () => {
    const { result } = renderHook(() => useContentManagement());

    result.current.removeOption('m1', 'q1', 'qq1', 1);

    expect(setModules).toHaveBeenCalledTimes(1);
    const updated = setModules.mock.calls[0][0];
    const question = updated[0].quizzes[0].questions[0];

    expect(question.options).toEqual(['A', 'C']);
    expect(question.correctAnswer).toBe(1);
  });
});
