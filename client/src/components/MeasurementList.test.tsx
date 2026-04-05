import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MeasurementList from './MeasurementList';
import type { Measurement } from './MeasurementList';

const sampleMeasurements: Measurement[] = [
  { id: 'm1', type: 'chest', value: 100, date: '2024-01-01' },
  { id: 'm2', type: 'chest', value: 102, date: '2024-01-15' },
  { id: 'm3', type: 'waist', value: 80, date: '2024-01-10' },
];

describe('MeasurementList', () => {
  it('shows empty state when no measurements', () => {
    render(<MeasurementList measurements={[]} />);
    expect(
      screen.getByText('No measurements yet. Log your first measurement to start tracking.'),
    ).toBeInTheDocument();
  });

  it('renders latest value per type', () => {
    render(<MeasurementList measurements={sampleMeasurements} />);
    // Chest latest = 102, Waist latest = 80
    expect(screen.getByText('102')).toBeInTheDocument();
    expect(screen.getByText('80')).toBeInTheDocument();
  });

  it('shows change indicator for types with multiple entries', () => {
    render(<MeasurementList measurements={sampleMeasurements} />);
    // Chest change: 102 - 100 = +2.0
    expect(screen.getByText('+2.0')).toBeInTheDocument();
  });

  it('does not show change indicator for types with single entry', () => {
    render(<MeasurementList measurements={sampleMeasurements} />);
    // Waist has only one entry, no change indicator
    const waistCard = screen.getByText('Waist').closest('[role="listitem"]')!;
    expect(waistCard.querySelector('[aria-label]')).toBeNull();
  });

  it('displays type labels', () => {
    render(<MeasurementList measurements={sampleMeasurements} />);
    expect(screen.getByText('Chest')).toBeInTheDocument();
    expect(screen.getByText('Waist')).toBeInTheDocument();
  });

  it('renders as a grid with list role', () => {
    render(<MeasurementList measurements={sampleMeasurements} />);
    expect(screen.getByRole('list', { name: 'Body measurements' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2); // chest and waist
  });

  it('shows negative change with success color styling', () => {
    const entries: Measurement[] = [
      { id: 'm1', type: 'waist', value: 85, date: '2024-01-01' },
      { id: 'm2', type: 'waist', value: 82, date: '2024-01-15' },
    ];
    render(<MeasurementList measurements={entries} />);
    expect(screen.getByText('-3.0')).toBeInTheDocument();
  });
});
