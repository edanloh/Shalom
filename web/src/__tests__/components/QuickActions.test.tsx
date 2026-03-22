import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QuickActions } from '@/components/QuickActions';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('QuickActions', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('renders the Quick Actions card', () => {
    renderWithRouter(<QuickActions />);
    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
  });

  it('displays all action buttons', () => {
    renderWithRouter(<QuickActions />);
    expect(screen.getByText('Create Course')).toBeInTheDocument();
    expect(screen.getByText('Students')).toBeInTheDocument();
    expect(screen.getByText('Grade')).toBeInTheDocument();
    expect(screen.getByText('Badges')).toBeInTheDocument();
  });

  it('navigates to course builder when Create Course is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<QuickActions />);

    const createCourseButton = screen.getByText('Create Course');
    await user.click(createCourseButton);

    expect(mockNavigate).toHaveBeenCalledWith('/course-builder/new');
  });

  it('navigates to students page when Students is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<QuickActions />);

    const studentsButton = screen.getByText('Students');
    await user.click(studentsButton);

    expect(mockNavigate).toHaveBeenCalledWith('/students');
  });

  it('navigates to quiz when Grade is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<QuickActions />);

    const gradeButton = screen.getByText('Grade');
    await user.click(gradeButton);

    expect(mockNavigate).toHaveBeenCalledWith('/quiz');
  });

  it('navigates to badges when Badges is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<QuickActions />);

    const badgesButton = screen.getByText('Badges');
    await user.click(badgesButton);

    expect(mockNavigate).toHaveBeenCalledWith('/badges');
  });

  it('renders with Card component styling', () => {
    const { container } = renderWithRouter(<QuickActions />);
    const card = container.querySelector('[class*="p-6"]');
    expect(card).toBeInTheDocument();
  });

  it('has proper grid layout', () => {
    const { container } = renderWithRouter(<QuickActions />);
    const grid = container.querySelector('[class*="grid"]');
    expect(grid).toHaveClass('gap-3');
  });

  it('buttons have icons', () => {
    const { container } = renderWithRouter(<QuickActions />);
    const icons = container.querySelectorAll('svg');
    expect(icons.length).toBeGreaterThan(0);
  });

  it('has responsive grid columns', () => {
    const { container } = renderWithRouter(<QuickActions />);
    const grid = container.querySelector('[class*="grid"]');
    expect(grid).toHaveClass('grid-cols-2', 'md:grid-cols-4');
  });

  it('Create Course button has default variant', () => {
    renderWithRouter(<QuickActions />);
    const createButton = screen.getByText('Create Course').closest('button');
    expect(createButton).toHaveClass('bg-primary'); // Default variant has primary background
  });

  it('other buttons have outline variant', () => {
    renderWithRouter(<QuickActions />);
    const studentsButton = screen.getByText('Students').closest('button');
    expect(studentsButton).toHaveClass('border'); // Outline variant has border
  });

  it('renders heading with proper styling', () => {
    const { container } = renderWithRouter(<QuickActions />);
    const heading = screen.getByText('Quick Actions');
    expect(heading).toHaveClass('text-lg', 'font-semibold');
  });

  it('buttons display vertically with icons and labels', () => {
    const { container } = renderWithRouter(<QuickActions />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(4);
    buttons.forEach((button) => {
      expect(button).toHaveClass('flex', 'flex-col');
    });
  });
});
