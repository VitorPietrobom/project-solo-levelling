import { describe, it, expect } from 'vitest';
import { getCurrentLevel, getXPForNextLevel, getProgressToNextLevel } from './xp';

describe('XP Service', () => {
  describe('getCurrentLevel', () => {
    it('returns 0 for 0 XP', () => {
      expect(getCurrentLevel(0)).toBe(0);
    });

    it('returns 0 for 99 XP (below level 1 threshold of 100)', () => {
      expect(getCurrentLevel(99)).toBe(0);
    });

    it('returns 1 at exactly 100 XP (50*1*2 = 100)', () => {
      expect(getCurrentLevel(100)).toBe(1);
    });

    it('returns 1 for 299 XP (below level 2 threshold of 300)', () => {
      expect(getCurrentLevel(299)).toBe(1);
    });

    it('returns 2 at exactly 300 XP (50*2*3 = 300)', () => {
      expect(getCurrentLevel(300)).toBe(2);
    });

    it('returns 3 at exactly 600 XP (50*3*4 = 600)', () => {
      expect(getCurrentLevel(600)).toBe(3);
    });

    it('returns 0 for negative XP', () => {
      expect(getCurrentLevel(-10)).toBe(0);
    });
  });

  describe('getXPForNextLevel', () => {
    it('returns 100 for level 0 (need 100 XP to reach level 1)', () => {
      expect(getXPForNextLevel(0)).toBe(100);
    });

    it('returns 200 for level 1 (need 200 XP to reach level 2)', () => {
      expect(getXPForNextLevel(1)).toBe(200);
    });

    it('returns 300 for level 2', () => {
      expect(getXPForNextLevel(2)).toBe(300);
    });
  });

  describe('getProgressToNextLevel', () => {
    it('returns 0 current, 100 required, 0% for 0 XP', () => {
      const progress = getProgressToNextLevel(0);
      expect(progress.current).toBe(0);
      expect(progress.required).toBe(100);
      expect(progress.percentage).toBe(0);
    });

    it('returns 50 current, 100 required, 50% for 50 XP', () => {
      const progress = getProgressToNextLevel(50);
      expect(progress.current).toBe(50);
      expect(progress.required).toBe(100);
      expect(progress.percentage).toBe(50);
    });

    it('returns 0 current, 200 required, 0% at exactly level 1 (100 XP)', () => {
      const progress = getProgressToNextLevel(100);
      expect(progress.current).toBe(0);
      expect(progress.required).toBe(200);
      expect(progress.percentage).toBe(0);
    });

    it('returns 100 current, 200 required, 50% at 200 XP', () => {
      const progress = getProgressToNextLevel(200);
      expect(progress.current).toBe(100);
      expect(progress.required).toBe(200);
      expect(progress.percentage).toBe(50);
    });
  });
});
