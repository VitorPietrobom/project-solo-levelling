import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../lib/prisma', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn().mockResolvedValue({}),
    },
    nutritionXpClaim: {
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock('../middleware/auth', async () => ({
  authMiddleware: (req: any, _res: any, next: any) => {
    req.user = { id: 'test-user-id', email: 'test@example.com' };
    next();
  },
}));

import app from '../index';
import prisma from '../lib/prisma';
import { weekStartOf, energyBalanceTdee, isWithinClaimWindow } from './nutrition';

function utcDayOffset(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

describe('isWithinClaimWindow', () => {
  const now = new Date('2026-10-15T12:00:00Z');
  it('allows today, yesterday and tomorrow', () => {
    expect(isWithinClaimWindow('2026-10-15', now)).toBe(true);
    expect(isWithinClaimWindow('2026-10-14', now)).toBe(true);
    expect(isWithinClaimWindow('2026-10-16', now)).toBe(true);
  });
  it('rejects dates two or more days away', () => {
    expect(isWithinClaimWindow('2026-10-13', now)).toBe(false);
    expect(isWithinClaimWindow('2026-10-17', now)).toBe(false);
    expect(isWithinClaimWindow('2019-01-01', now)).toBe(false);
  });
  it('handles month/year boundaries', () => {
    expect(isWithinClaimWindow('2025-12-31', new Date('2026-01-01T00:30:00Z'))).toBe(true);
  });
});

describe('POST /api/nutrition/claim date window', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // User lookup fails → 404, which proves the request passed the window check.
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
  });

  it('rejects a far-past date with 400 and awards no XP', async () => {
    const res = await request(app).post('/api/nutrition/claim').send({ date: '2019-01-01' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Can only claim nutrition XP for today' });
    expect(prisma.nutritionXpClaim.create).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('rejects a date two days ago with 400', async () => {
    const res = await request(app).post('/api/nutrition/claim').send({ date: utcDayOffset(-2) });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Can only claim nutrition XP for today');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it.each([['today', 0], ['yesterday', -1], ['tomorrow', 1]])('allows %s past the window check', async (_l, off) => {
    const res = await request(app).post('/api/nutrition/claim').send({ date: utcDayOffset(off as number) });
    expect(res.status).toBe(404);
    expect(prisma.user.findUnique).toHaveBeenCalled();
  });

  it('returns 500 JSON when the database throws', async () => {
    vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error('db down'));
    const res = await request(app).post('/api/nutrition/claim').send({ date: utcDayOffset(0) });
    expect(res.status).toBe(500);
    expect(res.body.error).toBeDefined();
  });
});

describe('weekStartOf', () => {
  it('returns the Monday of the week for a mid-week date', () => {
    // 2026-08-06 is a Thursday.
    expect(weekStartOf('2026-08-06')).toBe('2026-08-03');
  });

  it('is a no-op on a Monday', () => {
    expect(weekStartOf('2026-08-03')).toBe('2026-08-03');
  });

  it('maps Sunday back to the Monday that opened its week', () => {
    // 2026-08-09 is a Sunday; its week opened Monday the 3rd.
    expect(weekStartOf('2026-08-09')).toBe('2026-08-03');
  });

  it('gives the SAME week start for every day Mon–Sun', () => {
    const days = ['2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07', '2026-08-08', '2026-08-09'];
    const starts = new Set(days.map(weekStartOf));
    expect(starts.size).toBe(1);
    expect([...starts][0]).toBe('2026-08-03');
  });

  it('rolls to the next week on the following Monday', () => {
    expect(weekStartOf('2026-08-10')).toBe('2026-08-10');
  });

  it('crosses a month boundary correctly', () => {
    // 2026-08-01 is a Saturday; week opened Monday 2026-07-27.
    expect(weekStartOf('2026-08-01')).toBe('2026-07-27');
  });
});

describe('energyBalanceTdee', () => {
  const logged = (n: number, kcal: number) => Array.from({ length: n }, () => kcal);

  it('recovers maintenance when weight is stable', () => {
    // Ate 2500/day, weight flat over 14 days → maintenance ≈ 2500.
    const tdee = energyBalanceTdee(logged(10, 2500), { startKg: 80, endKg: 80, spanDays: 14 });
    expect(tdee).toBe(2500);
  });

  it('reports maintenance ABOVE intake when weight fell', () => {
    // Lost 1 kg over 14 days on 2000/day: deficit ≈ 7700/14 ≈ 550 → ~2550.
    const tdee = energyBalanceTdee(logged(10, 2000), { startKg: 81, endKg: 80, spanDays: 14 });
    expect(tdee).toBeGreaterThan(2000);
    expect(tdee).toBe(2550);
  });

  it('reports maintenance BELOW intake when weight rose', () => {
    const tdee = energyBalanceTdee(logged(10, 3000), { startKg: 80, endKg: 81, spanDays: 14 });
    expect(tdee).toBeLessThan(3000);
  });

  it('returns null without enough logged days', () => {
    expect(energyBalanceTdee(logged(6, 2500), { startKg: 80, endKg: 80, spanDays: 14 })).toBeNull();
  });

  it('returns null when the weight span is too short to trust', () => {
    expect(energyBalanceTdee(logged(10, 2500), { startKg: 80, endKg: 80, spanDays: 5 })).toBeNull();
  });

  it('returns null with no weight data at all', () => {
    expect(energyBalanceTdee(logged(10, 2500), null)).toBeNull();
  });

  it('rejects nonsense outside the sane clamp', () => {
    // A huge fabricated loss would imply an absurd maintenance → discarded.
    expect(energyBalanceTdee(logged(10, 2000), { startKg: 90, endKg: 80, spanDays: 10 })).toBeNull();
  });

  it('averages only the days it is given, ignoring unlogged days', () => {
    // Mixed intake: 7 days, average of the values passed.
    const tdee = energyBalanceTdee([2000, 2200, 2400, 2600, 2000, 2200, 2400], { startKg: 80, endKg: 80, spanDays: 14 });
    expect(tdee).toBe(2257); // rounded mean
  });
});
