import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ModuleEditor } from '../../../../components/CourseBuilder/Module/ModuleEditor';

describe('ModuleEditor', () => {
  const updateModule = vi.fn();

  const modules = [
    {
      id: 'm1',
      title: 'Module 1: Intro',
      description: 'Module description',
    },
  ];

  it('renders module fields', () => {
    render(
      <ModuleEditor
        selectedItem={{ id: 'm1' }}
        modules={modules}
        updateModule={updateModule}
        showValidationErrors={false}
      />,
    );

    expect(screen.getByDisplayValue('Intro')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Module description')).toBeInTheDocument();
  });

  it('updates title with numbered prefix', () => {
    render(
      <ModuleEditor
        selectedItem={{ id: 'm1' }}
        modules={modules}
        updateModule={updateModule}
        showValidationErrors={false}
      />,
    );

    fireEvent.change(screen.getByDisplayValue('Intro'), {
      target: { value: 'Updated' },
    });

    expect(updateModule).toHaveBeenCalledWith('m1', {
      title: 'Module 1: Updated',
    });
  });

  it('shows required message when title is empty and validation enabled', () => {
    render(
      <ModuleEditor
        selectedItem={{ id: 'm1' }}
        modules={[{ id: 'm1', title: 'Module 1: ', description: '' }]}
        updateModule={updateModule}
        showValidationErrors
      />,
    );

    expect(screen.getByText('Module title is required.')).toBeInTheDocument();
  });
});
