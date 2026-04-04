import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { getCurrentLevel, getProgressToNextLevel } from '../services/xp';

export async function getStatus(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { totalXP: true },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const level = getCurrentLevel(user.totalXP);
    const progress = getProgressToNextLevel(user.totalXP);

    res.json({
      level,
      totalXP: user.totalXP,
      progress,
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
