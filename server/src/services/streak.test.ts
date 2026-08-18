import { describe, it, expect } from 'vitest';
import { computeStreak } from './streak';

const TODAY = '2026-08-06';

describe('computeStreak', () => {
  it('is 0 with no activity at all', () => {
    expect(computeStreak([], TODAY)).toBe(0);
  });

  it('is 1 for activity only today', () => {
    expect(computeStreak(['2026-08-06'], TODAY)).toBe(1);
  });

  it('counts an unbroken run ending today', () => {
    expect(computeStreak(['2026-08-04', '2026-08-05', '2026-08-06'], TODAY)).toBe(3);
  });

  it('still counts a streak that ended yesterday, not today', () => {
    // The user hasn't done anything YET today — that shouldn't zero it out.
    expect(computeStreak(['2026-08-04', '2026-08-05'], TODAY)).toBe(2);
  });

  it('breaks on a gap', () => {
    expect(computeStreak(['2026-08-01', '2026-08-02', '2026-08-04', '2026-08-05'], TODAY)).toBe(2);
  });

  it('is 0 once more than a day has been skipped', () => {
    expect(computeStreak(['2026-08-03'], TODAY)).toBe(0);
  });

  it('ignores duplicate dates', () => {
    expect(computeStreak(['2026-08-06', '2026-08-06', '2026-08-05'], TODAY)).toBe(2);
  });

  it('ignores dates in any order', () => {
    expect(computeStreak(['2026-08-05', '2026-08-01', '2026-08-06', '2026-08-04'], TODAY)).toBe(3);
  });

  it('ignores future dates that should never occur', () => {
    expect(computeStreak(['2026-08-06', '2026-08-07'], TODAY)).toBe(1);
  });
});
