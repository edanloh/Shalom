import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDragAndDrop } from './useDragAndDrop';

const mockUseCourseBuilder = vi.fn();

vi.mock('./useCourseBuilder', () => ({
  useCourseBuilder: () => mockUseCourseBuilder(),
}));

describe('useDragAndDrop', () => {
  const setModules = vi.fn();
  const setDraggedItem = vi.fn();
  const setDraggedOver = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCourseBuilder.mockReturnValue({
      modules: [],
      setModules,
      draggedItem: null,
      setDraggedItem,
      draggedOver: null,
      setDraggedOver,
      showToast: vi.fn(),
    });
  });

  it('renumbers lesson and quiz titles in updateContentNumbering', () => {
    const { result } = renderHook(() => useDragAndDrop());

    const output = result.current.updateContentNumbering([
      {
        id: 'm1',
        title: 'Module 1: Intro',
        lessons: [{ id: 'l1', title: 'Something', baseTitle: 'Alpha' }],
        quizzes: [{ id: 'q1', title: 'Something else', baseTitle: 'Beta' }],
      } as any,
    ]);

    expect(output[0].lessons[0].title).toBe('Lesson 1.1: Alpha');
    expect(output[0].quizzes[0].title).toBe('Quiz 1.1: Beta');
  });

  it('handleDragStart sets dragged item and body class eventually', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useDragAndDrop());

    const dataTransfer = {
      effectAllowed: '',
      setData: vi.fn(),
    } as any;

    result.current.handleDragStart(
      { dataTransfer } as any,
      { type: 'module', id: 'm1' } as any,
    );

    expect(setDraggedItem).toHaveBeenCalledWith({ type: 'module', id: 'm1' });
    vi.runAllTimers();
    expect(document.body.classList.contains('dragging')).toBe(true);
    vi.useRealTimers();
  });
});
