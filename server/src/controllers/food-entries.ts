import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { parseCalendarDate } from '../lib/calendarDate';

const VALID_MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

export async function listFoodEntries(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { date } = req.query;

    if (!date || typeof date !== 'string') {
      res.status(400).json({ error: 'Date query parameter is required' });
      return;
    }
    const day = parseCalendarDate(date);
    if (!day) {
      res.status(400).json({ error: 'Date must be in YYYY-MM-DD format' });
      return;
    }

    const entries = await prisma.foodEntry.findMany({
      where: {
        userId,
        date: day,
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
    const parsedDate = parseCalendarDate(date);
    if (!parsedDate) {
      res.status(400).json({ error: 'Date must be in YYYY-MM-DD format' });
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
        date: parsedDate,
      },
    });

    res.status(201).json(entry);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

const BARCODE_RE = /^\d{6,14}$/;

// Open Food Facts nutriments are loosely typed: numbers, numeric strings
// ("7.2"), null or junk. Coerce to a finite, non-negative number (else 0).
function toNutriment(v: unknown): number {
  if (v === null || v === undefined || v === '' || typeof v === 'boolean') return 0;
  const num = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(num) && num >= 0 ? num : 0;
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

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
    // AbortSignal.timeout covers the whole exchange, including reading the
    // body via r.json(), so a stalled response can't hang the function.
    const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json`, {
      signal: AbortSignal.timeout(5000),
    });

    if (r.ok) {
      const data = await r.json() as {
        status?: number;
        product?: {
          product_name?: unknown;
          nutriments?: Record<string, unknown> | null;
          serving_size?: unknown;
          serving_quantity?: unknown;
        };
      };

      const name = typeof data.product?.product_name === 'string' ? data.product.product_name.trim() : '';
      if (data.status === 1 && data.product && name) {
        const raw = data.product.nutriments;
        const n: Record<string, unknown> = raw && typeof raw === 'object' ? raw : {};
        // Open Food Facts keys energy in kcal directly under "energy-kcal_100g"
        // (falling back to kJ/4.184 if only the kJ field is present).
        const kcal = toNutriment(n['energy-kcal_100g']);
        const caloriesPer100g = kcal > 0 ? kcal : toNutriment(n['energy_100g']) / 4.184;
        const serving = toNutriment(data.product.serving_quantity);

        res.json({
          found: true,
          source: 'openfoodfacts',
          foodName: name,
          caloriesPer100g: Math.round(caloriesPer100g),
          proteinPer100g: round1(toNutriment(n['proteins_100g'])),
          carbsPer100g: round1(toNutriment(n['carbohydrates_100g'])),
          fatPer100g: round1(toNutriment(n['fat_100g'])),
          servingGrams: serving > 0 ? round1(serving) : null,
        });
        return;
      }
    }
  } catch (err) {
    console.error(err);
    // Open Food Facts being unreachable shouldn't block the custom fallback below.
  }

  try {
    // Prefer the requester's own entry so a bogus shared entry can always be
    // overridden; otherwise fall back to the oldest entry anyone saved.
    const userId = req.user!.id;
    const custom =
      (await prisma.customFoodProduct.findFirst({ where: { barcode: code, createdByUserId: userId } })) ??
      (await prisma.customFoodProduct.findFirst({ where: { barcode: code }, orderBy: { createdAt: 'asc' } }));
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
// barcode Open Food Facts didn't have (or one the user wants to correct).
// Each user has their own row per barcode: saving again overwrites it, and it
// takes precedence over other users' entries for that user's lookups.
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

    const fields = {
      foodName: foodName.trim(),
      caloriesPer100g: Math.round(caloriesPer100g),
      proteinPer100g: typeof proteinPer100g === 'number' ? proteinPer100g : 0,
      carbsPer100g: typeof carbsPer100g === 'number' ? carbsPer100g : 0,
      fatPer100g: typeof fatPer100g === 'number' ? fatPer100g : 0,
    };
    const product = await prisma.customFoodProduct.upsert({
      where: { barcode_createdByUserId: { barcode: code, createdByUserId: userId } },
      create: { barcode: code, ...fields, createdByUserId: userId },
      update: fields,
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
  } catch (err) {
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
