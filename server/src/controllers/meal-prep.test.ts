import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index';

vi.mock('../lib/prisma', () => ({
  default: {
    mealPrepPlan: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    mealPrepEntry: {
      deleteMany: vi.fn(),
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

const mockRecipe = {
  id: 'r1',
  name: 'Pasta',
  caloriesPerServing: 400,
  ingredients: [
    { id: 'i1', recipeId: 'r1', name: 'Pasta', quantity: '200', unit: 'g' },
    { id: 'i2', recipeId: 'r1', name: 'Tomato Sauce', quantity: '100', unit: 'ml' },
  ],
};

const mockRecipe2 = {
  id: 'r2',
  name: 'Salad',
  caloriesPerServing: 150,
  ingredients: [
    { id: 'i3', recipeId: 'r2', name: 'Lettuce', quantity: '1', unit: 'head' },
  ],
};

describe('Meal Prep endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/meal-prep', () => {
    it('returns the current week plan with entries', async () => {
      const plan = {
        id: 'p1',
        userId: 'test-user-id',
        weekStartDate: new Date().toISOString(),
        entries: [
          { id: 'e1', planId: 'p1', dayOfWeek: 'mon', mealType: 'breakfast', recipeId: 'r1', recipe: mockRecipe },
        ],
      };
      (prisma.mealPrepPlan.findFirst as any).mockResolvedValue(plan);

      const res = await request(app).get('/api/meal-prep');

      expect(res.status).toBe(200);
      expect(res.body.id).toBe('p1');
      expect(res.body.entries).toHaveLength(1);
      expect(res.body.entries[0].recipe.name).toBe('Pasta');
      expect(res.body.entries[0].recipe.ingredients).toHaveLength(2);
    });

    it('returns null when no plan exists for current week', async () => {
      (prisma.mealPrepPlan.findFirst as any).mockResolvedValue(null);

      const res = await request(app).get('/api/meal-prep');

      expect(res.status).toBe(200);
      expect(res.body).toBeNull();
    });
  });

  describe('POST /api/meal-prep', () => {
    it('creates a new meal prep plan', async () => {
      const created = {
        id: 'p1',
        userId: 'test-user-id',
        weekStartDate: '2025-01-06T00:00:00.000Z',
        entries: [
          { id: 'e1', planId: 'p1', dayOfWeek: 'mon', mealType: 'breakfast', recipeId: 'r1', recipe: mockRecipe },
        ],
      };
      (prisma.mealPrepPlan.findFirst as any).mockResolvedValue(null);
      (prisma.mealPrepPlan.create as any).mockResolvedValue(created);

      const res = await request(app)
        .post('/api/meal-prep')
        .send({
          weekStartDate: '2025-01-06',
          entries: [{ dayOfWeek: 'mon', mealType: 'breakfast', recipeId: 'r1' }],
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBe('p1');
      expect(res.body.entries).toHaveLength(1);
    });

    it('updates an existing meal prep plan by deleting old entries', async () => {
      const existing = { id: 'p1', userId: 'test-user-id', weekStartDate: '2025-01-06T00:00:00.000Z' };
      const updated = {
        ...existing,
        entries: [
          { id: 'e2', planId: 'p1', dayOfWeek: 'tue', mealType: 'lunch', recipeId: 'r2', recipe: mockRecipe2 },
        ],
      };
      (prisma.mealPrepPlan.findFirst as any).mockResolvedValue(existing);
      (prisma.mealPrepEntry.deleteMany as any).mockResolvedValue({ count: 1 });
      (prisma.mealPrepPlan.update as any).mockResolvedValue(updated);

      const res = await request(app)
        .post('/api/meal-prep')
        .send({
          weekStartDate: '2025-01-06',
          entries: [{ dayOfWeek: 'tue', mealType: 'lunch', recipeId: 'r2' }],
        });

      expect(res.status).toBe(201);
      expect(prisma.mealPrepEntry.deleteMany).toHaveBeenCalledWith({ where: { planId: 'p1' } });
      expect(res.body.entries[0].recipe.name).toBe('Salad');
    });

    it('returns 400 when weekStartDate is missing', async () => {
      const res = await request(app)
        .post('/api/meal-prep')
        .send({ entries: [{ dayOfWeek: 'mon', mealType: 'breakfast', recipeId: 'r1' }] });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('weekStartDate is required');
    });

    it('returns 400 when weekStartDate is not a Monday', async () => {
      const res = await request(app)
        .post('/api/meal-prep')
        .send({
          weekStartDate: '2025-01-07', // Tuesday
          entries: [{ dayOfWeek: 'mon', mealType: 'breakfast', recipeId: 'r1' }],
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('weekStartDate must be a Monday');
    });

    it('returns 400 when entries is empty', async () => {
      const res = await request(app)
        .post('/api/meal-prep')
        .send({ weekStartDate: '2025-01-06', entries: [] });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('entries must be a non-empty array');
    });

    it('returns 400 when entries is missing', async () => {
      const res = await request(app)
        .post('/api/meal-prep')
        .send({ weekStartDate: '2025-01-06' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('entries must be a non-empty array');
    });

    it('returns 400 for invalid dayOfWeek', async () => {
      const res = await request(app)
        .post('/api/meal-prep')
        .send({
          weekStartDate: '2025-01-06',
          entries: [{ dayOfWeek: 'invalid', mealType: 'breakfast', recipeId: 'r1' }],
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid dayOfWeek: invalid');
    });

    it('returns 400 for invalid mealType', async () => {
      const res = await request(app)
        .post('/api/meal-prep')
        .send({
          weekStartDate: '2025-01-06',
          entries: [{ dayOfWeek: 'mon', mealType: 'brunch', recipeId: 'r1' }],
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid mealType: brunch');
    });

    it('returns 400 when entry is missing recipeId', async () => {
      const res = await request(app)
        .post('/api/meal-prep')
        .send({
          weekStartDate: '2025-01-06',
          entries: [{ dayOfWeek: 'mon', mealType: 'breakfast' }],
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Each entry must have a recipeId');
    });
  });

  describe('GET /api/meal-prep/grocery-list/:day', () => {
    it('returns aggregated ingredients and total calories for a day', async () => {
      const plan = {
        id: 'p1',
        userId: 'test-user-id',
        weekStartDate: new Date().toISOString(),
        entries: [
          { id: 'e1', planId: 'p1', dayOfWeek: 'mon', mealType: 'breakfast', recipeId: 'r1', recipe: mockRecipe },
          { id: 'e2', planId: 'p1', dayOfWeek: 'mon', mealType: 'lunch', recipeId: 'r2', recipe: mockRecipe2 },
        ],
      };
      (prisma.mealPrepPlan.findFirst as any).mockResolvedValue(plan);

      const res = await request(app).get('/api/meal-prep/grocery-list/mon');

      expect(res.status).toBe(200);
      expect(res.body.totalCalories).toBe(550); // 400 + 150
      expect(res.body.ingredients).toHaveLength(3); // 2 from pasta + 1 from salad
      expect(res.body.ingredients[0].name).toBe('Pasta');
      expect(res.body.ingredients[1].name).toBe('Tomato Sauce');
      expect(res.body.ingredients[2].name).toBe('Lettuce');
    });

    it('returns empty list when no plan exists', async () => {
      (prisma.mealPrepPlan.findFirst as any).mockResolvedValue(null);

      const res = await request(app).get('/api/meal-prep/grocery-list/mon');

      expect(res.status).toBe(200);
      expect(res.body.ingredients).toHaveLength(0);
      expect(res.body.totalCalories).toBe(0);
    });

    it('returns empty list when no entries for the day', async () => {
      const plan = {
        id: 'p1',
        userId: 'test-user-id',
        weekStartDate: new Date().toISOString(),
        entries: [],
      };
      (prisma.mealPrepPlan.findFirst as any).mockResolvedValue(plan);

      const res = await request(app).get('/api/meal-prep/grocery-list/tue');

      expect(res.status).toBe(200);
      expect(res.body.ingredients).toHaveLength(0);
      expect(res.body.totalCalories).toBe(0);
    });

    it('returns 400 for invalid day', async () => {
      const res = await request(app).get('/api/meal-prep/grocery-list/invalid');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid day: invalid');
    });
  });
});
