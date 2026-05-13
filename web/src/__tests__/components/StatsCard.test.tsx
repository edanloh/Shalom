import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StatsCard } from '../../components/StatsCard';
import { TrendingUp } from 'lucide-react';

describe('StatsCard Component', () => {
  it('renders with title and value', () => {
    render(<StatsCard title="Total Users" value="1,234" icon={TrendingUp} />);

    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('1,234')).toBeInTheDocument();
  });

  it('displays trend when provided', () => {
    render(
      <StatsCard
        title="Revenue"
        value="$5,000"
        icon={TrendingUp}
        trend="+12%"
      />,
    );

    expect(screen.getByText('+12%')).toBeInTheDocument();
  });

  it('renders with different variants', () => {
    const { container } = render(
      <StatsCard
        title="Success Rate"
        value="95%"
        icon={TrendingUp}
        variant="success"
      />,
    );

    // Check that component renders without errors
    expect(container.firstChild).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <StatsCard
        title="Test"
        value="100"
        icon={TrendingUp}
        className="custom-class"
      />,
    );

    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });
});
