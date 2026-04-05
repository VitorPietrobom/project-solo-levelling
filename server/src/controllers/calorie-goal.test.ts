import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index';

vi.mock('../lib/prisma', () => ({
  default: {
    user: {
      upsert: vi.fn().mockResolvedValue({}),
      findUnique: vi.fn(),
      update: vi.fn(),
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

describe('Calorie goal endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/calorie-goal', () => {
    it('returns the calorie goal for the user', async () => {
      (prisma.user.findUnique as any).mockResolvedValue({ calorieGoal: 2000 });

      const res = await request(app).get('/api/calorie-goal');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ calorieGoal: 2000 });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-user-id' },
        select: { calorieGoal: true },
      });
    });

    it('returns 404 when user not found', async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);

      const res = await request(app).get('/api/calorie-goal');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('User not found');
    });
  });

  describe('PUT /api/calorie-goal', () => {
    it('updates the calorie goal', async () => {
      (prisma.user.update as any).mockResolvedValue({ calorieGoal: 2500 });

      const res = await request(app)
        .put('/api/calorie-goal')
        .send({ calorieGoal: 2500 });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ calorieGoal: 2500 });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'test-user-id' },
        data: { calorieGoal: 2500 },
        select: { calorieGoal: true },
      });
    });

    it('returns 400 when calorieGoal is missing', async () => {
      const res = await request(app)
        .put('/api/calorie-goal')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Calorie goal must be a positive integer');
    });

    it('returns 400 when calorieGoal is zero', async () => {
      const res = await request(app)
        .put('/api/calorie-goal')
        .send({ calorieGoal: 0 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Calorie goal must be a positive integer');
    });

    it('returns 400 when calorieGoal is negative', async () => {
      const res = await request(app)
        .put('/api/calorie-goal')
        .send({ calorieGoal: -500 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Calorie goal must be a positive integer');
    });

    it('returns 400 when calorieGoal is not an integer', async () => {
      const res = await request(app)
        .put('/api/calorie-goal')
        .send({ calorieGoal: 2000.5 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Calorie goal must be a positive integer');
    });
  });
});
