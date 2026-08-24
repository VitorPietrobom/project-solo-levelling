import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index';
import { getDailyPeriodKey, selectActiveTemplates } from '../lib/specialQuests';

vi.mock('../lib/prisma', () => ({
  default: {
    dailyActivity: { upsert: vi.fn().mockResolvedValue({}) },
    user: {
      update: vi.fn().mockResolvedValue({ totalXP: 100 }),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      upsert: vi.fn().mockResolvedValue({}),
    },
    specialQuestCompletion: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
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

import prisma from '../lib/prisma';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/special-quests', () => {
  it('returns 3 daily, 3 weekly, and 2 monthly quests with completion state', async () => {
    (prisma.specialQuestCompletion.findMany as any).mockResolvedValue([]);

    const res = await request(app).get('/api/special-quests');

    expect(res.status).toBe(200);
    expect(res.body.daily).toHaveLength(3);
    expect(res.body.weekly).toHaveLength(3);
    expect(res.body.monthly).toHaveLength(2);
    expect(res.body.daily[0].completed).toBe(false);
  });

  it('marks a quest completed when a matching claim exists', async () => {
    const todayKey = getDailyPeriodKey(new Date());
    const dailyPick = selectActiveTemplates('daily', todayKey, 'test-user-id')[0]!;
    (prisma.specialQuestCompletion.findMany as any).mockResolvedValue([
      { userId: 'test-user-id', templateId: dailyPick.id, periodKey: todayKey, xpAwarded: dailyPick.xpReward },
    ]);

    const res = await request(app).get('/api/special-quests');

    const found = res.body.daily.find((q: any) => q.id === dailyPick.id);
    expect(found.completed).toBe(true);
  });

  it('fills in a vary-templated quest with a concrete value, not the raw {token}', async () => {
    (prisma.specialQuestCompletion.findMany as any).mockResolvedValue([]);

    const res = await request(app).get('/api/special-quests');

    const varied = res.body.daily.filter((q: any) => /\{.*\}/.test(q.title));
    expect(varied).toHaveLength(0);
  });
});

describe('PATCH /api/special-quests/:templateId', () => {
  // Pick a template guaranteed to be one of today's 3 active daily picks
  // for this test user, since the pool is bigger than the pick count.
  const todayKey = getDailyPeriodKey(new Date());
  const activeDaily = selectActiveTemplates('daily', todayKey, 'test-user-id')[0]!;

  it('rejects a non-boolean completed value', async () => {
    const res = await request(app).patch(`/api/special-quests/${activeDaily.id}`).send({});
    expect(res.status).toBe(400);
  });

  it('404s for a templateId that does not exist', async () => {
    const res = await request(app).patch('/api/special-quests/not-a-real-id').send({ completed: true });
    expect(res.status).toBe(404);
  });

  it('claims XP and records a completion when marking a quest done', async () => {
    (prisma.specialQuestCompletion.findUnique as any).mockResolvedValue(null);
    (prisma.specialQuestCompletion.create as any).mockResolvedValue({});

    const res = await request(app).patch(`/api/special-quests/${activeDaily.id}`).send({ completed: true });

    expect(res.status).toBe(200);
    expect(res.body.completed).toBe(true);
    expect(prisma.specialQuestCompletion.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: 'test-user-id', templateId: activeDaily.id, xpAwarded: activeDaily.xpReward }),
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'test-user-id' },
      data: { totalXP: { increment: activeDaily.xpReward } },
    });
  });

  it('does not double-award XP if already completed this period', async () => {
    (prisma.specialQuestCompletion.findUnique as any).mockResolvedValue({ id: 'existing-id', xpAwarded: activeDaily.xpReward });

    const res = await request(app).patch(`/api/special-quests/${activeDaily.id}`).send({ completed: true });

    expect(res.status).toBe(200);
    expect(prisma.specialQuestCompletion.create).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('revokes XP and deletes the claim when un-completing', async () => {
    (prisma.specialQuestCompletion.findUnique as any).mockResolvedValue({ id: 'existing-id', xpAwarded: activeDaily.xpReward });

    const res = await request(app).patch(`/api/special-quests/${activeDaily.id}`).send({ completed: false });

    expect(res.status).toBe(200);
    expect(res.body.completed).toBe(false);
    expect(prisma.specialQuestCompletion.delete).toHaveBeenCalledWith({ where: { id: 'existing-id' } });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'test-user-id' },
      data: { totalXP: { decrement: activeDaily.xpReward } },
    });
  });

  it('404s a template that is not one of this period\'s active picks', async () => {
    // selectActiveTemplates only returns 3 of the 12 daily templates each
    // day — some ids will always be inactive.
    const active = new Set(selectActiveTemplates('daily', todayKey, 'test-user-id').map((t) => t.id));
    const allDailyIds = [
      'd-log-meals', 'd-hit-protein', 'd-workout', 'd-read', 'd-practice-skill', 'd-water', 'd-sleep',
      'd-no-missed-habits', 'd-world-food', 'd-old-dislike', 'd-stranger-photo', 'd-steps',
    ];
    const inactiveId = allDailyIds.find((id) => !active.has(id));
    if (!inactiveId) return; // extremely unlikely all 8 are active (pool picks only 3), but guard anyway

    const res = await request(app).patch(`/api/special-quests/${inactiveId}`).send({ completed: true });
    expect(res.status).toBe(404);
  });
});
