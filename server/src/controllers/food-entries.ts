import { Request, Response } from 'express';
import prisma from '../lib/prisma';

const VALID_MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

export async function listFoodEntries(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { date } = req.query;

    if (!date || typeof date !== 'string') {
      res.status(400).json({ error: 'Date query parameter is required' });
      return;
    }

    const entries = await prisma.foodEntry.findMany({
      where: {
        userId,
        date: new Date(date),
      },
      orderBy: { date: 'asc' as const },
    });

    res.json(entries);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createFoodEntry(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { foodName, calories, protein, carbs, fat, mealType, date } = req.body;

    if (!foodName || typeof foodName !== 'string' || foodName.trim() === '') {
      res.status(400).json({ error: 'Food name is required' });
      return;
    }

    if (typeof calories !== 'number' || !Number.isInteger(calories) || calories < 0) {
      res.status(400).json({ error: 'Calories must be a non-negative integer' });
      return;
    }

    if (!mealType || !VALID_MEAL_TYPES.includes(mealType)) {
      res.status(400).json({ error: 'Meal type must be one of: breakfast, lunch, dinner, snack' });
      return;
    }

    if (!date) {
      res.status(400).json({ error: 'Date is required' });
      return;
    }

    for (const [label, value] of [['protein', protein], ['carbs', carbs], ['fat', fat]] as const) {
      if (value !== undefined && (typeof value !== 'number' || !Number.isFinite(value) || value < 0)) {
        res.status(400).json({ error: `${label} must be a non-negative number` });
        return;
      }
    }

    const entry = await prisma.foodEntry.create({
      data: {
        userId,
        foodName: foodName.trim(),
        calories,
        protein: typeof protein === 'number' ? protein : 0,
        carbs: typeof carbs === 'number' ? carbs : 0,
        fat: typeof fat === 'number' ? fat : 0,
        mealType,
        date: new Date(date),
      },
    });

    res.status(201).json(entry);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

const BARCODE_RE = /^\d{6,14}$/;

// GET /api/food-entries/barcode/:code — looks up a product by UPC/EAN, first
// via Open Food Facts (free, no API key), falling back to our own
// CustomFoodProduct table for anything OFF doesn't have. Returns per-100g
// macros so the client can scale them by however many grams were eaten.
export async function lookupBarcode(req: Request, res: Response): Promise<void> {
  const code = (req.params.code as string || '').trim();
  if (!BARCODE_RE.test(code)) {
    res.status(400).json({ error: 'Barcode must be a 6-14 digit UPC/EAN' });
    return;
  }

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json`, { signal: ctrl.signal });
    clearTimeout(timer);

    if (r.ok) {
      const data = await r.json() as {
        status?: number;
        product?: {
          product_name?: string;
          nutriments?: Record<string, number>;
          serving_size?: string;
          serving_quantity?: number;
        };
      };

      if (data.status === 1 && data.product?.product_name) {
        const n = data.product.nutriments ?? {};
        // Open Food Facts keys energy in kcal directly under "energy-kcal_100g"
        // (falling back to kJ/4.184 if only the kJ field is present).
        const caloriesPer100g = n['energy-kcal_100g'] ?? (n['energy_100g'] ? n['energy_100g'] / 4.184 : 0);

        res.json({
          found: true,
          source: 'openfoodfacts',
          foodName: data.product.product_name.trim(),
          caloriesPer100g: Math.round(caloriesPer100g) || 0,
          proteinPer100g: n['proteins_100g'] ?? 0,
          carbsPer100g: n['carbohydrates_100g'] ?? 0,
          fatPer100g: n['fat_100g'] ?? 0,
          servingGrams: data.product.serving_quantity ?? null,
        });
        return;
      }
    }
  } catch (err) {
    console.error(err);
    // Open Food Facts being unreachable shouldn't block the custom fallback below.
  }

  try {
    const custom = await prisma.customFoodProduct.findUnique({ where: { barcode: code } });
    if (custom) {
      res.json({
        found: true,
        source: 'custom',
        foodName: custom.foodName,
        caloriesPer100g: custom.caloriesPer100g,
        proteinPer100g: custom.proteinPer100g,
        carbsPer100g: custom.carbsPer100g,
        fatPer100g: custom.fatPer100g,
        servingGrams: null,
      });
      return;
    }
    res.json({ found: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// POST /api/food-entries/barcode/:code — saves a user-entered product for a
// barcode Open Food Facts (and our own table) didn't have, so every future
// scan of that barcode — by anyone — resolves correctly from here on.
export async function createCustomFoodProduct(req: Request, res: Response): Promise<void> {
  const code = (req.params.code as string || '').trim();
  if (!BARCODE_RE.test(code)) {
    res.status(400).json({ error: 'Barcode must be a 6-14 digit UPC/EAN' });
    return;
  }

  try {
    const userId = req.user!.id;
    const { foodName, caloriesPer100g, proteinPer100g, carbsPer100g, fatPer100g } = req.body;

    if (!foodName || typeof foodName !== 'string' || foodName.trim() === '') {
      res.status(400).json({ error: 'Food name is required' });
      return;
    }
    if (typeof caloriesPer100g !== 'number' || !Number.isFinite(caloriesPer100g) || caloriesPer100g < 0) {
      res.status(400).json({ error: 'caloriesPer100g must be a non-negative number' });
      return;
    }
    for (const [label, value] of [['proteinPer100g', proteinPer100g], ['carbsPer100g', carbsPer100g], ['fatPer100g', fatPer100g]] as const) {
      if (value !== undefined && (typeof value !== 'number' || !Number.isFinite(value) || value < 0)) {
        res.status(400).json({ error: `${label} must be a non-negative number` });
        return;
      }
    }

    const product = await prisma.customFoodProduct.create({
      data: {
        barcode: code,
        foodName: foodName.trim(),
        caloriesPer100g: Math.round(caloriesPer100g),
        proteinPer100g: typeof proteinPer100g === 'number' ? proteinPer100g : 0,
        carbsPer100g: typeof carbsPer100g === 'number' ? carbsPer100g : 0,
        fatPer100g: typeof fatPer100g === 'number' ? fatPer100g : 0,
        createdByUserId: userId,
      },
    });

    res.status(201).json({
      found: true,
      source: 'custom',
      foodName: product.foodName,
      caloriesPer100g: product.caloriesPer100g,
      proteinPer100g: product.proteinPer100g,
      carbsPer100g: product.carbsPer100g,
      fatPer100g: product.fatPer100g,
      servingGrams: null,
    });
  } catch (err: any) {
    // Someone else already filled in this barcode between our lookup and
    // this submit — treat it as success and hand back the existing product
    // rather than erroring on the unique constraint.
    if (err?.code === 'P2002') {
      const existing = await prisma.customFoodProduct.findUnique({ where: { barcode: code } });
      if (existing) {
        res.status(200).json({
          found: true,
          source: 'custom',
          foodName: existing.foodName,
          caloriesPer100g: existing.caloriesPer100g,
          proteinPer100g: existing.proteinPer100g,
          carbsPer100g: existing.carbsPer100g,
          fatPer100g: existing.fatPer100g,
          servingGrams: null,
        });
        return;
      }
    }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteFoodEntry(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const entryId = req.params.id as string;

    const entry = await prisma.foodEntry.findFirst({ where: { id: entryId, userId } });
    if (!entry) {
      res.status(404).json({ error: 'Food entry not found' });
      return;
    }

    await prisma.foodEntry.delete({ where: { id: entryId } });
    res.json({ message: 'Food entry deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
