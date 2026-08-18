import { describe, it, expect } from 'vitest';
import { rankForLevel } from './rank';

describe('rankForLevel', () => {
  it('starts at E-Rank for level 0', () => {
    expect(rankForLevel(0).label).toBe('E-Rank');
  });

  it('promotes at each threshold', () => {
    expect(rankForLevel(6).label).toBe('E-Rank');
    expect(rankForLevel(7).label).toBe('D-Rank');
    expect(rankForLevel(14).label).toBe('D-Rank');
    expect(rankForLevel(15).label).toBe('C-Rank');
    expect(rankForLevel(24).label).toBe('C-Rank');
    expect(rankForLevel(25).label).toBe('B-Rank');
    expect(rankForLevel(39).label).toBe('B-Rank');
    expect(rankForLevel(40).label).toBe('A-Rank');
    expect(rankForLevel(59).label).toBe('A-Rank');
    expect(rankForLevel(60).label).toBe('S-Rank');
  });

  it('stays at S-Rank for any level above the top threshold', () => {
    expect(rankForLevel(1000).label).toBe('S-Rank');
  });
});
