import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MuscleHeatMap from './MuscleHeatMap';

describe('MuscleHeatMap', () => {
  it('renders all 11 muscle groups', () => {
    render(<MuscleHeatMap heatmap={{}} />);
    expect(screen.getByRole('list', { name: 'Muscle soreness heat map' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(11);
  });

  it('shows muscle group labels', () => {
    render(<MuscleHeatMap heatmap={{}} />);
    expect(screen.getByText('Chest')).toBeInTheDocument();
    expect(screen.getByText('Back')).toBeInTheDocument();
    expect(screen.getByText('Shoulders')).toBeInTheDocument();
    expect(screen.getByText('Quads')).toBeInTheDocument();
    expect(screen.getByText('Abs')).toBeInTheDocument();
    expect(screen.getByText('Forearms')).toBeInTheDocument();
  });

  it('displays soreness values', () => {
    render(<MuscleHeatMap heatmap={{ chest: 75, back: 0, quads: 50 }} />);
    expect(screen.getByLabelText(/Chest: High soreness \(75%\)/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Back: None soreness \(0%\)/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Quads: Moderate soreness \(50%\)/)).toBeInTheDocument();
  });

  it('shows correct soreness labels for different levels', () => {
    render(
      <MuscleHeatMap
        heatmap={{
          chest: 100,
          back: 60,
          shoulders: 30,
          biceps: 10,
          triceps: 0,
        }}
      />,
    );
    expect(screen.getByLabelText(/Chest: Intense soreness/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Back: High soreness/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Shoulders: Moderate soreness/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Biceps: Mild soreness/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Triceps: None soreness/)).toBeInTheDocument();
  });

  it('defaults to 0 for missing muscle groups', () => {
    render(<MuscleHeatMap heatmap={{}} />);
    expect(screen.getByLabelText(/Chest: None soreness \(0%\)/)).toBeInTheDocument();
  });

  it('renders the color scale legend', () => {
    render(<MuscleHeatMap heatmap={{}} />);
    // Legend labels
    const noneLabels = screen.getAllByText('None');
    expect(noneLabels.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Intense')).toBeInTheDocument();
  });
});
