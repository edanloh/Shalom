import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ValidationModal } from '@/components/CourseBuilder/ValidationModal';

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div data-testid="dialog-root">{children}</div> : null,
  DialogContent: ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLDivElement>) => (
    <div data-testid="dialog-content" {...props}>
      {children}
    </div>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

describe('ValidationModal', () => {
  it('renders title, description, and default button text', () => {
    render(
      <ValidationModal
        open
        onOpenChange={vi.fn()}
        title="Validation failed"
        description="Please fill required fields"
      />,
    );

    expect(screen.getByText('Validation failed')).toBeInTheDocument();
    expect(screen.getByText('Please fill required fields')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'OK' })).toBeInTheDocument();
  });

  it('uses custom confirm text', () => {
    render(
      <ValidationModal
        open
        onOpenChange={vi.fn()}
        title="Title"
        description="Description"
        confirmText="Understood"
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Understood' }),
    ).toBeInTheDocument();
  });

  it('calls onOpenChange(false) when confirm button is clicked', () => {
    const onOpenChange = vi.fn();

    render(
      <ValidationModal
        open
        onOpenChange={onOpenChange}
        title="Title"
        description="Description"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'OK' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('does not render content when closed', () => {
    render(
      <ValidationModal
        open={false}
        onOpenChange={vi.fn()}
        title="Hidden"
        description="Hidden"
      />,
    );

    expect(screen.queryByTestId('dialog-root')).not.toBeInTheDocument();
  });
});
