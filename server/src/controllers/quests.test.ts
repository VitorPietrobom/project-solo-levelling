import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index';

vi.mock('../lib/prisma', () => ({
  default: {
    quest: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    questStep: {
      update: vi.fn(),
    },
    user: {
      update: vi.fn(),
    },
  },
}));

vi.mock('../middleware/auth', async () => {
  const actual = await vi.importActual('../middleware/auth');
  return {
    ...actual,
    authMiddleware: (req: any, _res: any, next: any) => {
      req.user = { id: 'test-user-id', email: 'test@example.com' };
      next();
    },
  };
});

import prisma from '../lib/prisma';

describe('Quest endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/quests', () => {
    it('returns all quests with steps for the user', async () => {
      const quests = [
        {
          id: 'q1',
          title: 'Learn TypeScript',
          description: 'Master TS',
          xpReward: 100,
          completed: false,
          steps: [
            { id: 's1', description: 'Read docs', sortOrder: 0, completed: false },
            { id: 's2', description: 'Build project', sortOrder: 1, completed: false },
          ],
        },
      ];
      (prisma.quest.findMany as any).mockResolvedValue(quests);

      const res = await request(app).get('/api/quests');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe('Learn TypeScript');
      expect(res.body[0].steps).toHaveLength(2);
    });
  });

  describe('POST /api/quests', () => {
    it('creates a quest with steps', async () => {
      const created = {
        id: 'q1',
        userId: 'test-user-id',
        title: 'Learn Guitar',
        description: 'Practice daily',
        xpReward: 200,
        completed: false,
        steps: [
          { id: 's1', description: 'Buy guitar', sortOrder: 0, completed: false },
          { id: 's2', description: 'Learn chords', sortOrder: 1, completed: false },
        ],
      };
      (prisma.quest.create as any).mockResolvedValue(created);

      const res = await request(app)
        .post('/api/quests')
        .send({
          title: 'Learn Guitar',
          description: 'Practice daily',
          xpReward: 200,
          steps: ['Buy guitar', 'Learn chords'],
        });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Learn Guitar');
      expect(res.body.steps).toHaveLength(2);
    });

    it('returns 400 when title is missing', async () => {
      const res = await request(app)
        .post('/api/quests')
        .send({ description: 'No title', xpReward: 50, steps: ['step'] });

      expect(res.status).toBe(400);
    });

    it('returns 400 when steps array is empty', async () => {
      const res = await request(app)
        .post('/api/quests')
        .send({ title: 'Quest', description: 'Desc', xpReward: 50, steps: [] });

      expect(res.status).toBe(400);
    });

    it('returns 400 when xpReward is negative', async () => {
      const res = await request(app)
        .post('/api/quests')
        .send({ title: 'Quest', description: 'Desc', xpReward: -10, steps: ['step'] });

      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /api/quests/:id/steps/:stepId', () => {
    it('marks a step as complete', async () => {
      const quest = {
        id: 'q1',
        userId: 'test-user-id',
        title: 'Quest',
        xpReward: 100,
        completed: false,
        steps: [
          { id: 's1', description: 'Step 1', sortOrder: 0, completed: false },
          { id: 's2', description: 'Step 2', sortOrder: 1, completed: false },
        ],
      };
      (prisma.quest.findFirst as any).mockResolvedValue(quest);
      (prisma.questStep.update as any).mockResolvedValue({});
      (prisma.quest.findUnique as any).mockResolvedValue({
        ...quest,
        steps: [
          { ...quest.steps[0], completed: true },
          quest.steps[1],
        ],
      });

      const res = await request(app).patch('/api/quests/q1/steps/s1');

      expect(res.status).toBe(200);
      expect(res.body.steps[0].completed).toBe(true);
    });

    it('auto-completes quest and awards XP when all steps done', async () => {
      const quest = {
        id: 'q1',
        userId: 'test-user-id',
        title: 'Quest',
        xpReward: 100,
        completed: false,
        steps: [
          { id: 's1', description: 'Step 1', sortOrder: 0, completed: true },
          { id: 's2', description: 'Step 2', sortOrder: 1, completed: false },
        ],
      };
      (prisma.quest.findFirst as any).mockResolvedValue(quest);
      (prisma.questStep.update as any).mockResolvedValue({});
      (prisma.quest.update as any).mockResolvedValue({});
      (prisma.user.update as any).mockResolvedValue({ totalXP: 100 });
      (prisma.quest.findUnique as any).mockResolvedValue({
        ...quest,
        completed: true,
        steps: quest.steps.map((s) => ({ ...s, completed: true })),
      });

      const res = await request(app).patch('/api/quests/q1/steps/s2');

      expect(res.status).toBe(200);
      expect(res.body.completed).toBe(true);
      expect(prisma.quest.update).toHaveBeenCalledWith({
        where: { id: 'q1' },
        data: { completed: true },
      });
      expect(prisma.user.update).toHaveBeenCalled();
    });

    it('returns 404 when quest not found', async () => {
      (prisma.quest.findFirst as any).mockResolvedValue(null);

      const res = await request(app).patch('/api/quests/bad-id/steps/s1');

      expect(res.status).toBe(404);
    });

    it('returns 400 when step is already completed', async () => {
      const quest = {
        id: 'q1',
        userId: 'test-user-id',
        title: 'Quest',
        xpReward: 100,
        completed: false,
        steps: [
          { id: 's1', description: 'Step 1', sortOrder: 0, completed: true },
        ],
      };
      (prisma.quest.findFirst as any).mockResolvedValue(quest);

      const res = await request(app).patch('/api/quests/q1/steps/s1');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('This step is already completed');
    });

    it('returns 400 when quest is already completed', async () => {
      const quest = {
        id: 'q1',
        userId: 'test-user-id',
        title: 'Quest',
        xpReward: 100,
        completed: true,
        steps: [
          { id: 's1', description: 'Step 1', sortOrder: 0, completed: true },
        ],
      };
      (prisma.quest.findFirst as any).mockResolvedValue(quest);

      const res = await request(app).patch('/api/quests/q1/steps/s1');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Quest is already completed');
    });
  });
});
