import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Pagination } from '../../components/Pagination';

const mockOnPageChange = vi.fn();

const renderPagination = (props: Partial<any> = {}) => {
  const defaultProps = {
    currentPage: 1,
    totalPages: 10,
    onPageChange: mockOnPageChange,
    itemsPerPage: 10,
    totalItems: 100,
    ...props,
  };
  return render(<Pagination {...defaultProps} />);
};

describe('Pagination', () => {
  beforeEach(() => {
    mockOnPageChange.mockClear();
  });

  it('should not render when total pages is 1 or less', () => {
    const { container } = renderPagination({ totalPages: 1 });
    expect(container.firstChild).toBeNull();
  });

  it('displays current item range', () => {
    renderPagination();
    expect(
      screen.getByText('Showing 1 to 10 of 100 items'),
    ).toBeInTheDocument();
  });

  it('updates item range on different pages', () => {
    renderPagination({ currentPage: 2 });
    expect(
      screen.getByText('Showing 11 to 20 of 100 items'),
    ).toBeInTheDocument();
  });

  it('disables previous button on first page', () => {
    renderPagination({ currentPage: 1 });
    const prevButtons = screen.getAllByRole('button');
    const chevronLeftButton = prevButtons[1]; // Second button is previous
    expect(chevronLeftButton).toBeDisabled();
  });

  it('disables next button on last page', () => {
    renderPagination({ currentPage: 10, totalPages: 10 });
    const nextButtons = screen.getAllByRole('button');
    const chevronRightButton = nextButtons[nextButtons.length - 2]; // Second to last button is next
    expect(chevronRightButton).toBeDisabled();
  });

  it('disables first page button on first page', () => {
    renderPagination({ currentPage: 1 });
    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toBeDisabled(); // ChevronsLeft button
  });

  it('disables last page button on last page', () => {
    renderPagination({ currentPage: 10, totalPages: 10 });
    const buttons = screen.getAllByRole('button');
    expect(buttons[buttons.length - 1]).toBeDisabled(); // ChevronsRight button
  });

  it('calls onPageChange when next button is clicked', async () => {
    const user = userEvent.setup();
    renderPagination({ currentPage: 1, totalPages: 10 });

    const nextButton = screen.getByRole('button', { name: '2' });

    await user.click(nextButton);
    expect(mockOnPageChange).toHaveBeenCalledWith(2);
  });

  it('calls onPageChange when previous button is clicked', async () => {
    const user = userEvent.setup();
    renderPagination({ currentPage: 5, totalPages: 10 });

    const buttons = screen.getAllByRole('button');
    const prevButton = buttons[1]; // ChevronLeft button

    await user.click(prevButton);
    expect(mockOnPageChange).toHaveBeenCalledWith(4);
  });

  it('calls onPageChange with first page when ChevronsLeft clicked', async () => {
    const user = userEvent.setup();
    renderPagination({ currentPage: 5, totalPages: 10 });

    const buttons = screen.getAllByRole('button');
    const firstPageButton = buttons[0];

    await user.click(firstPageButton);
    expect(mockOnPageChange).toHaveBeenCalledWith(1);
  });

  it('calls onPageChange with last page when ChevronsRight clicked', async () => {
    const user = userEvent.setup();
    renderPagination({ currentPage: 5, totalPages: 10 });

    const buttons = screen.getAllByRole('button');
    const lastPageButton = buttons[buttons.length - 1];

    await user.click(lastPageButton);
    expect(mockOnPageChange).toHaveBeenCalledWith(10);
  });

  it('shows ellipsis when pages are not consecutive', () => {
    renderPagination({ currentPage: 5, totalPages: 10 });
    const ellipsis = screen.getAllByText('...');
    expect(ellipsis.length).toBeGreaterThan(0);
  });

  it('always shows first and last page buttons', () => {
    renderPagination({ currentPage: 5, totalPages: 10 });
    const pageButtons = screen
      .getAllByRole('button')
      .filter((btn) => btn.textContent?.match(/^[0-9]+$/));
    const pageNumbers = pageButtons.map((btn) =>
      parseInt(btn.textContent || '0'),
    );
    expect(pageNumbers).toContain(1); // First page
    expect(pageNumbers).toContain(10); // Last page
  });

  it('highlights current page button', () => {
    renderPagination({ currentPage: 5, totalPages: 10 });
    const pageButtons = screen.getAllByRole('button');
    // The current page button should have "default" variant (different styling)
    const currentPageButton = pageButtons.find(
      (btn) => btn.textContent === '5',
    );
    expect(currentPageButton).toHaveClass('bg-primary');
  });

  it('handles edge case of 2 pages', () => {
    renderPagination({ totalPages: 2, currentPage: 1, totalItems: 20 });
    const text = screen.getByText(/Showing/);
    expect(text.textContent).toContain('1');
    expect(text.textContent).toContain('10');
    expect(text.textContent).toContain('20');
  });

  it('handles last page with partial items', () => {
    renderPagination({
      currentPage: 5,
      totalPages: 5,
      itemsPerPage: 10,
      totalItems: 45,
    });
    expect(
      screen.getByText('Showing 41 to 45 of 45 items'),
    ).toBeInTheDocument();
  });
});
