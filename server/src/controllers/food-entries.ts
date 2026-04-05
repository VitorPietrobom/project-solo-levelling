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
  } catch {
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
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}
