import { describe, it, expect } from 'vitest';
import { reconcileWhoopWeight } from './whoop';

describe('reconcileWhoopWeight', () => {
  it('creates today\'s row when there is none', () => {
    expect(reconcileWhoopWeight(null, 82.34)).toEqual({ action: 'create', weight: 82.3 });
  });

  it('refreshes its own row when a later sync brings a new reading', () => {
    // This is the bug fix: the first sync of the day used to lock the value in.
    expect(reconcileWhoopWeight({ weight: 82.3, source: 'whoop' }, 81.8)).toEqual({ action: 'update', weight: 81.8 });
  });

  it('does nothing when its own row already matches', () => {
    expect(reconcileWhoopWeight({ weight: 82.3, source: 'whoop' }, 82.3)).toEqual({ action: 'skip', weight: null });
  });

  it('never overwrites a manual weigh-in, even if the reading differs', () => {
    expect(reconcileWhoopWeight({ weight: 80.0, source: 'manual' }, 82.5)).toEqual({ action: 'skip', weight: null });
  });

  it('rounds to one decimal so tiny fluctuations do not thrash', () => {
    expect(reconcileWhoopWeight(null, 82.349).weight).toBe(82.3);
    // 82.31 rounds to 82.3, matching an existing 82.3 → no needless write.
    expect(reconcileWhoopWeight({ weight: 82.3, source: 'whoop' }, 82.31)).toEqual({ action: 'skip', weight: null });
  });

  it('skips unusable readings (missing, zero, negative, NaN)', () => {
    for (const bad of [undefined, null, 0, -5, NaN, 'x']) {
      expect(reconcileWhoopWeight(null, bad).action).toBe('skip');
    }
  });
});
