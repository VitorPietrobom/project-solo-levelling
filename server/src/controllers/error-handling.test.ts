import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/prisma', () => ({
  default: {
    user: { findUnique: vi.fn(), update: vi.fn() },
    foodEntry: { findMany: vi.fn() },
    whoopDaily: { findMany: vi.fn() },
    weightEntry: { findMany: vi.fn() },
    measurement: { findMany: vi.fn() },
    whoopConnection: { findUnique: vi.fn(), deleteMany: vi.fn() },
  },
}));

import prisma from '../lib/prisma';
import { exportData } from './export';
import { updateReadingGoal } from './learning';
import { getNutritionSettings } from './nutrition';
import { whoopStatus, verifyState } from './whoop';

const p = prisma as any;

function mockRes() {
  const res: any = { headersSent: false };
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
}
const req: any = { user: { id: 'u1' }, body: { readingGoal: 10 }, query: {} };

describe('OE-022 async handlers answer 500 on failure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it.each([
    ['exportData', exportData, () => p.user.findUnique.mockRejectedValue(new Error('db'))],
    ['updateReadingGoal', updateReadingGoal, () => p.user.update.mockRejectedValue(new Error('db'))],
    ['getNutritionSettings', getNutritionSettings, () => p.user.findUnique.mockRejectedValue(new Error('db'))],
    ['whoopStatus', whoopStatus, () => p.whoopConnection.findUnique.mockRejectedValue(new Error('db'))],
  ])('%s', async (_n, handler, setup) => {
    setup();
    for (const m of ['foodEntry', 'whoopDaily', 'weightEntry', 'measurement']) p[m].findMany.mockResolvedValue([]);
    const res = mockRes();
    await expect(handler(req, res)).resolves.toBeUndefined();
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('verifyState', () => {
  it('returns null (no throw) for a short signature', () => {
    expect(verifyState('eyJ1c2VySWQiOiJ1MSJ9.x')).toBeNull();
  });
});
