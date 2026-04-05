import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WeightChart from './WeightChart';

// Mock recharts to avoid rendering issues in jsdom
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="chart-container">{children}</div>,
  LineChart: ({ children }: any) => <div>{children}</div>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}));

import { vi } from 'vitest';

describe('WeightChart', () => {
  const entries = [
    { id: 'w1', weight: 80.0, date: '2024-01-01' },
    { id: 'w2', weight: 79.5, date: '2024-01-02' },
    { id: 'w3', weight: 79.0, date: '2024-01-03' },
  ];

  it('displays latest weight and change from previous', () => {
    render(<WeightChart entries={entries} />);
    expect(screen.getByText('79')).toBeInTheDocument();
    expect(screen.getByText('-0.5')).toBeInTheDocument();
  });

  it('shows empty state when no entries', () => {
    render(<WeightChart entries={[]} />);
    expect(screen.getByText(/No weight entries yet/)).toBeInTheDocument();
  });

  it('renders time range buttons', () => {
    render(<WeightChart entries={entries} />);
    expect(screen.getByLabelText('Show 7D range')).toBeInTheDocument();
    expect(screen.getByLabelText('Show 30D range')).toBeInTheDocument();
    expect(screen.getByLabelText('Show 90D range')).toBeInTheDocument();
    expect(screen.getByLabelText('Show All range')).toBeInTheDocument();
  });

  it('switches time range on click', async () => {
    render(<WeightChart entries={entries} />);
    const btn = screen.getByLabelText('Show 7D range');
    await userEvent.click(btn);
    expect(btn.className).toContain('bg-accent-primary');
  });
});
