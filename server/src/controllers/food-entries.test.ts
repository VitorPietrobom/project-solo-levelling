import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index';

vi.mock('../lib/prisma', () => ({
  default: {
    foodEntry: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    customFoodProduct: {
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

    it('returns 400 when protein is negative', async () => {
      const res = await request(app)
        .post('/api/food-entries')
        .send({ foodName: 'Oatmeal', calories: 300, protein: -5, mealType: 'breakfast', date: '2024-01-15' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('protein must be a non-negative number');
      expect(prisma.foodEntry.create).not.toHaveBeenCalled();
    });

    it('returns 400 when fat is not a finite number', async () => {
      const res = await request(app)
        .post('/api/food-entries')
        .send({ foodName: 'Oatmeal', calories: 300, fat: NaN, mealType: 'breakfast', date: '2024-01-15' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('fat must be a non-negative number');
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

  describe('GET /api/food-entries/barcode/:code', () => {
    const mockFetch = vi.fn();

    beforeEach(() => {
      vi.stubGlobal('fetch', mockFetch);
      mockFetch.mockReset();
      (prisma.customFoodProduct.findUnique as any).mockResolvedValue(null);
    });

    it('returns 400 for a non-numeric code', async () => {
      const res = await request(app).get('/api/food-entries/barcode/not-a-barcode');
      expect(res.status).toBe(400);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('looks up a known product and returns per-100g macros', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 1,
          product: {
            product_name: 'Peanut Butter',
            nutriments: { 'energy-kcal_100g': 588, proteins_100g: 25, carbohydrates_100g: 20, fat_100g: 50 },
            serving_quantity: 32,
          },
        }),
      });

      const res = await request(app).get('/api/food-entries/barcode/0123456789012');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        found: true,
        source: 'openfoodfacts',
        foodName: 'Peanut Butter',
        caloriesPer100g: 588,
        proteinPer100g: 25,
        carbsPer100g: 20,
        fatPer100g: 50,
        servingGrams: 32,
      });
      expect(mockFetch).toHaveBeenCalledWith(
        'https://world.openfoodfacts.org/api/v2/product/0123456789012.json',
        expect.objectContaining({ signal: expect.anything() }),
      );
      // OFF resolved it, so the custom fallback table was never consulted.
      expect(prisma.customFoodProduct.findUnique).not.toHaveBeenCalled();
    });

    it('reports not found when neither Open Food Facts nor the custom table has it', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({ status: 0 }) });

      const res = await request(app).get('/api/food-entries/barcode/9999999999999');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ found: false });
    });

    it('falls back to kJ conversion when energy-kcal_100g is missing', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 1,
          product: { product_name: 'Mystery Bar', nutriments: { energy_100g: 2092 } },
        }),
      });

      const res = await request(app).get('/api/food-entries/barcode/1112223334445');

      expect(res.status).toBe(200);
      expect(res.body.caloriesPer100g).toBe(500); // 2092 / 4.184 ≈ 500
    });

    it('falls back to the custom table when Open Food Facts has never heard of it', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({ status: 0 }) });
      (prisma.customFoodProduct.findUnique as any).mockResolvedValue({
        id: 'c1', barcode: '9999999999999', foodName: "Grandma's Cookies",
        caloriesPer100g: 480, proteinPer100g: 5, carbsPer100g: 60, fatPer100g: 22,
      });

      const res = await request(app).get('/api/food-entries/barcode/9999999999999');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        found: true,
        source: 'custom',
        foodName: "Grandma's Cookies",
        caloriesPer100g: 480,
        proteinPer100g: 5,
        carbsPer100g: 60,
        fatPer100g: 22,
        servingGrams: null,
      });
    });

    it('falls back to the custom table when the upstream OFF lookup throws', async () => {
      mockFetch.mockRejectedValue(new Error('network down'));
      (prisma.customFoodProduct.findUnique as any).mockResolvedValue({
        id: 'c1', barcode: '0123456789012', foodName: 'Local Snack',
        caloriesPer100g: 300, proteinPer100g: 10, carbsPer100g: 40, fatPer100g: 8,
      });

      const res = await request(app).get('/api/food-entries/barcode/0123456789012');

      expect(res.status).toBe(200);
      expect(res.body.found).toBe(true);
      expect(res.body.source).toBe('custom');
      expect(res.body.foodName).toBe('Local Snack');
    });
  });

  describe('POST /api/food-entries/barcode/:code', () => {
    beforeEach(() => {
      (prisma.customFoodProduct.create as any).mockReset();
      (prisma.customFoodProduct.findUnique as any).mockReset();
    });

    it('returns 400 for a non-numeric code', async () => {
      const res = await request(app).post('/api/food-entries/barcode/not-a-barcode').send({ foodName: 'X', caloriesPer100g: 100 });
      expect(res.status).toBe(400);
    });

    it('returns 400 when foodName is missing', async () => {
      const res = await request(app).post('/api/food-entries/barcode/0123456789012').send({ caloriesPer100g: 100 });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Food name is required');
    });

    it('returns 400 when caloriesPer100g is negative', async () => {
      const res = await request(app).post('/api/food-entries/barcode/0123456789012').send({ foodName: 'X', caloriesPer100g: -5 });
      expect(res.status).toBe(400);
    });

    it('creates a custom product for the barcode, attributed to the user', async () => {
      (prisma.customFoodProduct.create as any).mockResolvedValue({
        id: 'c1', barcode: '0123456789012', foodName: 'Homemade Bread',
        caloriesPer100g: 265, proteinPer100g: 9, carbsPer100g: 49, fatPer100g: 3.2,
      });

      const res = await request(app)
        .post('/api/food-entries/barcode/0123456789012')
        .send({ foodName: 'Homemade Bread', caloriesPer100g: 265, proteinPer100g: 9, carbsPer100g: 49, fatPer100g: 3.2 });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        found: true,
        source: 'custom',
        foodName: 'Homemade Bread',
        caloriesPer100g: 265,
        proteinPer100g: 9,
        carbsPer100g: 49,
        fatPer100g: 3.2,
        servingGrams: null,
      });
      expect(prisma.customFoodProduct.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ barcode: '0123456789012', foodName: 'Homemade Bread', createdByUserId: 'test-user-id' }),
      });
    });

    it('hands back the existing product instead of erroring on a duplicate barcode', async () => {
      const dupError: any = new Error('Unique constraint failed');
      dupError.code = 'P2002';
      (prisma.customFoodProduct.create as any).mockRejectedValue(dupError);
      (prisma.customFoodProduct.findUnique as any).mockResolvedValue({
        id: 'c1', barcode: '0123456789012', foodName: 'Already Added',
        caloriesPer100g: 200, proteinPer100g: 1, carbsPer100g: 2, fatPer100g: 3,
      });

      const res = await request(app)
        .post('/api/food-entries/barcode/0123456789012')
        .send({ foodName: 'Someone Else Typed This', caloriesPer100g: 999 });

      expect(res.status).toBe(200);
      expect(res.body.foodName).toBe('Already Added');
    });
  });
});
