import { describe, it, expect } from 'vitest';
import { calculateSoreness, SessionData } from './soreness';

describe('calculateSoreness', () => {
  const today = new Date('2024-01-15');

  it('returns empty map when no sessions', () => {
    const result = calculateSoreness([], today);
    expect(result.size).toBe(0);
  });

  it('returns 100 for the only muscle group exercised today', () => {
    const sessions: SessionData[] = [
      {
        date: new Date('2024-01-15'),
        exercises: [
          { sets: 3, reps: 10, weight: 100, muscleGroups: [{ muscleGroup: 'chest' }] },
        ],
      },
    ];
    const result = calculateSoreness(sessions, today);
    expect(result.get('chest')).toBe(100);
  });

  it('weights recent sessions higher than older ones', () => {
    const sessions: SessionData[] = [
      {
        date: new Date('2024-01-15'), // today, recency = 1.0
        exercises: [
          { sets: 3, reps: 10, weight: 100, muscleGroups: [{ muscleGroup: 'chest' }] },
        ],
      },
      {
        date: new Date('2024-01-12'), // 3 days ago, recency ≈ 0.571
        exercises: [
          { sets: 3, reps: 10, weight: 100, muscleGroups: [{ muscleGroup: 'back' }] },
        ],
      },
    ];
    const result = calculateSoreness(sessions, today);
    expect(result.get('chest')).toBe(100);
    expect(result.get('back')).toBeLessThan(100);
    expect(result.get('back')).toBeGreaterThan(0);
  });

  it('ignores sessions older than 7 days', () => {
    const sessions: SessionData[] = [
      {
        date: new Date('2024-01-07'), // 8 days ago
        exercises: [
          { sets: 3, reps: 10, weight: 100, muscleGroups: [{ muscleGroup: 'chest' }] },
        ],
      },
    ];
    const result = calculateSoreness(sessions, today);
    expect(result.size).toBe(0);
  });

  it('handles multiple muscle groups per exercise', () => {
    const sessions: SessionData[] = [
      {
        date: new Date('2024-01-15'),
        exercises: [
          {
            sets: 3, reps: 10, weight: 50,
            muscleGroups: [{ muscleGroup: 'chest' }, { muscleGroup: 'triceps' }],
          },
        ],
      },
    ];
    const result = calculateSoreness(sessions, today);
    expect(result.get('chest')).toBe(100);
    expect(result.get('triceps')).toBe(100);
  });

  it('normalizes scores relative to the max', () => {
    const sessions: SessionData[] = [
      {
        date: new Date('2024-01-15'),
        exercises: [
          { sets: 4, reps: 10, weight: 100, muscleGroups: [{ muscleGroup: 'chest' }] },
          { sets: 2, reps: 10, weight: 100, muscleGroups: [{ muscleGroup: 'back' }] },
        ],
      },
    ];
    const result = calculateSoreness(sessions, today);
    expect(result.get('chest')).toBe(100);
    expect(result.get('back')).toBe(50);
  });

  it('accumulates volume across multiple sessions for same muscle group', () => {
    const sessions: SessionData[] = [
      {
        date: new Date('2024-01-15'),
        exercises: [
          { sets: 3, reps: 10, weight: 100, muscleGroups: [{ muscleGroup: 'chest' }] },
        ],
      },
      {
        date: new Date('2024-01-14'),
        exercises: [
          { sets: 3, reps: 10, weight: 100, muscleGroups: [{ muscleGroup: 'chest' }] },
        ],
      },
    ];
    const result = calculateSoreness(sessions, today);
    // Both contribute to chest, so it should be 100 (it's the only group)
    expect(result.get('chest')).toBe(100);
  });
});
