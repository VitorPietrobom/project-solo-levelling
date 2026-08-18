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

  // Manual XP logging (POST /api/skills/:id/log) was removed — it let anyone
  // type an arbitrary number straight into a skill's totalXP with no cap and
  // without going through awardXP, so it never actually moved the user's
  // overall level despite showing an XP toast that claimed it did. Skills
  // now only grow by linking a quest, so completing something real is the
  // only way to gain skill XP.
  it('no longer exposes a manual XP-log endpoint', async () => {
    const res = await request(app).post('/api/skills/s1/log').send({ xp: 25 });
    expect(res.status).toBe(404);
  });
});
