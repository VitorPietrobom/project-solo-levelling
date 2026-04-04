import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// Feature: level-up-portal, Property: smoke test — addition is commutative
describe('fast-check smoke test', () => {
  it('addition is commutative', () => {
    fc.assert(
      fc.property(fc.integer(), fc.integer(), (a, b) => {
        expect(a + b).toBe(b + a);
      }),
      { numRuns: 100 },
    );
  });
});
