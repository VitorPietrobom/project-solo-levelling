import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index';

vi.mock('../lib/prisma', () => ({
  default: {
    skill: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    user: {
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

describe('Skill endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/skills', () => {
    it('returns skills with computed level and progress', async () => {
      const skills = [
        {
          id: 's1',
          userId: 'test-user-id',
          name: 'Guitar',
          totalXP: 150,
          createdAt: new Date(),
        },
        {
          id: 's2',
          userId: 'test-user-id',
          name: 'Cooking',
          totalXP: 0,
          createdAt: new Date(),
        },
      ];
      (prisma.skill.findMany as any).mockResolvedValue(skills);

      const res = await request(app).get('/api/skills');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].name).toBe('Guitar');
      expect(res.body[0].level).toBe(1);
      expect(res.body[0].progress).toBeDefined();
      expect(res.body[0].progress.current).toBeDefined();
      expect(res.body[0].progress.required).toBeDefined();
      expect(res.body[0].progress.percentage).toBeDefined();
      expect(res.body[1].name).toBe('Cooking');
      expect(res.body[1].level).toBe(0);
    });

    it('returns empty array when user has no skills', async () => {
      (prisma.skill.findMany as any).mockResolvedValue([]);

      const res = await request(app).get('/api/skills');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(0);
    });
  });

  describe('POST /api/skills', () => {
    it('creates a skill with initial 0 XP', async () => {
      const created = {
        id: 's1',
        userId: 'test-user-id',
        name: 'Guitar',
        totalXP: 0,
        createdAt: new Date(),
      };
      (prisma.skill.create as any).mockResolvedValue(created);

      const res = await request(app)
        .post('/api/skills')
        .send({ name: 'Guitar' });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Guitar');
      expect(res.body.totalXP).toBe(0);
      expect(res.body.level).toBe(0);
      expect(res.body.progress).toBeDefined();
    });

    it('returns 400 when name is missing', async () => {
      const res = await request(app)
        .post('/api/skills')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Name is required');
    });

    it('returns 400 when name is empty string', async () => {
      const res = await request(app)
        .post('/api/skills')
        .send({ name: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Name is required');
    });
  });

  describe('POST /api/skills/:id/log', () => {
    it('logs activity and increments skill XP', async () => {
      const skill = {
        id: 's1',
        userId: 'test-user-id',
        name: 'Guitar',
        totalXP: 50,
        createdAt: new Date(),
      };
      (prisma.skill.findFirst as any).mockResolvedValue(skill);
      (prisma.skill.update as any).mockResolvedValue({
        ...skill,
        totalXP: 75,
      });

      const res = await request(app)
        .post('/api/skills/s1/log')
        .send({ xp: 25 });

      expect(res.status).toBe(200);
      expect(res.body.totalXP).toBe(75);
      expect(res.body.level).toBeDefined();
      expect(res.body.progress).toBeDefined();
      expect(prisma.skill.update).toHaveBeenCalledWith({
        where: { id: 's1' },
        data: { totalXP: { increment: 25 } },
      });
    });

    it('returns 404 when skill not found', async () => {
      (prisma.skill.findFirst as any).mockResolvedValue(null);

      const res = await request(app)
        .post('/api/skills/bad-id/log')
        .send({ xp: 10 });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Skill not found');
    });

    it('returns 400 when xp is missing', async () => {
      const res = await request(app)
        .post('/api/skills/s1/log')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('XP must be a positive number');
    });

    it('returns 400 when xp is zero', async () => {
      const res = await request(app)
        .post('/api/skills/s1/log')
        .send({ xp: 0 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('XP must be a positive number');
    });

    it('returns 400 when xp is negative', async () => {
      const res = await request(app)
        .post('/api/skills/s1/log')
        .send({ xp: -5 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('XP must be a positive number');
    });
  });
});
