import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index';

vi.mock('../lib/prisma', () => ({
  default: {
    lessonLearned: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
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

describe('Lessons endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/lessons', () => {
    it('returns all lessons for the user', async () => {
      const lessons = [
        { id: 'l1', userId: 'test-user-id', content: 'Always validate inputs', tags: ['security'], date: '2024-06-01', linkedSkillId: null },
      ];
      (prisma.lessonLearned.findMany as any).mockResolvedValue(lessons);

      const res = await request(app).get('/api/lessons');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].content).toBe('Always validate inputs');
    });

    it('filters by search term in content', async () => {
      (prisma.lessonLearned.findMany as any).mockResolvedValue([]);

      await request(app).get('/api/lessons?search=validate');
      expect(prisma.lessonLearned.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'test-user-id',
          OR: [
            { content: { contains: 'validate', mode: 'insensitive' } },
            { tags: { has: 'validate' } },
          ],
        },
        orderBy: { date: 'desc' },
      });
    });

    it('filters by tag', async () => {
      (prisma.lessonLearned.findMany as any).mockResolvedValue([]);

      await request(app).get('/api/lessons?tag=security');
      expect(prisma.lessonLearned.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'test-user-id',
          tags: { has: 'security' },
        },
        orderBy: { date: 'desc' },
      });
    });
  });

  describe('POST /api/lessons', () => {
    it('creates a lesson', async () => {
      const created = {
        id: 'l1', userId: 'test-user-id', content: 'Use error boundaries',
        tags: ['react'], linkedSkillId: null, date: '2024-06-01',
      };
      (prisma.lessonLearned.create as any).mockResolvedValue(created);

      const res = await request(app).post('/api/lessons').send({
        content: 'Use error boundaries', tags: ['react'], date: '2024-06-01',
      });
      expect(res.status).toBe(201);
      expect(res.body.content).toBe('Use error boundaries');
    });

    it('returns 400 when content is missing', async () => {
      const res = await request(app).post('/api/lessons').send({ date: '2024-06-01' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Content is required');
    });

    it('returns 400 when date is missing', async () => {
      const res = await request(app).post('/api/lessons').send({ content: 'Some lesson' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Date is required');
    });

    it('creates lesson with linkedSkillId', async () => {
      const created = {
        id: 'l1', userId: 'test-user-id', content: 'Practice TDD',
        tags: [], linkedSkillId: 'skill-1', date: '2024-06-01',
      };
      (prisma.lessonLearned.create as any).mockResolvedValue(created);

      const res = await request(app).post('/api/lessons').send({
        content: 'Practice TDD', tags: [], linkedSkillId: 'skill-1', date: '2024-06-01',
      });
      expect(res.status).toBe(201);
      expect(res.body.linkedSkillId).toBe('skill-1');
    });

    it('filters invalid tags', async () => {
      (prisma.lessonLearned.create as any).mockResolvedValue({
        id: 'l1', userId: 'test-user-id', content: 'Test', tags: ['valid'], linkedSkillId: null, date: '2024-06-01',
      });

      await request(app).post('/api/lessons').send({
        content: 'Test', tags: ['valid', 123, null], date: '2024-06-01',
      });
      expect(prisma.lessonLearned.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ tags: ['valid'] }),
      });
    });
  });

  describe('DELETE /api/lessons/:id', () => {
    it('deletes a lesson', async () => {
      (prisma.lessonLearned.findFirst as any).mockResolvedValue({ id: 'l1', userId: 'test-user-id' });
      (prisma.lessonLearned.delete as any).mockResolvedValue({});

      const res = await request(app).delete('/api/lessons/l1');
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Lesson deleted');
    });

    it('returns 404 when lesson not found', async () => {
      (prisma.lessonLearned.findFirst as any).mockResolvedValue(null);
      const res = await request(app).delete('/api/lessons/bad-id');
      expect(res.status).toBe(404);
    });
  });
});
