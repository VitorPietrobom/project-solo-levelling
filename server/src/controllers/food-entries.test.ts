import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index';

vi.mock('../lib/prisma', () => ({
  default: {
    foodEntry: {
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

describe('Food entry endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/food-entries', () => {
    it('returns food entries for a given date', async () => {
      const entries = [
        { id: 'f1', userId: 'test-user-id', foodName: 'Oatmeal', calories: 300, mealType: 'breakfast', date: '2024-01-15' },
        { id: 'f2', userId: 'test-user-id', foodName: 'Chicken', calories: 500, mealType: 'lunch', date: '2024-01-15' },
      ];
      (prisma.foodEntry.findMany as any).mockResolvedValue(entries);

      const res = await request(app).get('/api/food-entries?date=2024-01-15');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(prisma.foodEntry.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'test-user-id',
          date: new Date('2024-01-15'),
        },
        orderBy: { date: 'asc' },
      });
    });

    it('returns 400 when date is missing', async () => {
      const res = await request(app).get('/api/food-entries');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Date query parameter is required');
    });

    it('returns empty array when no entries exist', async () => {
      (prisma.foodEntry.findMany as any).mockResolvedValue([]);

      const res = await request(app).get('/api/food-entries?date=2024-01-15');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(0);
    });
  });

  describe('POST /api/food-entries', () => {
    it('creates a food entry', async () => {
      const created = {
        id: 'f1',
        userId: 'test-user-id',
        foodName: 'Oatmeal',
        calories: 300,
        mealType: 'breakfast',
        date: '2024-01-15',
      };
      (prisma.foodEntry.create as any).mockResolvedValue(created);

      const res = await request(app)
        .post('/api/food-entries')
        .send({ foodName: 'Oatmeal', calories: 300, mealType: 'breakfast', date: '2024-01-15' });

      expect(res.status).toBe(201);
      expect(res.body.foodName).toBe('Oatmeal');
      expect(res.body.calories).toBe(300);
      expect(res.body.mealType).toBe('breakfast');
    });

    it('returns 400 when foodName is missing', async () => {
      const res = await request(app)
        .post('/api/food-entries')
        .send({ calories: 300, mealType: 'breakfast', date: '2024-01-15' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Food name is required');
    });

    it('returns 400 when calories is negative', async () => {
      const res = await request(app)
        .post('/api/food-entries')
        .send({ foodName: 'Oatmeal', calories: -100, mealType: 'breakfast', date: '2024-01-15' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Calories must be a non-negative integer');
    });

    it('returns 400 when calories is not an integer', async () => {
      const res = await request(app)
        .post('/api/food-entries')
        .send({ foodName: 'Oatmeal', calories: 300.5, mealType: 'breakfast', date: '2024-01-15' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Calories must be a non-negative integer');
    });

    it('returns 400 for invalid meal type', async () => {
      const res = await request(app)
        .post('/api/food-entries')
        .send({ foodName: 'Oatmeal', calories: 300, mealType: 'brunch', date: '2024-01-15' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Meal type must be one of: breakfast, lunch, dinner, snack');
    });

    it('returns 400 when date is missing', async () => {
      const res = await request(app)
        .post('/api/food-entries')
        .send({ foodName: 'Oatmeal', calories: 300, mealType: 'breakfast' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Date is required');
    });

    it('allows zero calories', async () => {
      const created = {
        id: 'f1',
        userId: 'test-user-id',
        foodName: 'Water',
        calories: 0,
        mealType: 'snack',
        date: '2024-01-15',
      };
      (prisma.foodEntry.create as any).mockResolvedValue(created);

      const res = await request(app)
        .post('/api/food-entries')
        .send({ foodName: 'Water', calories: 0, mealType: 'snack', date: '2024-01-15' });

      expect(res.status).toBe(201);
      expect(res.body.calories).toBe(0);
    });
  });
});
