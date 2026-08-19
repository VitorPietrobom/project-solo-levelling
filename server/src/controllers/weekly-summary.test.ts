import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index';

vi.mock('../lib/prisma', () => ({
  default: {
    user: { findUnique: vi.fn(), upsert: vi.fn().mockResolvedValue({}) },
    quest: { findMany: vi.fn().mockResolvedValue([]) },
    skill: { findMany: vi.fn().mockResolvedValue([]) },
    weightEntry: { findMany: vi.fn().mockResolvedValue([]), findFirst: vi.fn().mockResolvedValue(null) },
    measurement: { findMany: vi.fn().mockResolvedValue([]) },
    gymSession: { findMany: vi.fn().mockResolvedValue([]) },
    foodEntry: { findMany: vi.fn().mockResolvedValue([]) },
    recipe: { findMany: vi.fn().mockResolvedValue([]) },
    document: { findMany: vi.fn().mockResolvedValue([]) },
    book: { findMany: vi.fn().mockResolvedValue([]) },
    journalEntry: { findMany: vi.fn().mockResolvedValue([]) },
    lessonLearned: { findMany: vi.fn().mockResolvedValue([]) },
  },
}));

vi.mock('../middleware/auth', async () => ({
  authMiddleware: (req: any, _res: any, next: any) => {
    req.user = { id: 'test-user-id', email: 'test@example.com' };
    next();
  },
}));

import prisma from '../lib/prisma';

describe('GET /api/weekly-summary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.quest.findMany as any).mockResolvedValue([]);
    (prisma.skill.findMany as any).mockResolvedValue([]);
    (prisma.weightEntry.findMany as any).mockResolvedValue([]);
    (prisma.weightEntry.findFirst as any).mockResolvedValue(null);
    (prisma.measurement.findMany as any).mockResolvedValue([]);
    (prisma.gymSession.findMany as any).mockResolvedValue([]);
    (prisma.foodEntry.findMany as any).mockResolvedValue([]);
    (prisma.recipe.findMany as any).mockResolvedValue([]);
    (prisma.document.findMany as any).mockResolvedValue([]);
    (prisma.book.findMany as any).mockResolvedValue([]);
    (prisma.journalEntry.findMany as any).mockResolvedValue([]);
    (prisma.lessonLearned.findMany as any).mockResolvedValue([]);
  });

  it('computes the Monday-Sunday week containing the given weekOf date', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ totalXP: 0, calorieGoal: 2000 });

    // Wednesday 2026-08-19 → week should be Mon 2026-08-17 to Sun 2026-08-23.
    const res = await request(app).get('/api/weekly-summary?weekOf=2026-08-19');

    expect(res.status).toBe(200);
    expect(res.body.weekStart).toBe('2026-08-17');
    expect(res.body.weekEnd).toBe('2026-08-23');
  });

  it('rejects an invalid weekOf date', async () => {
    const res = await request(app).get('/api/weekly-summary?weekOf=not-a-date');
    expect(res.status).toBe(400);
  });

  it('sums XP from completed quests and habits into the markdown', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ totalXP: 500, calorieGoal: 2000 });
    (prisma.quest.findMany as any).mockImplementation(({ where }: any) =>
      where.recurrence
        ? Promise.resolve([{ id: 'h1', title: 'Stretch', xpReward: 10, recurrence: 'daily' }])
        : Promise.resolve([{ id: 'q1', title: 'Learn Guitar', xpReward: 100, steps: [] }]),
    );

    const res = await request(app).get('/api/weekly-summary?weekOf=2026-08-19');

    expect(res.status).toBe(200);
    expect(res.body.markdown).toContain('XP Earned This Week:** 110 XP');
    expect(res.body.markdown).toContain('Learn Guitar (+100 XP)');
    expect(res.body.markdown).toContain('Habits Completed:** 1 total (1 daily, 0 weekly)');
  });

  it('reports weight change against the previous entry when there is one before this week', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ totalXP: 0, calorieGoal: 2000 });
    (prisma.weightEntry.findMany as any).mockResolvedValue([
      { weight: 80.5, date: new Date('2026-08-18') },
    ]);
    (prisma.weightEntry.findFirst as any).mockResolvedValue({ weight: 81.0, date: new Date('2026-08-10') });

    const res = await request(app).get('/api/weekly-summary?weekOf=2026-08-19');

    expect(res.body.markdown).toContain('Change: -0.5 kg');
  });

  it('shows "None" placeholders for every empty section instead of blank output', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ totalXP: 0, calorieGoal: 2000 });

    const res = await request(app).get('/api/weekly-summary?weekOf=2026-08-19');

    expect(res.body.markdown).toContain('**Quests Completed:** None');
    expect(res.body.markdown).toContain('**Weight:** No entries this week');
    expect(res.body.markdown).toContain('**Gym Sessions:** None this week');
    expect(res.body.markdown).toContain('**Calories:** No food entries this week');
    expect(res.body.markdown).toContain('**Documents:** None uploaded this week');
  });

  it('defaults totalXP to 0 when the user record has none', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);

    const res = await request(app).get('/api/weekly-summary?weekOf=2026-08-19');

    expect(res.status).toBe(200);
    expect(res.body.markdown).toContain('Current Level:** 0 (0 total XP)');
  });
});
