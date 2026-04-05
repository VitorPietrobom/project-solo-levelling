import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export async function listRecipes(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { search } = req.query;

    const where: any = { userId };

    if (search && typeof search === 'string' && search.trim() !== '') {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { ingredients: { some: { name: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    const recipes = await prisma.recipe.findMany({
      where,
      include: { ingredients: true },
      orderBy: { createdAt: 'desc' as const },
    });

    res.json(recipes);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createRecipe(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { name, steps, caloriesPerServing, ingredients } = req.body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    if (!steps || typeof steps !== 'string' || steps.trim() === '') {
      res.status(400).json({ error: 'Steps are required' });
      return;
    }

    if (typeof caloriesPerServing !== 'number' || !Number.isInteger(caloriesPerServing) || caloriesPerServing < 0) {
      res.status(400).json({ error: 'Calories per serving must be a non-negative integer' });
      return;
    }

    if (ingredients && !Array.isArray(ingredients)) {
      res.status(400).json({ error: 'Ingredients must be an array' });
      return;
    }

    const recipe = await prisma.recipe.create({
      data: {
        userId,
        name: name.trim(),
        steps: steps.trim(),
        caloriesPerServing,
        ingredients: {
          create: (ingredients || []).map((ing: { name: string; quantity: string; unit: string }) => ({
            name: ing.name,
            quantity: ing.quantity,
            unit: ing.unit,
          })),
        },
      },
      include: { ingredients: true },
    });

    res.status(201).json(recipe);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getRecipe(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const recipeId = req.params.id as string;

    const recipe = await prisma.recipe.findFirst({
      where: { id: recipeId, userId },
      include: { ingredients: true },
    });

    if (!recipe) {
      res.status(404).json({ error: 'Recipe not found' });
      return;
    }

    res.json(recipe);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteRecipe(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const recipeId = req.params.id as string;

    const recipe = await prisma.recipe.findFirst({
      where: { id: recipeId, userId },
    });

    if (!recipe) {
      res.status(404).json({ error: 'Recipe not found' });
      return;
    }

    await prisma.recipe.delete({ where: { id: recipeId } });

    res.json({ message: 'Recipe deleted' });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}
