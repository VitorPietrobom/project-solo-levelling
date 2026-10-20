import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../index';
import { reconcileWhoopWeight, syncInChunks } from './whoop';

vi.mock('../lib/prisma', () => ({
  default: {
    whoopConnection: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    user: {
      upsert: vi.fn().mockResolvedValue({}),
    },
  },
}));

import prisma from '../lib/prisma';

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

describe('GET /api/whoop/cron-sync', () => {
  const ORIGINAL_SECRET = process.env.CRON_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = 'test-secret';
  });

  afterEach(() => {
    process.env.CRON_SECRET = ORIGINAL_SECRET;
  });

  it('rejects a request with no CRON_SECRET configured', async () => {
    delete process.env.CRON_SECRET;
    const res = await request(app).get('/api/whoop/cron-sync');
    expect(res.status).toBe(401);
  });

  it('rejects a request with the wrong bearer token', async () => {
    const res = await request(app).get('/api/whoop/cron-sync').set('Authorization', 'Bearer wrong');
    expect(res.status).toBe(401);
  });

  it('syncs every connected user and reports a failure without aborting the rest', async () => {
    (prisma.whoopConnection.findMany as any).mockResolvedValue([{ userId: 'u1' }, { userId: 'u2' }]);
    // No stored connection for either user in this mock, so freshAccessToken
    // returns null for both — performWhoopSync treats that as "not connected".
    (prisma.whoopConnection.findUnique as any).mockResolvedValue(null);

    const res = await request(app).get('/api/whoop/cron-sync').set('Authorization', 'Bearer test-secret');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ total: 2, synced: 0, failed: 2, skipped: 0 });
    expect(prisma.whoopConnection.findMany).toHaveBeenCalledWith(expect.objectContaining({
      orderBy: { syncedAt: { sort: 'asc', nulls: 'first' } },
    }));
  });
});

describe('syncInChunks', () => {
  it('runs at most `concurrency` workers at once and tallies results', async () => {
    let active = 0;
    let peak = 0;
    const worker = vi.fn(async (id: string) => {
      active++; peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 1));
      active--;
      if (id === 'bad') throw new Error('boom');
      return id === 'none' ? null : {};
    });
    const ids = ['a', 'b', 'bad', 'c', 'none', 'd', 'e'];
    const out = await syncInChunks(ids, worker, { concurrency: 3, deadline: Infinity });
    expect(peak).toBeLessThanOrEqual(3);
    expect(worker).toHaveBeenCalledTimes(7);
    expect(out).toEqual({ synced: 5, failed: 2, skipped: 0 });
  });

  it('stops starting new chunks once the deadline passes', async () => {
    let t = 0;
    const worker = vi.fn(async () => { t += 10; return {}; });
    const out = await syncInChunks(['a', 'b', 'c', 'd', 'e'], worker, {
      concurrency: 2, deadline: 15, now: () => t,
    });
    // chunk 1 starts at t=0 (→20), chunk 2 blocked.
    expect(worker).toHaveBeenCalledTimes(2);
    expect(out).toEqual({ synced: 2, failed: 0, skipped: 3 });
  });
});
