import { Request, Response } from 'express';
import { DayOfWeek, MealType } from '@prisma/client';
import prisma from '../lib/prisma';

const VALID_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
const VALID_MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

function getMostRecentMonday(): Date {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diff));
  return monday;
}

export async function getMealPrepPlan(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const monday = getMostRecentMonday();

    const plan = await prisma.mealPrepPlan.findFirst({
      where: { userId, weekStartDate: monday },
      include: {
        entries: {
          include: {
            recipe: {
              include: { ingredients: true },
            },
          },
          orderBy: { dayOfWeek: 'asc' as const },
        },
      },
    });

    res.json(plan);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createOrUpdateMealPrepPlan(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { weekStartDate, entries } = req.body;

    if (!weekStartDate) {
      res.status(400).json({ error: 'weekStartDate is required' });
      return;
    }

    const date = new Date(weekStartDate);
    if (date.getUTCDay() !== 1) {
      res.status(400).json({ error: 'weekStartDate must be a Monday' });
      return;
    }

    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      res.status(400).json({ error: 'entries must be a non-empty array' });
      return;
    }

    for (const entry of entries) {
      if (!VALID_DAYS.includes(entry.dayOfWeek)) {
        res.status(400).json({ error: `Invalid dayOfWeek: ${entry.dayOfWeek}` });
        return;
      }
      if (!VALID_MEAL_TYPES.includes(entry.mealType)) {
        res.status(400).json({ error: `Invalid mealType: ${entry.mealType}` });
        return;
      }
      if (!entry.recipeId) {
        res.status(400).json({ error: 'Each entry must have a recipeId' });
        return;
      }
    }

    // Upsert: find existing plan for this week, delete old entries, create new ones
    const existing = await prisma.mealPrepPlan.findFirst({
      where: { userId, weekStartDate: date },
    });

    let plan;
    if (existing) {
      // Delete old entries and create new ones
      await prisma.mealPrepEntry.deleteMany({ where: { planId: existing.id } });
      plan = await prisma.mealPrepPlan.update({
        where: { id: existing.id },
        data: {
          entries: {
            create: entries.map((e: { dayOfWeek: string; mealType: string; recipeId: string }) => ({
              dayOfWeek: e.dayOfWeek as DayOfWeek,
              mealType: e.mealType as MealType,
              recipe: { connect: { id: e.recipeId } },
            })),
          },
        },
        include: {
          entries: {
            include: {
              recipe: {
                include: { ingredients: true },
              },
            },
            orderBy: { dayOfWeek: 'asc' as const },
          },
        },
      });
    } else {
      plan = await prisma.mealPrepPlan.create({
        data: {
          userId,
          weekStartDate: date,
          entries: {
            create: entries.map((e: { dayOfWeek: string; mealType: string; recipeId: string }) => ({
              dayOfWeek: e.dayOfWeek as DayOfWeek,
              mealType: e.mealType as MealType,
              recipe: { connect: { id: e.recipeId } },
            })),
          },
        },
        include: {
          entries: {
            include: {
              recipe: {
                include: { ingredients: true },
              },
            },
            orderBy: { dayOfWeek: 'asc' as const },
          },
        },
      });
    }

    res.status(201).json(plan);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getGroceryList(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const day = req.params.day as string;

    if (!VALID_DAYS.includes(day as any)) {
      res.status(400).json({ error: `Invalid day: ${day}` });
      return;
    }

    const monday = getMostRecentMonday();

    const plan = await prisma.mealPrepPlan.findFirst({
      where: { userId, weekStartDate: monday },
      include: {
        entries: {
          where: { dayOfWeek: day as any },
          include: {
            recipe: {
              include: { ingredients: true },
            },
          },
        },
      },
    });

    if (!plan) {
      res.json({ ingredients: [], totalCalories: 0 });
      return;
    }

    const ingredients: { name: string; quantity: string; unit: string }[] = [];
    let totalCalories = 0;

    for (const entry of plan.entries) {
      totalCalories += entry.recipe.caloriesPerServing;
      for (const ing of entry.recipe.ingredients) {
        ingredients.push({
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
        });
      }
    }

    res.json({ ingredients, totalCalories });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteMealPrepPlan(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const planId = req.params.id as string;

    const plan = await prisma.mealPrepPlan.findFirst({ where: { id: planId, userId } });
    if (!plan) {
      res.status(404).json({ error: 'Meal prep plan not found' });
      return;
    }

    await prisma.mealPrepPlan.delete({ where: { id: planId } });
    res.json({ message: 'Meal prep plan deleted' });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}
