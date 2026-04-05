import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index';

vi.mock('../lib/prisma', () => ({
  default: {
    weightEntry: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
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

describe('Weight endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/weight', () => {
    it('returns all weight entries for user', async () => {
      const entries = [
        { id: 'w1', userId: 'test-user-id', weight: 80.5, date: '2024-01-01' },
        { id: 'w2', userId: 'test-user-id', weight: 80.0, date: '2024-01-02' },
      ];
      (prisma.weightEntry.findMany as any).mockResolvedValue(entries);

      const res = await request(app).get('/api/weight');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].weight).toBe(80.5);
    });

    it('filters by date range when start and end provided', async () => {
      (prisma.weightEntry.findMany as any).mockResolvedValue([]);

      await request(app).get('/api/weight?start=2024-01-01&end=2024-01-31');

      expect(prisma.weightEntry.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'test-user-id',
          date: {
            gte: new Date('2024-01-01'),
            lte: new Date('2024-01-31'),
          },
        },
        orderBy: { date: 'asc' },
      });
    });

    it('returns empty array when no entries exist', async () => {
      (prisma.weightEntry.findMany as any).mockResolvedValue([]);

      const res = await request(app).get('/api/weight');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(0);
    });
  });

  describe('POST /api/weight', () => {
    it('creates a weight entry', async () => {
      const created = {
        id: 'w1',
        userId: 'test-user-id',
        weight: 80.5,
        date: '2024-01-15',
      };
      (prisma.weightEntry.findUnique as any).mockResolvedValue(null);
      (prisma.weightEntry.create as any).mockResolvedValue(created);

      const res = await request(app)
        .post('/api/weight')
        .send({ weight: 80.5, date: '2024-01-15' });

      expect(res.status).toBe(201);
      expect(res.body.weight).toBe(80.5);
    });

    it('returns 409 on duplicate date', async () => {
      (prisma.weightEntry.findUnique as any).mockResolvedValue({
        id: 'existing',
        userId: 'test-user-id',
        weight: 80.0,
        date: '2024-01-15',
      });

      const res = await request(app)
        .post('/api/weight')
        .send({ weight: 80.5, date: '2024-01-15' });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Weight entry already exists for this date');
    });

    it('returns 400 when weight is missing', async () => {
      const res = await request(app)
        .post('/api/weight')
        .send({ date: '2024-01-15' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Weight must be a positive number');
    });

    it('returns 400 when weight is zero', async () => {
      const res = await request(app)
        .post('/api/weight')
        .send({ weight: 0, date: '2024-01-15' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Weight must be a positive number');
    });

    it('returns 400 when weight is negative', async () => {
      const res = await request(app)
        .post('/api/weight')
        .send({ weight: -5, date: '2024-01-15' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Weight must be a positive number');
    });

    it('returns 400 when date is missing', async () => {
      const res = await request(app)
        .post('/api/weight')
        .send({ weight: 80.5 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Date is required');
    });
  });
});
