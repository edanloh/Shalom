import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ActivityFeed } from '../../components/ActivityFeed';

describe('ActivityFeed', () => {
  it('renders the Recent Activity heading', () => {
    render(<ActivityFeed />);
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
  });

  it('displays no activity message', () => {
    render(<ActivityFeed />);
    expect(screen.getByText('No recent activity yet')).toBeInTheDocument();
  });

  it('renders as a card with gradient styling', () => {
    const { container } = render(<ActivityFeed />);
    const card = container.firstChild;
    expect(card).toHaveClass('gradient-card', 'border-border');
  });

  it('has rounded corners styling', () => {
    const { container } = render(<ActivityFeed />);
    const card = container.firstChild;
    expect(card).toHaveClass('rounded-xl');
  });

  it('has proper padding', () => {
    const { container } = render(<ActivityFeed />);
    const card = container.firstChild;
    expect(card).toHaveClass('p-6');
  });

  it('uses full height layout', () => {
    const { container } = render(<ActivityFeed />);
    const card = container.firstChild;
    expect(card).toHaveClass('h-full');
  });

  it('has flex column layout', () => {
    const { container } = render(<ActivityFeed />);
    const card = container.firstChild;
    expect(card).toHaveClass('flex', 'flex-col');
  });

  it('has dashed border for content area', () => {
    const { container } = render(<ActivityFeed />);
    const contentArea = container.querySelector('[class*="border-dashed"]');
    expect(contentArea).toHaveClass('border-2', 'border-dashed');
  });

  it('heading has proper text styling', () => {
    render(<ActivityFeed />);
    const heading = screen.getByText('Recent Activity');
    expect(heading).toHaveClass('text-lg', 'font-semibold');
  });

  it('message text is centered and muted', () => {
    render(<ActivityFeed />);
    const message = screen.getByText('No recent activity yet');
    expect(message).toHaveClass(
      'text-sm',
      'text-center',
      'text-muted-foreground',
    );
  });

  it('content area is centered', () => {
    const { container } = render(<ActivityFeed />);
    const contentArea = container.querySelector('[class*="border-dashed"]');
    expect(contentArea).toHaveClass('flex', 'items-center', 'justify-center');
  });

  it('content area has transparent background', () => {
    const { container } = render(<ActivityFeed />);
    const contentArea = container.querySelector('[class*="border-dashed"]');
    expect(contentArea).toHaveClass('bg-background/30');
  });

  it('renders as a simple presentational component', () => {
    const { container } = render(<ActivityFeed />);
    // Should have 2 main divs: outer card and inner content area
    const divs = container.querySelectorAll('div');
    expect(divs.length).toBeGreaterThan(1);
  });

  it('heading margin is applied', () => {
    render(<ActivityFeed />);
    const heading = screen.getByText('Recent Activity');
    expect(heading).toHaveClass('mb-4');
  });

  it('content area expands to fill available space', () => {
    const { container } = render(<ActivityFeed />);
    const contentArea = container.querySelector('[class*="flex-1"]');
    expect(contentArea).toHaveClass('flex-1');
  });
});
