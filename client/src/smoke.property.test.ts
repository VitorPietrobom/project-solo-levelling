import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// Feature: level-up-portal, Property: smoke test — string reverse is involutory
describe('fast-check smoke test', () => {
  it('reversing a string twice returns the original', () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const reversed = [...s].reverse().join('');
        const doubleReversed = [...reversed].reverse().join('');
        expect(doubleReversed).toBe(s);
      }),
      { numRuns: 100 },
    );
  });
});
