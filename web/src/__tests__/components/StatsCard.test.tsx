import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StatsCard } from '@/components/StatsCard';
import { TrendingUp } from 'lucide-react';
import { Colors } from '../constants';

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

  it('does not render a trend element when trend is not provided', () => {
    render(<StatsCard title="No Trend" value="42" icon={TrendingUp} />);

    expect(screen.queryByText('+12%')).not.toBeInTheDocument();
  });

  it('applies the default variant styles', () => {
    const { container } = render(
      <StatsCard title="Default" value="10" icon={TrendingUp} />,
    );

    expect(container.firstChild).toHaveStyle({
      borderColor: Colors.cardBorder,
    });
  });

  it('applies the accent variant styles', () => {
    const { container } = render(
      <StatsCard title="Accent" value="10" icon={TrendingUp} variant="accent" />,
    );

    expect(container.firstChild).toHaveStyle({
      boxShadow: `0 8px 32px ${Colors.yellow}30`,
    });
  });

  it('applies the warning variant styles', () => {
    const { container } = render(
      <StatsCard title="Warning" value="10" icon={TrendingUp} variant="warning" />,
    );

    expect(container.firstChild).toHaveStyle({
      boxShadow: `0 8px 32px ${Colors.red}30`,
    });
  });

  it('applies the secondary variant styles', () => {
    const { container } = render(
      <StatsCard
        title="Secondary"
        value="10"
        icon={TrendingUp}
        variant="secondary"
      />,
    );

    expect(container.firstChild).toHaveStyle({
      boxShadow: `0 8px 32px ${Colors.purple300}30`,
    });
  });

  it('applies the streakFire variant styles', () => {
    const { container } = render(
      <StatsCard
        title="Streak"
        value="10"
        icon={TrendingUp}
        variant="streakFire"
      />,
    );

    expect(container.firstChild).toHaveStyle({
      borderColor: Colors.streakFire,
    });
  });
});
