import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CourseBuilderLayout } from './CourseBuilderLayout';

const mockUseCourseBuilder = vi.fn();

vi.mock('./useCourseBuilder', () => ({
  useCourseBuilder: () => mockUseCourseBuilder(),
}));

describe('CourseBuilderLayout', () => {
  const setIsResizing = vi.fn();
  const setSidebarWidth = vi.fn();
  const setRightSidebarWidth = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCourseBuilder.mockReturnValue({
      toast: null,
      sidebarWidth: 25,
      rightSidebarWidth: 25,
      isResizing: null,
      setIsResizing,
      setSidebarWidth,
      setRightSidebarWidth,
    });
  });

  it('renders children', () => {
    render(
      <CourseBuilderLayout>
        <div>Child content</div>
      </CourseBuilderLayout>,
    );

    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('renders success toast when available', () => {
    mockUseCourseBuilder.mockReturnValue({
      toast: { msg: 'Saved', type: 'success' },
      sidebarWidth: 25,
      rightSidebarWidth: 25,
      isResizing: null,
      setIsResizing,
      setSidebarWidth,
      setRightSidebarWidth,
    });

    render(
      <CourseBuilderLayout>
        <div>Child content</div>
      </CourseBuilderLayout>,
    );

    const toast = screen.getByText('Saved');
    expect(toast).toBeInTheDocument();
    expect(toast).toHaveClass('bg-green-600');
  });

  it('updates left sidebar width on mouse move while resizing left', () => {
    mockUseCourseBuilder.mockReturnValue({
      toast: null,
      sidebarWidth: 25,
      rightSidebarWidth: 25,
      isResizing: 'left',
      setIsResizing,
      setSidebarWidth,
      setRightSidebarWidth,
    });

    render(
      <CourseBuilderLayout>
        <div>Child content</div>
      </CourseBuilderLayout>,
    );

    const event = new MouseEvent('mousemove', {
      clientX: window.innerWidth * 0.2,
    });
    document.dispatchEvent(event);

    expect(setSidebarWidth).toHaveBeenCalledWith(20);
  });

  it('updates right sidebar width on mouse move while resizing right', () => {
    mockUseCourseBuilder.mockReturnValue({
      toast: null,
      sidebarWidth: 25,
      rightSidebarWidth: 25,
      isResizing: 'right',
      setIsResizing,
      setSidebarWidth,
      setRightSidebarWidth,
    });

    render(
      <CourseBuilderLayout>
        <div>Child content</div>
      </CourseBuilderLayout>,
    );

    const event = new MouseEvent('mousemove', {
      clientX: window.innerWidth * 0.75,
    });
    document.dispatchEvent(event);

    expect(setRightSidebarWidth).toHaveBeenCalledWith(25);
  });

  it('stops resizing on mouse up', () => {
    mockUseCourseBuilder.mockReturnValue({
      toast: null,
      sidebarWidth: 25,
      rightSidebarWidth: 25,
      isResizing: 'left',
      setIsResizing,
      setSidebarWidth,
      setRightSidebarWidth,
    });

    render(
      <CourseBuilderLayout>
        <div>Child content</div>
      </CourseBuilderLayout>,
    );

    document.dispatchEvent(new MouseEvent('mouseup'));

    expect(setIsResizing).toHaveBeenCalledWith(null);
  });
});
