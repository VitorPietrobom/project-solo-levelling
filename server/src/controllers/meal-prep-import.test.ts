import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index';

// A tx whose recipe.create hands back a deterministic id per name, and whose
// plan create/update echoes the entries it was given so the response counts
// line up.
const tx = {
  recipe: {
    create: vi.fn(({ data }: any) => Promise.resolve({ id: `id-${data.name.toLowerCase()}`, ...data })),
  },
  mealPrepPlan: {
    findFirst: vi.fn().mockResolvedValue(null),
    create: vi.fn(({ data }: any) => Promise.resolve({ id: 'plan1', weekStartDate: data.weekStartDate, entries: data.entries.create })),
    update: vi.fn(({ data }: any) => Promise.resolve({ id: 'plan1', entries: data.entries.create })),
  },
  mealPrepEntry: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
};

vi.mock('../lib/prisma', () => ({
  default: {
    $transaction: vi.fn((cb: any) => cb(tx)),
    user: { upsert: vi.fn().mockResolvedValue({}) },
  },
}));

vi.mock('../middleware/auth', async () => ({
  authMiddleware: (req: any, _res: any, next: any) => {
    req.user = { id: 'test-user-id', email: 'test@example.com' };
    next();
  },
}));

// 2026-08-03 is a Monday.
const MONDAY = '2026-08-03';

const recipes = [
  { name: 'Chicken Bowl', steps: '1. cook', servings: 4, caloriesPerServing: 500, protein: 40, carbs: 45, fat: 15, ingredients: [{ name: 'Chicken', quantity: '600', unit: 'g' }] },
  { name: 'Oats', steps: '1. mix', servings: 1, caloriesPerServing: 350, protein: 20, carbs: 50, fat: 8, ingredients: [{ name: 'Oats', quantity: '80', unit: 'g' }] },
];

beforeEach(() => {
  vi.clearAllMocks();
  tx.mealPrepPlan.findFirst.mockResolvedValue(null);
});

describe('POST /api/meal-prep/import', () => {
  it('creates every recipe and schedules the resolvable meals', async () => {
    const res = await request(app).post('/api/meal-prep/import').send({
      weekStartDate: MONDAY,
      recipes,
      schedule: [
        { dayOfWeek: 'mon', mealType: 'breakfast', recipeName: 'Oats' },
        { dayOfWeek: 'mon', mealType: 'lunch', recipeName: 'Chicken Bowl' },
      ],
    });
    expect(res.status).toBe(201);
    expect(res.body.recipesCreated).toBe(2);
    expect(res.body.mealsScheduled).toBe(2);
    expect(tx.recipe.create).toHaveBeenCalledTimes(2);
  });

  it('matches recipe names case-insensitively', async () => {
    const res = await request(app).post('/api/meal-prep/import').send({
      weekStartDate: MONDAY,
      recipes,
      schedule: [{ dayOfWeek: 'tue', mealType: 'dinner', recipeName: 'chicken bowl' }],
    });
    expect(res.status).toBe(201);
    expect(res.body.mealsScheduled).toBe(1);
  });

  it('drops schedule slots with an unknown recipe name but keeps the rest', async () => {
    const res = await request(app).post('/api/meal-prep/import').send({
      weekStartDate: MONDAY,
      recipes,
      schedule: [
        { dayOfWeek: 'mon', mealType: 'breakfast', recipeName: 'Oats' },
        { dayOfWeek: 'mon', mealType: 'dinner', recipeName: 'Nonexistent' },
      ],
    });
    expect(res.status).toBe(201);
    expect(res.body.mealsScheduled).toBe(1);
  });

  it('rejects a non-Monday week start', async () => {
    const res = await request(app).post('/api/meal-prep/import').send({
      weekStartDate: '2026-08-04', // Tuesday
      recipes,
      schedule: [{ dayOfWeek: 'mon', mealType: 'breakfast', recipeName: 'Oats' }],
    });
    expect(res.status).toBe(400);
    expect(tx.recipe.create).not.toHaveBeenCalled();
  });

  it('rejects an empty recipe list', async () => {
    const res = await request(app).post('/api/meal-prep/import').send({
      weekStartDate: MONDAY, recipes: [], schedule: [{ dayOfWeek: 'mon', mealType: 'breakfast', recipeName: 'X' }],
    });
    expect(res.status).toBe(400);
  });

  it('400s when no scheduled meal resolves to a recipe', async () => {
    const res = await request(app).post('/api/meal-prep/import').send({
      weekStartDate: MONDAY,
      recipes,
      schedule: [{ dayOfWeek: 'mon', mealType: 'breakfast', recipeName: 'Ghost' }],
    });
    expect(res.status).toBe(400);
  });

  it('sanitizes junk macros to safe integers', async () => {
    await request(app).post('/api/meal-prep/import').send({
      weekStartDate: MONDAY,
      recipes: [{ name: 'Weird', steps: '', servings: 0, caloriesPerServing: 'abc', protein: -5, carbs: 12.7, fat: null, ingredients: 'nope' }],
      schedule: [{ dayOfWeek: 'wed', mealType: 'snack', recipeName: 'Weird' }],
    });
    const arg = tx.recipe.create.mock.calls[0][0].data;
    expect(arg.caloriesPerServing).toBe(0);
    expect(arg.protein).toBe(0);
    expect(arg.carbs).toBe(13);
    expect(arg.fat).toBe(0);
    expect(arg.servings).toBe(1);
    expect(arg.steps).toBe('No steps provided.');
    expect(arg.ingredients.create).toEqual([]);
  });
});
