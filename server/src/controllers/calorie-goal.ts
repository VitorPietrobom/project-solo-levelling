import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export async function getCalorieGoal(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { calorieGoal: true },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ calorieGoal: user.calorieGoal });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function setCalorieGoal(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { calorieGoal } = req.body;

    if (typeof calorieGoal !== 'number' || !Number.isInteger(calorieGoal) || calorieGoal <= 0) {
      res.status(400).json({ error: 'Calorie goal must be a positive integer' });
      return;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { calorieGoal },
      select: { calorieGoal: true },
    });

    res.json({ calorieGoal: user.calorieGoal });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}
