import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index';

vi.mock('../lib/prisma', () => ({
  default: {
    journalEntry: {
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

describe('Journal endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/journal', () => {
    it('returns all entries for the user', async () => {
      const entries = [
        { id: 'j1', userId: 'test-user-id', content: 'Learned React hooks', tags: ['react'], date: '2024-06-01', linkedSkillId: null },
      ];
      (prisma.journalEntry.findMany as any).mockResolvedValue(entries);

      const res = await request(app).get('/api/journal');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].content).toBe('Learned React hooks');
    });

    it('filters by date range', async () => {
      (prisma.journalEntry.findMany as any).mockResolvedValue([]);

      const res = await request(app).get('/api/journal?start=2024-01-01&end=2024-06-30');
      expect(res.status).toBe(200);
      expect(prisma.journalEntry.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'test-user-id',
          date: { gte: new Date('2024-01-01'), lte: new Date('2024-06-30') },
        },
        orderBy: { date: 'desc' },
      });
    });
  });

  describe('POST /api/journal', () => {
    it('creates an entry', async () => {
      const created = {
        id: 'j1', userId: 'test-user-id', content: 'Learned TypeScript generics',
        tags: ['typescript'], linkedSkillId: null, date: '2024-06-01',
      };
      (prisma.journalEntry.create as any).mockResolvedValue(created);

      const res = await request(app).post('/api/journal').send({
        content: 'Learned TypeScript generics', tags: ['typescript'], date: '2024-06-01',
      });
      expect(res.status).toBe(201);
      expect(res.body.content).toBe('Learned TypeScript generics');
    });

    it('returns 400 when content is missing', async () => {
      const res = await request(app).post('/api/journal').send({ date: '2024-06-01' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Content is required');
    });

    it('returns 400 when date is missing', async () => {
      const res = await request(app).post('/api/journal').send({ content: 'Some content' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Date is required');
    });

    it('creates entry with linkedSkillId', async () => {
      const created = {
        id: 'j1', userId: 'test-user-id', content: 'Practiced coding',
        tags: [], linkedSkillId: 'skill-1', date: '2024-06-01',
      };
      (prisma.journalEntry.create as any).mockResolvedValue(created);

      const res = await request(app).post('/api/journal').send({
        content: 'Practiced coding', tags: [], linkedSkillId: 'skill-1', date: '2024-06-01',
      });
      expect(res.status).toBe(201);
      expect(res.body.linkedSkillId).toBe('skill-1');
    });

    it('filters invalid tags', async () => {
      (prisma.journalEntry.create as any).mockResolvedValue({
        id: 'j1', userId: 'test-user-id', content: 'Test', tags: ['valid'], linkedSkillId: null, date: '2024-06-01',
      });

      await request(app).post('/api/journal').send({
        content: 'Test', tags: ['valid', 123, null], date: '2024-06-01',
      });
      expect(prisma.journalEntry.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ tags: ['valid'] }),
      });
    });
  });

  describe('DELETE /api/journal/:id', () => {
    it('deletes an entry', async () => {
      (prisma.journalEntry.findFirst as any).mockResolvedValue({ id: 'j1', userId: 'test-user-id' });
      (prisma.journalEntry.delete as any).mockResolvedValue({});

      const res = await request(app).delete('/api/journal/j1');
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Journal entry deleted');
    });

    it('returns 404 when entry not found', async () => {
      (prisma.journalEntry.findFirst as any).mockResolvedValue(null);
      const res = await request(app).delete('/api/journal/bad-id');
      expect(res.status).toBe(404);
    });
  });
});
