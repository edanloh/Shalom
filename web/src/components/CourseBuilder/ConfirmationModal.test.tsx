import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ConfirmationModal from './ConfirmationModal';

describe('ConfirmationModal', () => {
  it('does not render when closed', () => {
    render(
      <ConfirmationModal
        isOpen={false}
        onClose={vi.fn()}
        title="Test title"
        message="Test message"
      />,
    );

    expect(screen.queryByText('Test title')).not.toBeInTheDocument();
  });

  it('renders title, message, and default confirm button', () => {
    render(
      <ConfirmationModal
        isOpen
        onClose={vi.fn()}
        title="Delete item"
        message="Are you sure?"
      />,
    );

    expect(screen.getByText('Delete item')).toBeInTheDocument();
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'OK' })).toBeInTheDocument();
  });

  it('shows cancel button when showCancel is true', () => {
    render(
      <ConfirmationModal
        isOpen
        onClose={vi.fn()}
        title="Title"
        message="Message"
        showCancel
        cancelText="No"
      />,
    );

    expect(screen.getByRole('button', { name: 'No' })).toBeInTheDocument();
  });

  it('calls onConfirm and onClose when confirm is clicked', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();

    render(
      <ConfirmationModal
        isOpen
        onClose={onClose}
        onConfirm={onConfirm}
        title="Title"
        message="Message"
        confirmText="Confirm"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when clicking backdrop', () => {
    const onClose = vi.fn();
    const { container } = render(
      <ConfirmationModal
        isOpen
        onClose={onClose}
        title="Backdrop test"
        message="Message"
      />,
    );

    const backdrop = container.firstChild as HTMLElement;
    fireEvent.click(backdrop);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close when clicking inside modal content', () => {
    const onClose = vi.fn();

    render(
      <ConfirmationModal
        isOpen
        onClose={onClose}
        title="Inside click"
        message="Message"
      />,
    );

    fireEvent.click(screen.getByText('Inside click'));

    expect(onClose).not.toHaveBeenCalled();
  });
});
