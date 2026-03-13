import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { LeftSidebar } from './LeftSidebar';

const mockUseCourseBuilder = vi.fn();
const mockUseDragAndDrop = vi.fn();
const mockUseContentManagement = vi.fn();

vi.mock('./useCourseBuilder', () => ({
  useCourseBuilder: () => mockUseCourseBuilder(),
}));

vi.mock('./useDragAndDrop', () => ({
  useDragAndDrop: () => mockUseDragAndDrop(),
}));

vi.mock('./useContentManagement', () => ({
  useContentManagement: () => mockUseContentManagement(),
}));

describe('LeftSidebar', () => {
  const setSelectedItem = vi.fn();
  const setSidebarWidth = vi.fn();
  const setIsResizing = vi.fn();
  const toggleModuleExpansion = vi.fn();

  const addModule = vi.fn();
  const deleteModule = vi.fn();
  const addLesson = vi.fn();
  const deleteLesson = vi.fn();
  const addQuiz = vi.fn();
  const deleteQuiz = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseDragAndDrop.mockReturnValue({
      draggedItem: null,
      draggedOver: null,
      handleDragStart: vi.fn(),
      handleDragOver: vi.fn(),
      handleDragEnter: vi.fn(),
      handleDragLeave: vi.fn(),
      handleDrop: vi.fn(),
      handleDragEnd: vi.fn(),
    });

    mockUseContentManagement.mockReturnValue({
      addModule,
      deleteModule,
      addLesson,
      deleteLesson,
      addQuiz,
      deleteQuiz,
    });

    mockUseCourseBuilder.mockReturnValue({
      modules: [
        {
          id: 'm1',
          title: 'Module 1: Intro',
          expanded: true,
          lessons: [{ id: 'l1', title: 'Lesson 1.1: Video', type: 'video' }],
          quizzes: [{ id: 'q1', title: 'Quiz 1.1: Basics' }],
        },
      ],
      selectedItem: null,
      setSelectedItem,
      sidebarWidth: 30,
      setSidebarWidth,
      isResizing: null,
      setIsResizing,
      toggleModuleExpansion,
    });
  });

  it('renders module content and add button', () => {
    render(<LeftSidebar />);

    expect(screen.getByText('Course Content')).toBeInTheDocument();
    expect(screen.getByText('Module 1: Intro')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Add New Module' }),
    ).toBeInTheDocument();
  });

  it('calls addModule when add button is clicked', () => {
    render(<LeftSidebar />);

    fireEvent.click(screen.getByRole('button', { name: 'Add New Module' }));

    expect(addModule).toHaveBeenCalledTimes(1);
  });

  it('calls module action handlers for quick add buttons', () => {
    render(<LeftSidebar />);

    fireEvent.click(screen.getByRole('button', { name: '+ Video' }));
    expect(setSelectedItem).toHaveBeenCalledWith({ type: 'module', id: 'm1' });
    expect(addLesson).toHaveBeenCalledWith('m1', 'video');

    fireEvent.click(screen.getByRole('button', { name: '+ Quiz' }));
    expect(addQuiz).toHaveBeenCalledWith('m1');
  });

  it('starts resizing on handle mousedown', () => {
    const { container } = render(<LeftSidebar />);

    const resizeHandle = container.querySelector(
      '.cursor-col-resize',
    ) as HTMLElement;
    fireEvent.mouseDown(resizeHandle);

    expect(setIsResizing).toHaveBeenCalledWith('left');
  });
});
