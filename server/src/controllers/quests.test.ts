import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index';

vi.mock('../lib/prisma', () => ({
  default: {
    dailyActivity: {
      upsert: vi.fn().mockResolvedValue({}),
    },
    quest: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
      update: vi.fn(),
    },
    questStep: {
      update: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    user: {
      update: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      upsert: vi.fn().mockResolvedValue({}),
    },
    skill: {
      findFirst: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
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

    it('defaults priority to medium and dueDate to null when omitted', async () => {
      (prisma.quest.create as any).mockResolvedValue({ id: 'q1', priority: 'medium', dueDate: null, steps: [] });

      await request(app).post('/api/quests').send({ title: 'Quest', description: 'Desc', xpReward: 10, steps: ['s'] });

      expect(prisma.quest.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ priority: 'medium', dueDate: null }),
      }));
    });

    it('accepts an explicit priority and due date', async () => {
      (prisma.quest.create as any).mockResolvedValue({ id: 'q1', priority: 'high', steps: [] });

      await request(app).post('/api/quests').send({
        title: 'Quest', description: 'Desc', xpReward: 10, steps: ['s'], priority: 'high', dueDate: '2026-12-25',
      });

      expect(prisma.quest.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ priority: 'high', dueDate: new Date('2026-12-25T00:00:00Z') }),
      }));
    });

    it('returns 400 for an invalid priority', async () => {
      const res = await request(app)
        .post('/api/quests')
        .send({ title: 'Quest', description: 'Desc', xpReward: 10, steps: ['s'], priority: 'urgent' });
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

    it('re-toggling an already-completed step is a no-op that returns 200', async () => {
      // The old version 400'd here, which meant a checklist could never
      // actually be unchecked once ticked.
      const quest = {
        id: 'q1', userId: 'test-user-id', title: 'Quest', xpReward: 100, completed: false,
        steps: [{ id: 's1', description: 'Step 1', sortOrder: 0, completed: true }],
      };
      (prisma.quest.findFirst as any).mockResolvedValue(quest);

      const res = await request(app).patch('/api/quests/q1/steps/s1').send({ completed: true });

      expect(res.status).toBe(200);
      expect(prisma.questStep.update).not.toHaveBeenCalled();
    });

    it('unchecks a completed step (no body = toggle)', async () => {
      const quest = {
        id: 'q1', userId: 'test-user-id', title: 'Quest', xpReward: 100, completed: false,
        steps: [
          { id: 's1', description: 'Step 1', sortOrder: 0, completed: true },
          { id: 's2', description: 'Step 2', sortOrder: 1, completed: false },
        ],
      };
      (prisma.quest.findFirst as any).mockResolvedValue(quest);
      (prisma.questStep.update as any).mockResolvedValue({});
      (prisma.quest.findUnique as any).mockResolvedValue({
        ...quest,
        steps: [{ ...quest.steps[0], completed: false }, quest.steps[1]],
      });

      const res = await request(app).patch('/api/quests/q1/steps/s1');

      expect(res.status).toBe(200);
      expect(prisma.questStep.update).toHaveBeenCalledWith({ where: { id: 's1' }, data: { completed: false } });
      expect(res.body.steps[0].completed).toBe(false);
    });

    it('reopens a completed quest and claws back its XP when a step is unchecked', async () => {
      const quest = {
        id: 'q1', userId: 'test-user-id', title: 'Quest', xpReward: 100, completed: true,
        steps: [{ id: 's1', description: 'Step 1', sortOrder: 0, completed: true }],
      };
      (prisma.quest.findFirst as any).mockResolvedValue(quest);
      (prisma.questStep.update as any).mockResolvedValue({});
      (prisma.quest.update as any).mockResolvedValue({});
      (prisma.user.update as any).mockResolvedValue({ totalXP: 0 });
      (prisma.quest.findUnique as any).mockResolvedValue({ ...quest, completed: false, steps: [{ ...quest.steps[0], completed: false }] });

      const res = await request(app).patch('/api/quests/q1/steps/s1');

      expect(res.status).toBe(200);
      expect(prisma.quest.update).toHaveBeenCalledWith({ where: { id: 'q1' }, data: { completed: false } });
      expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'test-user-id' }, data: { totalXP: { decrement: 100 } } });
    });

    it('returns 404 for an unknown step id', async () => {
      const quest = {
        id: 'q1', userId: 'test-user-id', title: 'Quest', xpReward: 100, completed: false,
        steps: [{ id: 's1', description: 'Step 1', sortOrder: 0, completed: false }],
      };
      (prisma.quest.findFirst as any).mockResolvedValue(quest);

      const res = await request(app).patch('/api/quests/q1/steps/ghost');

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/quests/:id/reset', () => {
    it('clears every step and reopens the quest, clawing back XP if it was completed', async () => {
      const quest = {
        id: 'q1', userId: 'test-user-id', title: 'Quest', xpReward: 150, completed: true,
        steps: [
          { id: 's1', description: 'Step 1', sortOrder: 0, completed: true },
          { id: 's2', description: 'Step 2', sortOrder: 1, completed: true },
        ],
      };
      (prisma.quest.findFirst as any).mockResolvedValue(quest);
      (prisma.quest.findUnique as any).mockResolvedValue({ ...quest, completed: false, steps: quest.steps.map((s) => ({ ...s, completed: false })) });

      const res = await request(app).patch('/api/quests/q1/reset');

      expect(res.status).toBe(200);
      expect(prisma.questStep.updateMany).toHaveBeenCalledWith({ where: { questId: 'q1' }, data: { completed: false } });
      expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'test-user-id' }, data: { totalXP: { decrement: 150 } } });
      expect(res.body.completed).toBe(false);
    });

    it('does not touch XP when the quest was never completed', async () => {
      const quest = {
        id: 'q1', userId: 'test-user-id', title: 'Quest', xpReward: 150, completed: false,
        steps: [{ id: 's1', description: 'Step 1', sortOrder: 0, completed: true }],
      };
      (prisma.quest.findFirst as any).mockResolvedValue(quest);
      (prisma.quest.findUnique as any).mockResolvedValue({ ...quest, steps: [{ ...quest.steps[0], completed: false }] });

      await request(app).patch('/api/quests/q1/reset');

      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('returns 404 when the quest does not exist', async () => {
      (prisma.quest.findFirst as any).mockResolvedValue(null);
      const res = await request(app).patch('/api/quests/ghost/reset');
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/quests/:id', () => {
    it('updates priority and due date', async () => {
      (prisma.quest.findFirst as any).mockResolvedValue({ id: 'q1', userId: 'test-user-id' });
      (prisma.quest.update as any).mockResolvedValue({ id: 'q1', priority: 'high', dueDate: '2026-09-01' });

      const res = await request(app).patch('/api/quests/q1').send({ priority: 'high', dueDate: '2026-09-01' });

      expect(res.status).toBe(200);
      expect(prisma.quest.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'q1' },
        data: { priority: 'high', dueDate: new Date('2026-09-01T00:00:00Z') },
      }));
    });

    it('clears the due date when sent null', async () => {
      (prisma.quest.findFirst as any).mockResolvedValue({ id: 'q1', userId: 'test-user-id' });
      (prisma.quest.update as any).mockResolvedValue({ id: 'q1', dueDate: null });

      await request(app).patch('/api/quests/q1').send({ dueDate: null });

      expect(prisma.quest.update).toHaveBeenCalledWith(expect.objectContaining({ data: { dueDate: null } }));
    });

    it('rejects an invalid priority', async () => {
      (prisma.quest.findFirst as any).mockResolvedValue({ id: 'q1', userId: 'test-user-id' });
      const res = await request(app).patch('/api/quests/q1').send({ priority: 'urgent' });
      expect(res.status).toBe(400);
    });

    it('returns 404 for a quest that does not belong to the user', async () => {
      (prisma.quest.findFirst as any).mockResolvedValue(null);
      const res = await request(app).patch('/api/quests/q1').send({ priority: 'high' });
      expect(res.status).toBe(404);
    });

    it('links a skill after validating it belongs to the user', async () => {
      (prisma.quest.findFirst as any).mockResolvedValue({ id: 'q1', userId: 'test-user-id' });
      (prisma.skill.findFirst as any).mockResolvedValue({ id: 'sk1', userId: 'test-user-id' });
      (prisma.quest.update as any).mockResolvedValue({ id: 'q1', linkedSkillId: 'sk1' });

      const res = await request(app).patch('/api/quests/q1').send({ linkedSkillId: 'sk1' });

      expect(res.status).toBe(200);
      expect(prisma.quest.update).toHaveBeenCalledWith(expect.objectContaining({ data: { linkedSkillId: 'sk1' } }));
    });

    it('rejects linking a skill that is not the user\'s', async () => {
      (prisma.quest.findFirst as any).mockResolvedValue({ id: 'q1', userId: 'test-user-id' });
      (prisma.skill.findFirst as any).mockResolvedValue(null);

      const res = await request(app).patch('/api/quests/q1').send({ linkedSkillId: 'someone-elses' });

      expect(res.status).toBe(400);
      expect(prisma.quest.update).not.toHaveBeenCalled();
    });

    it('unlinks a skill when sent an empty string', async () => {
      (prisma.quest.findFirst as any).mockResolvedValue({ id: 'q1', userId: 'test-user-id' });
      (prisma.quest.update as any).mockResolvedValue({ id: 'q1', linkedSkillId: null });

      await request(app).patch('/api/quests/q1').send({ linkedSkillId: '' });

      expect(prisma.quest.update).toHaveBeenCalledWith(expect.objectContaining({ data: { linkedSkillId: null } }));
    });
  });

  describe('quest ↔ skill XP', () => {
    it('grants the linked skill XP when the last step completes the quest', async () => {
      const quest = {
        id: 'q1', userId: 'test-user-id', title: 'Quest', xpReward: 100, completed: false, linkedSkillId: 'sk1',
        steps: [{ id: 's1', description: 'Step 1', sortOrder: 0, completed: false }],
      };
      (prisma.quest.findFirst as any).mockResolvedValue(quest);
      (prisma.questStep.update as any).mockResolvedValue({});
      (prisma.quest.update as any).mockResolvedValue({});
      (prisma.user.update as any).mockResolvedValue({ totalXP: 100 });
      (prisma.quest.findUnique as any).mockResolvedValue({ ...quest, completed: true, steps: [{ ...quest.steps[0], completed: true }] });

      await request(app).patch('/api/quests/q1/steps/s1');

      expect(prisma.skill.update).toHaveBeenCalledWith({ where: { id: 'sk1' }, data: { totalXP: { increment: 100 } } });
    });

    it('claws back skill XP when a step is unchecked on a completed linked quest', async () => {
      const quest = {
        id: 'q1', userId: 'test-user-id', title: 'Quest', xpReward: 100, completed: true, linkedSkillId: 'sk1',
        steps: [{ id: 's1', description: 'Step 1', sortOrder: 0, completed: true }],
      };
      (prisma.quest.findFirst as any).mockResolvedValue(quest);
      (prisma.questStep.update as any).mockResolvedValue({});
      (prisma.quest.update as any).mockResolvedValue({});
      (prisma.user.update as any).mockResolvedValue({});
      (prisma.quest.findUnique as any).mockResolvedValue({ ...quest, completed: false, steps: [{ ...quest.steps[0], completed: false }] });

      await request(app).patch('/api/quests/q1/steps/s1');

      expect(prisma.skill.update).toHaveBeenCalledWith({ where: { id: 'sk1' }, data: { totalXP: { decrement: 100 } } });
    });

    it('does not touch a skill when the quest has none linked', async () => {
      const quest = {
        id: 'q1', userId: 'test-user-id', title: 'Quest', xpReward: 100, completed: false, linkedSkillId: null,
        steps: [{ id: 's1', description: 'Step 1', sortOrder: 0, completed: false }],
      };
      (prisma.quest.findFirst as any).mockResolvedValue(quest);
      (prisma.questStep.update as any).mockResolvedValue({});
      (prisma.quest.update as any).mockResolvedValue({});
      (prisma.user.update as any).mockResolvedValue({});
      (prisma.quest.findUnique as any).mockResolvedValue({ ...quest, completed: true, steps: [{ ...quest.steps[0], completed: true }] });

      await request(app).patch('/api/quests/q1/steps/s1');

      expect(prisma.skill.update).not.toHaveBeenCalled();
    });

    it('grants skill XP on bulk-complete (drag to Done)', async () => {
      const quest = {
        id: 'q1', userId: 'test-user-id', xpReward: 60, completed: false, linkedSkillId: 'sk1',
        steps: [{ id: 's1', completed: false }],
      };
      (prisma.quest.findFirst as any).mockResolvedValue(quest);
      (prisma.quest.update as any).mockResolvedValue({});
      (prisma.user.update as any).mockResolvedValue({});
      (prisma.quest.findUnique as any).mockResolvedValue({ ...quest, completed: true });

      await request(app).patch('/api/quests/q1/complete');

      expect(prisma.skill.update).toHaveBeenCalledWith({ where: { id: 'sk1' }, data: { totalXP: { increment: 60 } } });
    });

    it('claws back skill XP on reset (drag to To Do) when the quest was completed', async () => {
      const quest = {
        id: 'q1', userId: 'test-user-id', xpReward: 60, completed: true, linkedSkillId: 'sk1',
        steps: [{ id: 's1', description: 'Step 1', sortOrder: 0, completed: true }],
      };
      (prisma.quest.findFirst as any).mockResolvedValue(quest);
      (prisma.quest.update as any).mockResolvedValue({});
      (prisma.user.update as any).mockResolvedValue({});
      (prisma.quest.findUnique as any).mockResolvedValue({ ...quest, completed: false, steps: [{ ...quest.steps[0], completed: false }] });

      await request(app).patch('/api/quests/q1/reset');

      expect(prisma.skill.update).toHaveBeenCalledWith({ where: { id: 'sk1' }, data: { totalXP: { decrement: 60 } } });
    });
  });

  describe('POST /api/quests with linkedSkillId', () => {
    it('creates a quest linked to a skill after validating ownership', async () => {
      (prisma.skill.findFirst as any).mockResolvedValue({ id: 'sk1', userId: 'test-user-id' });
      (prisma.quest.create as any).mockResolvedValue({ id: 'q1', linkedSkillId: 'sk1', steps: [] });

      const res = await request(app)
        .post('/api/quests')
        .send({ title: 'Quest', description: 'Desc', xpReward: 10, steps: ['s'], linkedSkillId: 'sk1' });

      expect(res.status).toBe(201);
      expect(prisma.quest.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ linkedSkillId: 'sk1' }),
      }));
    });

    it('rejects a linkedSkillId that does not belong to the user', async () => {
      (prisma.skill.findFirst as any).mockResolvedValue(null);

      const res = await request(app)
        .post('/api/quests')
        .send({ title: 'Quest', description: 'Desc', xpReward: 10, steps: ['s'], linkedSkillId: 'ghost' });

      expect(res.status).toBe(400);
      expect(prisma.quest.create).not.toHaveBeenCalled();
    });
  });

  describe('recurring quests (unified with the old Task model)', () => {
    it('creates a recurring quest without a description or steps', async () => {
      (prisma.quest.create as any).mockResolvedValue({ id: 'q1', recurrence: 'daily', completed: false, lastCompletedAt: null, steps: [] });

      const res = await request(app).post('/api/quests').send({ title: 'Drink water', xpReward: 10, recurrence: 'daily' });

      expect(res.status).toBe(201);
      expect(prisma.quest.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ recurrence: 'daily', description: null }),
      }));
    });

    it('rejects steps on a recurring quest', async () => {
      const res = await request(app).post('/api/quests').send({ title: 'Drink water', xpReward: 10, recurrence: 'daily', steps: ['a step'] });
      expect(res.status).toBe(400);
      expect(prisma.quest.create).not.toHaveBeenCalled();
    });

    it('rejects an invalid recurrence value', async () => {
      const res = await request(app).post('/api/quests').send({ title: 'Drink water', xpReward: 10, recurrence: 'monthly' });
      expect(res.status).toBe(400);
    });

    it('lists a recurring quest as completed once done today, not completed the next day', async () => {
      const today = new Date();
      const yesterday = new Date(today.getTime() - 25 * 60 * 60 * 1000); // > 24h ago, crosses midnight
      (prisma.quest.findMany as any).mockResolvedValue([
        { id: 'q1', recurrence: 'daily', completed: false, lastCompletedAt: today, steps: [] },
        { id: 'q2', recurrence: 'daily', completed: false, lastCompletedAt: yesterday, steps: [] },
      ]);

      const res = await request(app).get('/api/quests');

      expect(res.body.find((q: any) => q.id === 'q1').completed).toBe(true);
      expect(res.body.find((q: any) => q.id === 'q2').completed).toBe(false);
    });

    it('completing a recurring quest sets lastCompletedAt and awards XP', async () => {
      const quest = { id: 'q1', userId: 'test-user-id', xpReward: 20, recurrence: 'daily', completed: false, lastCompletedAt: null, linkedSkillId: null, steps: [] };
      (prisma.quest.findFirst as any).mockResolvedValue(quest);
      (prisma.quest.update as any).mockResolvedValue({});
      (prisma.user.update as any).mockResolvedValue({});
      (prisma.quest.findUnique as any).mockResolvedValue({ ...quest, lastCompletedAt: new Date() });

      const res = await request(app).patch('/api/quests/q1/complete');

      expect(res.status).toBe(200);
      expect(res.body.completed).toBe(true);
      expect(prisma.quest.update).toHaveBeenCalledWith({ where: { id: 'q1' }, data: { lastCompletedAt: expect.any(Date) } });
    });

    it('is a no-op completing a recurring quest already done this period', async () => {
      const quest = { id: 'q1', userId: 'test-user-id', xpReward: 20, recurrence: 'daily', completed: false, lastCompletedAt: new Date(), linkedSkillId: null, steps: [] };
      (prisma.quest.findFirst as any).mockResolvedValue(quest);

      await request(app).patch('/api/quests/q1/complete');

      expect(prisma.quest.update).not.toHaveBeenCalled();
    });

    it('reset uncompletes the current period and claws back XP', async () => {
      const quest = { id: 'q1', userId: 'test-user-id', xpReward: 20, recurrence: 'daily', completed: false, lastCompletedAt: new Date(), linkedSkillId: null, steps: [] };
      (prisma.quest.findFirst as any).mockResolvedValue(quest);
      (prisma.quest.update as any).mockResolvedValue({});
      (prisma.user.update as any).mockResolvedValue({});
      (prisma.quest.findUnique as any).mockResolvedValue({ ...quest, lastCompletedAt: null });

      const res = await request(app).patch('/api/quests/q1/reset');

      expect(res.status).toBe(200);
      expect(res.body.completed).toBe(false);
      expect(prisma.quest.update).toHaveBeenCalledWith({ where: { id: 'q1' }, data: { lastCompletedAt: null } });
      expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'test-user-id' }, data: { totalXP: { decrement: 20 } } });
    });
  });
});
