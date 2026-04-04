import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { awardXP } from '../services/xp';

/**
 * Returns the start of today (midnight) in UTC.
 */
function getStartOfToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Returns the start of the current week (Monday 00:00 UTC).
 */
function getStartOfWeek(): Date {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = today.getUTCDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? 6 : day - 1; // days since Monday
  today.setUTCDate(today.getUTCDate() - diff);
  return today;
}

/**
 * Computes whether a task is completed for the current period
 * based on its recurrence and lastCompletedAt timestamp.
 */
function isCompletedForPeriod(recurrence: string, lastCompletedAt: Date | null): boolean {
  if (!lastCompletedAt) return false;

  if (recurrence === 'daily') {
    return lastCompletedAt >= getStartOfToday();
  }
  // weekly
  return lastCompletedAt >= getStartOfWeek();
}

export async function listTasks(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const tasks = await prisma.task.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' as const },
    });

    const result = tasks.map((task) => ({
      ...task,
      completedToday: isCompletedForPeriod(task.recurrence, task.lastCompletedAt),
    }));

    res.json(result);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createTask(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { title, recurrence, xpReward } = req.body;

    if (!title || typeof title !== 'string') {
      res.status(400).json({ error: 'Title is required' });
      return;
    }

    if (recurrence !== 'daily' && recurrence !== 'weekly') {
      res.status(400).json({ error: 'Recurrence must be daily or weekly' });
      return;
    }

    if (typeof xpReward !== 'number' || xpReward < 0) {
      res.status(400).json({ error: 'xpReward must be a non-negative number' });
      return;
    }

    const task = await prisma.task.create({
      data: { userId, title, recurrence, xpReward },
    });

    res.status(201).json(task);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function completeTask(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const taskId = req.params.id as string;

    const task = await prisma.task.findFirst({
      where: { id: taskId, userId },
    });

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    if (isCompletedForPeriod(task.recurrence, task.lastCompletedAt)) {
      res.status(400).json({ error: 'Task is already completed for this period' });
      return;
    }

    const now = new Date();

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: { completedToday: true, lastCompletedAt: now },
    });

    await awardXP(userId, task.xpReward, `task:${taskId}`);

    res.json({
      ...updated,
      completedToday: true,
    });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}
