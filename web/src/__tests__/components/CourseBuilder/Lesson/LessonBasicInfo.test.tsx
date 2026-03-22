import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { LessonBasicInfo } from '@/components/CourseBuilder/Lesson/LessonBasicInfo';

describe('LessonBasicInfo', () => {
  const updateLesson = vi.fn();

  it('renders lesson title and description', () => {
    render(
      <LessonBasicInfo
        lesson={{ id: 'l1', baseTitle: 'Title', content: 'Desc' }}
        moduleId="m1"
        updateLesson={updateLesson}
        showValidationErrors={false}
        lessonTitleEmpty={false}
      />,
    );

    expect(screen.getByDisplayValue('Title')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Desc')).toBeInTheDocument();
  });

  it('updates base title and content', () => {
    render(
      <LessonBasicInfo
        lesson={{ id: 'l1', baseTitle: 'Title', content: 'Desc' }}
        moduleId="m1"
        updateLesson={updateLesson}
        showValidationErrors={false}
        lessonTitleEmpty={false}
      />,
    );

    fireEvent.change(screen.getByDisplayValue('Title'), {
      target: { value: 'New title' },
    });
    expect(updateLesson).toHaveBeenCalledWith('m1', 'l1', {
      baseTitle: 'New title',
    });

    fireEvent.change(screen.getByDisplayValue('Desc'), {
      target: { value: 'New content' },
    });
    expect(updateLesson).toHaveBeenCalledWith('m1', 'l1', {
      content: 'New content',
    });
  });

  it('shows validation message when title is empty', () => {
    render(
      <LessonBasicInfo
        lesson={{ id: 'l1', baseTitle: '', content: '' }}
        moduleId="m1"
        updateLesson={updateLesson}
        showValidationErrors
        lessonTitleEmpty
      />,
    );

    expect(screen.getByText('Lesson title is required.')).toBeInTheDocument();
  });
});
