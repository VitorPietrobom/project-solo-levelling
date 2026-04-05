import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index';

vi.mock('../lib/prisma', () => ({
  default: {
    measurement: {
      findMany: vi.fn(),
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

describe('Measurement endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/measurements', () => {
    it('returns all measurements for user', async () => {
      const measurements = [
        { id: 'm1', userId: 'test-user-id', type: 'chest', value: 100, date: '2024-01-01' },
        { id: 'm2', userId: 'test-user-id', type: 'waist', value: 80, date: '2024-01-02' },
      ];
      (prisma.measurement.findMany as any).mockResolvedValue(measurements);

      const res = await request(app).get('/api/measurements');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(prisma.measurement.findMany).toHaveBeenCalledWith({
        where: { userId: 'test-user-id' },
        orderBy: { date: 'asc' },
      });
    });

    it('filters by type when provided', async () => {
      (prisma.measurement.findMany as any).mockResolvedValue([]);

      await request(app).get('/api/measurements?type=chest');

      expect(prisma.measurement.findMany).toHaveBeenCalledWith({
        where: { userId: 'test-user-id', type: 'chest' },
        orderBy: { date: 'asc' },
      });
    });

    it('returns 400 for invalid type', async () => {
      const res = await request(app).get('/api/measurements?type=invalid');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid measurement type');
    });
  });

  describe('POST /api/measurements', () => {
    it('creates a measurement', async () => {
      const created = {
        id: 'm1',
        userId: 'test-user-id',
        type: 'chest',
        value: 100,
        date: '2024-01-15',
      };
      (prisma.measurement.create as any).mockResolvedValue(created);

      const res = await request(app)
        .post('/api/measurements')
        .send({ type: 'chest', value: 100, date: '2024-01-15' });

      expect(res.status).toBe(201);
      expect(res.body.type).toBe('chest');
      expect(res.body.value).toBe(100);
    });

    it('returns 400 for invalid type', async () => {
      const res = await request(app)
        .post('/api/measurements')
        .send({ type: 'neck', value: 40, date: '2024-01-15' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Type must be one of: chest, waist, hips, arms, thighs');
    });

    it('returns 400 when fields are missing', async () => {
      const res = await request(app)
        .post('/api/measurements')
        .send({ type: 'chest' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Value must be a positive number');
    });
  });
});
