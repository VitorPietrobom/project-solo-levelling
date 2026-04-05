import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index';

vi.mock('../lib/prisma', () => ({
  default: {
    recipe: {
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

describe('Recipe endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/recipes', () => {
    it('returns all recipes for the user', async () => {
      const recipes = [
        { id: 'r1', userId: 'test-user-id', name: 'Pasta', steps: 'Boil water', caloriesPerServing: 400, ingredients: [{ id: 'i1', recipeId: 'r1', name: 'Pasta', quantity: '200', unit: 'g' }] },
      ];
      (prisma.recipe.findMany as any).mockResolvedValue(recipes);

      const res = await request(app).get('/api/recipes');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe('Pasta');
      expect(res.body[0].ingredients).toHaveLength(1);
      expect(prisma.recipe.findMany).toHaveBeenCalledWith({
        where: { userId: 'test-user-id' },
        include: { ingredients: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('filters recipes by search term in name', async () => {
      (prisma.recipe.findMany as any).mockResolvedValue([]);

      const res = await request(app).get('/api/recipes?search=chicken');

      expect(res.status).toBe(200);
      expect(prisma.recipe.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'test-user-id',
          OR: [
            { name: { contains: 'chicken', mode: 'insensitive' } },
            { ingredients: { some: { name: { contains: 'chicken', mode: 'insensitive' } } } },
          ],
        },
        include: { ingredients: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('returns empty array when no recipes exist', async () => {
      (prisma.recipe.findMany as any).mockResolvedValue([]);

      const res = await request(app).get('/api/recipes');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(0);
    });
  });

  describe('POST /api/recipes', () => {
    it('creates a recipe with ingredients', async () => {
      const created = {
        id: 'r1',
        userId: 'test-user-id',
        name: 'Pasta',
        steps: 'Boil water. Cook pasta.',
        caloriesPerServing: 400,
        createdAt: new Date().toISOString(),
        ingredients: [
          { id: 'i1', recipeId: 'r1', name: 'Pasta', quantity: '200', unit: 'g' },
          { id: 'i2', recipeId: 'r1', name: 'Tomato Sauce', quantity: '100', unit: 'ml' },
        ],
      };
      (prisma.recipe.create as any).mockResolvedValue(created);

      const res = await request(app)
        .post('/api/recipes')
        .send({
          name: 'Pasta',
          steps: 'Boil water. Cook pasta.',
          caloriesPerServing: 400,
          ingredients: [
            { name: 'Pasta', quantity: '200', unit: 'g' },
            { name: 'Tomato Sauce', quantity: '100', unit: 'ml' },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Pasta');
      expect(res.body.ingredients).toHaveLength(2);
    });

    it('creates a recipe without ingredients', async () => {
      const created = {
        id: 'r1',
        userId: 'test-user-id',
        name: 'Simple Salad',
        steps: 'Mix greens.',
        caloriesPerServing: 100,
        createdAt: new Date().toISOString(),
        ingredients: [],
      };
      (prisma.recipe.create as any).mockResolvedValue(created);

      const res = await request(app)
        .post('/api/recipes')
        .send({ name: 'Simple Salad', steps: 'Mix greens.', caloriesPerServing: 100 });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Simple Salad');
      expect(res.body.ingredients).toHaveLength(0);
    });

    it('returns 400 when name is missing', async () => {
      const res = await request(app)
        .post('/api/recipes')
        .send({ steps: 'Do stuff', caloriesPerServing: 100 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Name is required');
    });

    it('returns 400 when steps is missing', async () => {
      const res = await request(app)
        .post('/api/recipes')
        .send({ name: 'Pasta', caloriesPerServing: 100 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Steps are required');
    });

    it('returns 400 when caloriesPerServing is negative', async () => {
      const res = await request(app)
        .post('/api/recipes')
        .send({ name: 'Pasta', steps: 'Cook', caloriesPerServing: -10 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Calories per serving must be a non-negative integer');
    });

    it('returns 400 when caloriesPerServing is not an integer', async () => {
      const res = await request(app)
        .post('/api/recipes')
        .send({ name: 'Pasta', steps: 'Cook', caloriesPerServing: 100.5 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Calories per serving must be a non-negative integer');
    });

    it('allows zero caloriesPerServing', async () => {
      const created = {
        id: 'r1',
        userId: 'test-user-id',
        name: 'Water',
        steps: 'Pour water.',
        caloriesPerServing: 0,
        createdAt: new Date().toISOString(),
        ingredients: [],
      };
      (prisma.recipe.create as any).mockResolvedValue(created);

      const res = await request(app)
        .post('/api/recipes')
        .send({ name: 'Water', steps: 'Pour water.', caloriesPerServing: 0 });

      expect(res.status).toBe(201);
      expect(res.body.caloriesPerServing).toBe(0);
    });
  });

  describe('GET /api/recipes/:id', () => {
    it('returns a recipe with ingredients', async () => {
      const recipe = {
        id: 'r1',
        userId: 'test-user-id',
        name: 'Pasta',
        steps: 'Boil water.',
        caloriesPerServing: 400,
        ingredients: [{ id: 'i1', recipeId: 'r1', name: 'Pasta', quantity: '200', unit: 'g' }],
      };
      (prisma.recipe.findFirst as any).mockResolvedValue(recipe);

      const res = await request(app).get('/api/recipes/r1');

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Pasta');
      expect(res.body.ingredients).toHaveLength(1);
      expect(prisma.recipe.findFirst).toHaveBeenCalledWith({
        where: { id: 'r1', userId: 'test-user-id' },
        include: { ingredients: true },
      });
    });

    it('returns 404 when recipe not found', async () => {
      (prisma.recipe.findFirst as any).mockResolvedValue(null);

      const res = await request(app).get('/api/recipes/bad-id');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Recipe not found');
    });
  });

  describe('DELETE /api/recipes/:id', () => {
    it('deletes a recipe', async () => {
      const recipe = { id: 'r1', userId: 'test-user-id', name: 'Pasta' };
      (prisma.recipe.findFirst as any).mockResolvedValue(recipe);
      (prisma.recipe.delete as any).mockResolvedValue(recipe);

      const res = await request(app).delete('/api/recipes/r1');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Recipe deleted');
      expect(prisma.recipe.delete).toHaveBeenCalledWith({ where: { id: 'r1' } });
    });

    it('returns 404 when recipe not found', async () => {
      (prisma.recipe.findFirst as any).mockResolvedValue(null);

      const res = await request(app).delete('/api/recipes/bad-id');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Recipe not found');
    });
  });
});
