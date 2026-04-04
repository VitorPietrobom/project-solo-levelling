import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index';

vi.mock('../lib/prisma', () => ({
  default: {
    task: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    user: {
      update: vi.fn(),
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

describe('Task endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/tasks', () => {
    it('returns tasks with computed completedToday for daily task completed today', async () => {
      const now = new Date();
      const tasks = [
        {
          id: 't1',
          userId: 'test-user-id',
          title: 'Meditate',
          recurrence: 'daily',
          xpReward: 25,
          completedToday: true,
          lastCompletedAt: now,
          createdAt: new Date(),
        },
      ];
      (prisma.task.findMany as any).mockResolvedValue(tasks);

      const res = await request(app).get('/api/tasks');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe('Meditate');
      expect(res.body[0].completedToday).toBe(true);
    });

    it('resets completedToday for daily task completed yesterday', async () => {
      const yesterday = new Date();
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      yesterday.setUTCHours(10, 0, 0, 0);

      const tasks = [
        {
          id: 't1',
          userId: 'test-user-id',
          title: 'Meditate',
          recurrence: 'daily',
          xpReward: 25,
          completedToday: true,
          lastCompletedAt: yesterday,
          createdAt: new Date(),
        },
      ];
      (prisma.task.findMany as any).mockResolvedValue(tasks);

      const res = await request(app).get('/api/tasks');

      expect(res.status).toBe(200);
      expect(res.body[0].completedToday).toBe(false);
    });

    it('returns completedToday false for tasks never completed', async () => {
      const tasks = [
        {
          id: 't1',
          userId: 'test-user-id',
          title: 'Read',
          recurrence: 'weekly',
          xpReward: 50,
          completedToday: false,
          lastCompletedAt: null,
          createdAt: new Date(),
        },
      ];
      (prisma.task.findMany as any).mockResolvedValue(tasks);

      const res = await request(app).get('/api/tasks');

      expect(res.status).toBe(200);
      expect(res.body[0].completedToday).toBe(false);
    });

    it('resets completedToday for weekly task completed last week', async () => {
      const lastWeek = new Date();
      lastWeek.setUTCDate(lastWeek.getUTCDate() - 8);

      const tasks = [
        {
          id: 't1',
          userId: 'test-user-id',
          title: 'Weekly review',
          recurrence: 'weekly',
          xpReward: 100,
          completedToday: true,
          lastCompletedAt: lastWeek,
          createdAt: new Date(),
        },
      ];
      (prisma.task.findMany as any).mockResolvedValue(tasks);

      const res = await request(app).get('/api/tasks');

      expect(res.status).toBe(200);
      expect(res.body[0].completedToday).toBe(false);
    });
  });

  describe('POST /api/tasks', () => {
    it('creates a daily task', async () => {
      const created = {
        id: 't1',
        userId: 'test-user-id',
        title: 'Meditate',
        recurrence: 'daily',
        xpReward: 25,
        completedToday: false,
        lastCompletedAt: null,
        createdAt: new Date(),
      };
      (prisma.task.create as any).mockResolvedValue(created);

      const res = await request(app)
        .post('/api/tasks')
        .send({ title: 'Meditate', recurrence: 'daily', xpReward: 25 });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Meditate');
      expect(res.body.recurrence).toBe('daily');
    });

    it('returns 400 when title is missing', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({ recurrence: 'daily', xpReward: 25 });

      expect(res.status).toBe(400);
    });

    it('returns 400 when recurrence is invalid', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({ title: 'Task', recurrence: 'monthly', xpReward: 25 });

      expect(res.status).toBe(400);
    });

    it('returns 400 when xpReward is negative', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({ title: 'Task', recurrence: 'daily', xpReward: -10 });

      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /api/tasks/:id/complete', () => {
    it('marks a task as complete and awards XP', async () => {
      const task = {
        id: 't1',
        userId: 'test-user-id',
        title: 'Meditate',
        recurrence: 'daily',
        xpReward: 25,
        completedToday: false,
        lastCompletedAt: null,
        createdAt: new Date(),
      };
      (prisma.task.findFirst as any).mockResolvedValue(task);
      (prisma.task.update as any).mockResolvedValue({
        ...task,
        completedToday: true,
        lastCompletedAt: new Date(),
      });
      (prisma.user.update as any).mockResolvedValue({ totalXP: 25 });

      const res = await request(app).patch('/api/tasks/t1/complete');

      expect(res.status).toBe(200);
      expect(res.body.completedToday).toBe(true);
      expect(prisma.user.update).toHaveBeenCalled();
    });

    it('returns 404 when task not found', async () => {
      (prisma.task.findFirst as any).mockResolvedValue(null);

      const res = await request(app).patch('/api/tasks/bad-id/complete');

      expect(res.status).toBe(404);
    });

    it('returns 400 when task is already completed for this period', async () => {
      const now = new Date();
      const task = {
        id: 't1',
        userId: 'test-user-id',
        title: 'Meditate',
        recurrence: 'daily',
        xpReward: 25,
        completedToday: true,
        lastCompletedAt: now,
        createdAt: new Date(),
      };
      (prisma.task.findFirst as any).mockResolvedValue(task);

      const res = await request(app).patch('/api/tasks/t1/complete');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Task is already completed for this period');
    });
  });
});
