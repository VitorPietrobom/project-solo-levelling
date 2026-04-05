import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TrainingProgramView from './TrainingProgramView';
import type { TrainingProgram } from './TrainingProgramView';

const activeProgram: TrainingProgram = {
  id: 'p1',
  name: 'Push Pull Legs',
  active: true,
  days: [
    {
      id: 'd1',
      dayOfWeek: 'mon',
      exercises: [
        { id: 'e1', name: 'Bench Press', sets: 4, reps: 8, targetWeight: 80, sortOrder: 0 },
        { id: 'e2', name: 'OHP', sets: 3, reps: 10, targetWeight: 40, sortOrder: 1 },
      ],
    },
    {
      id: 'd2',
      dayOfWeek: 'wed',
      exercises: [
        { id: 'e3', name: 'Deadlift', sets: 5, reps: 5, targetWeight: 140, sortOrder: 0 },
      ],
    },
  ],
};

const inactiveProgram: TrainingProgram = {
  id: 'p2',
  name: 'Full Body',
  active: false,
  days: [
    {
      id: 'd3',
      dayOfWeek: 'tue',
      exercises: [
        { id: 'e4', name: 'Squat', sets: 5, reps: 5, targetWeight: 100, sortOrder: 0 },
      ],
    },
  ],
};

describe('TrainingProgramView', () => {
  it('shows empty state when no programs', () => {
    render(<TrainingProgramView programs={[]} onActivate={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('No training programs yet. Create one to get started.')).toBeInTheDocument();
  });

  it('renders active program with name and Active badge', () => {
    render(<TrainingProgramView programs={[activeProgram]} onActivate={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('Push Pull Legs')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders day tabs for active program', () => {
    render(<TrainingProgramView programs={[activeProgram]} onActivate={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByRole('tablist', { name: 'Training days' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Mon' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Wed' })).toBeInTheDocument();
  });

  it('shows exercises for the first day by default', () => {
    render(<TrainingProgramView programs={[activeProgram]} onActivate={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('Bench Press')).toBeInTheDocument();
    expect(screen.getByText('4×8 @ 80kg')).toBeInTheDocument();
    expect(screen.getByText('OHP')).toBeInTheDocument();
  });

  it('switches exercises when clicking a different day tab', async () => {
    render(<TrainingProgramView programs={[activeProgram]} onActivate={vi.fn()} onDelete={vi.fn()} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Wed' }));
    expect(screen.getByText('Deadlift')).toBeInTheDocument();
    expect(screen.getByText('5×5 @ 140kg')).toBeInTheDocument();
  });

  it('renders inactive programs with activate and delete buttons', () => {
    render(<TrainingProgramView programs={[activeProgram, inactiveProgram]} onActivate={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('Full Body')).toBeInTheDocument();
    expect(screen.getByText('1 day')).toBeInTheDocument();
    expect(screen.getByLabelText('Activate Full Body')).toBeInTheDocument();
    expect(screen.getByLabelText('Delete Full Body')).toBeInTheDocument();
  });

  it('calls onActivate when clicking activate button', async () => {
    const onActivate = vi.fn();
    render(<TrainingProgramView programs={[activeProgram, inactiveProgram]} onActivate={onActivate} onDelete={vi.fn()} />);
    await userEvent.click(screen.getByLabelText('Activate Full Body'));
    expect(onActivate).toHaveBeenCalledWith('p2');
  });

  it('calls onDelete when clicking delete button', async () => {
    const onDelete = vi.fn();
    render(<TrainingProgramView programs={[activeProgram, inactiveProgram]} onActivate={vi.fn()} onDelete={onDelete} />);
    await userEvent.click(screen.getByLabelText('Delete Full Body'));
    expect(onDelete).toHaveBeenCalledWith('p2');
  });

  it('does not show target weight when zero', () => {
    const program: TrainingProgram = {
      id: 'p3',
      name: 'Bodyweight',
      active: true,
      days: [{
        id: 'd4',
        dayOfWeek: 'mon',
        exercises: [{ id: 'e5', name: 'Push-ups', sets: 3, reps: 20, targetWeight: 0, sortOrder: 0 }],
      }],
    };
    render(<TrainingProgramView programs={[program]} onActivate={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('3×20')).toBeInTheDocument();
  });
});
