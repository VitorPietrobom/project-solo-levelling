import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import GymSessionLog from './GymSessionLog';
import type { GymSession } from './GymSessionLog';

const sampleSessions: GymSession[] = [
  {
    id: 's1',
    date: '2024-03-10',
    notes: 'Felt strong today',
    exercises: [
      {
        id: 'e1',
        name: 'Bench Press',
        sets: 4,
        reps: 8,
        weight: 80,
        muscleGroups: [{ muscleGroup: 'chest' }, { muscleGroup: 'triceps' }],
      },
      {
        id: 'e2',
        name: 'Incline Dumbbell Press',
        sets: 3,
        reps: 10,
        weight: 30,
        muscleGroups: [{ muscleGroup: 'chest' }, { muscleGroup: 'shoulders' }],
      },
    ],
  },
  {
    id: 's2',
    date: '2024-03-08',
    notes: null,
    exercises: [
      {
        id: 'e3',
        name: 'Squat',
        sets: 5,
        reps: 5,
        weight: 120,
        muscleGroups: [{ muscleGroup: 'quads' }, { muscleGroup: 'glutes' }],
      },
    ],
  },
];

describe('GymSessionLog', () => {
  it('shows empty state when no sessions', () => {
    render(<GymSessionLog sessions={[]} />);
    expect(
      screen.getByText('No gym sessions yet. Log your first session to start tracking.'),
    ).toBeInTheDocument();
  });

  it('renders session cards with dates', () => {
    render(<GymSessionLog sessions={sampleSessions} />);
    expect(screen.getByRole('list', { name: 'Gym sessions' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('displays exercise count per session', () => {
    render(<GymSessionLog sessions={sampleSessions} />);
    expect(screen.getByText('2 exercises')).toBeInTheDocument();
    expect(screen.getByText('1 exercise')).toBeInTheDocument();
  });

  it('shows session notes when present', () => {
    render(<GymSessionLog sessions={sampleSessions} />);
    expect(screen.getByText('Felt strong today')).toBeInTheDocument();
  });

  it('renders exercise details with sets, reps, weight', () => {
    render(<GymSessionLog sessions={sampleSessions} />);
    expect(screen.getByText('Bench Press')).toBeInTheDocument();
    expect(screen.getByText('4×8 @ 80kg')).toBeInTheDocument();
    expect(screen.getByText('Squat')).toBeInTheDocument();
    expect(screen.getByText('5×5 @ 120kg')).toBeInTheDocument();
  });

  it('shows unique muscle group tags per session', () => {
    render(<GymSessionLog sessions={sampleSessions} />);
    // Session 1 has chest, triceps, shoulders (chest appears twice but should be deduped)
    const tags = screen.getAllByText('chest');
    expect(tags.length).toBe(1);
    expect(screen.getByText('triceps')).toBeInTheDocument();
    expect(screen.getByText('shoulders')).toBeInTheDocument();
  });
});
