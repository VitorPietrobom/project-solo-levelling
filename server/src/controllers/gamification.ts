import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { getCurrentLevel, getProgressToNextLevel } from '../services/xp';
import { computeStreak } from '../services/streak';

// Wide enough to catch any real streak (a year), cheap enough to fetch every load.
const ACTIVITY_LOOKBACK_DAYS = 400;

export async function getStatus(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { totalXP: true, hunterName: true, email: true },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const level = getCurrentLevel(user.totalXP);
    const progress = getProgressToNextLevel(user.totalXP);

    const today = new Date();
    const since = new Date(today);
    since.setUTCDate(since.getUTCDate() - ACTIVITY_LOOKBACK_DAYS);
    const activity = await prisma.dailyActivity.findMany({
      where: { userId, date: { gte: since.toISOString().slice(0, 10) } },
      select: { date: true },
    });
    const streak = computeStreak(activity.map((a) => a.date), today.toISOString().slice(0, 10));

    // Never show a blank identity — fall back to the email's local part.
    const hunterName = user.hunterName?.trim() || user.email.split('@')[0];

    res.json({
      level,
      totalXP: user.totalXP,
      progress,
      streak,
      hunterName,
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

// PUT /api/gamification/profile — { hunterName }
export async function updateProfile(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { hunterName } = req.body ?? {};

    if (hunterName !== undefined && hunterName !== null && typeof hunterName !== 'string') {
      res.status(400).json({ error: 'hunterName must be a string' });
      return;
    }
    const trimmed = typeof hunterName === 'string' ? hunterName.trim().slice(0, 40) : null;

    const user = await prisma.user.update({
      where: { id: userId },
      // An empty string clears back to the email-derived default.
      data: { hunterName: trimmed || null },
      select: { hunterName: true, email: true },
    });

    res.json({ hunterName: user.hunterName?.trim() || user.email.split('@')[0] });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
