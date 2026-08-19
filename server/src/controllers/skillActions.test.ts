import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index';

vi.mock('../lib/prisma', () => ({
  default: {
    skillAction: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    skillActionLog: {
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn().mockResolvedValue({}),
    },
    skill: {
      findFirst: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
    user: {
      update: vi.fn().mockResolvedValue({ totalXP: 100 }),
      upsert: vi.fn().mockResolvedValue({}),
    },
    dailyActivity: {
      upsert: vi.fn().mockResolvedValue({}),
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

describe('Skill action endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.skillActionLog.count as any).mockResolvedValue(0);
    (prisma.skillActionLog.create as any).mockResolvedValue({});
    (prisma.skill.update as any).mockResolvedValue({});
    (prisma.user.update as any).mockResolvedValue({ totalXP: 100 });
    (prisma.dailyActivity.upsert as any).mockResolvedValue({});
  });

  describe('GET /api/skill-actions', () => {
    it('lists actions for a skill', async () => {
      (prisma.skillAction.findMany as any).mockResolvedValue([{ id: 'a1', skillId: 'sk1', name: 'Play', xpReward: 30 }]);

      const res = await request(app).get('/api/skill-actions').query({ skillId: 'sk1' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });

    it('requires a skillId', async () => {
      const res = await request(app).get('/api/skill-actions');
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/skill-actions', () => {
    it('creates an action after validating skill ownership', async () => {
      (prisma.skill.findFirst as any).mockResolvedValue({ id: 'sk1', userId: 'test-user-id' });
      (prisma.skillAction.create as any).mockResolvedValue({ id: 'a1', skillId: 'sk1', name: 'Play', xpReward: 30 });

      const res = await request(app).post('/api/skill-actions').send({ skillId: 'sk1', name: 'Play', xpReward: 30 });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Play');
    });

    it('rejects a skill the user does not own', async () => {
      (prisma.skill.findFirst as any).mockResolvedValue(null);

      const res = await request(app).post('/api/skill-actions').send({ skillId: 'sk1', name: 'Play', xpReward: 30 });

      expect(res.status).toBe(400);
    });

    it('rejects a non-positive xpReward', async () => {
      const res = await request(app).post('/api/skill-actions').send({ skillId: 'sk1', name: 'Play', xpReward: 0 });
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/skill-actions/:id', () => {
    it('deletes an action the user owns', async () => {
      (prisma.skillAction.findFirst as any).mockResolvedValue({ id: 'a1', userId: 'test-user-id' });

      const res = await request(app).delete('/api/skill-actions/a1');

      expect(res.status).toBe(204);
      expect(prisma.skillAction.delete).toHaveBeenCalledWith({ where: { id: 'a1' } });
    });

    it('returns 404 for an action that does not belong to the user', async () => {
      (prisma.skillAction.findFirst as any).mockResolvedValue(null);

      const res = await request(app).delete('/api/skill-actions/a1');

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/skill-actions/:id/log', () => {
    it('awards full XP on the first log of the day', async () => {
      (prisma.skillAction.findFirst as any).mockResolvedValue({ id: 'a1', skillId: 'sk1', userId: 'test-user-id', xpReward: 30 });
      (prisma.skillActionLog.count as any).mockResolvedValue(0);

      const res = await request(app).post('/api/skill-actions/a1/log');

      expect(res.status).toBe(200);
      expect(res.body.xpAwarded).toBe(30);
      expect(res.body.multiplier).toBe(1);
      expect(prisma.skill.update).toHaveBeenCalledWith({ where: { id: 'sk1' }, data: expect.objectContaining({ totalXP: { increment: 30 } }) });
      expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'test-user-id' }, data: { totalXP: { increment: 30 } } });
    });

    it('applies a diminishing multiplier to repeat logs the same day', async () => {
      (prisma.skillAction.findFirst as any).mockResolvedValue({ id: 'a1', skillId: 'sk1', userId: 'test-user-id', xpReward: 100 });
      (prisma.skillActionLog.count as any).mockResolvedValue(1);

      const res = await request(app).post('/api/skill-actions/a1/log');

      expect(res.status).toBe(200);
      expect(res.body.multiplier).toBe(0.6);
      expect(res.body.xpAwarded).toBe(60);
    });

    it('floors the multiplier after several repeats in one day', async () => {
      (prisma.skillAction.findFirst as any).mockResolvedValue({ id: 'a1', skillId: 'sk1', userId: 'test-user-id', xpReward: 100 });
      (prisma.skillActionLog.count as any).mockResolvedValue(10);

      const res = await request(app).post('/api/skill-actions/a1/log');

      expect(res.body.multiplier).toBe(0.25);
      expect(res.body.xpAwarded).toBe(25);
    });

    it('returns 404 for an action that does not belong to the user', async () => {
      (prisma.skillAction.findFirst as any).mockResolvedValue(null);

      const res = await request(app).post('/api/skill-actions/a1/log');

      expect(res.status).toBe(404);
    });
  });
});
