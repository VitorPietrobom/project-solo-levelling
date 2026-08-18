import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { awardXP } from '../services/xp';

function getStartOfToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function getStartOfWeek(): Date {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = today.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  today.setUTCDate(today.getUTCDate() - diff);
  return today;
}

function isCompletedForPeriod(recurrence: string, lastCompletedAt: Date | null): boolean {
  if (!lastCompletedAt) return false;
  if (recurrence === 'daily') return lastCompletedAt >= getStartOfToday();
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
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createTask(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { title, recurrence, xpReward, linkedSkillId } = req.body;

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

    // Validate linkedSkillId belongs to this user if provided
    if (linkedSkillId) {
      const skill = await prisma.skill.findFirst({ where: { id: linkedSkillId, userId } });
      if (!skill) {
        res.status(400).json({ error: 'Skill not found' });
        return;
      }
    }

    const task = await prisma.task.create({
      data: { userId, title, recurrence, xpReward, linkedSkillId: linkedSkillId ?? null },
    });

    res.status(201).json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function completeTask(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const taskId = req.params.id as string;

    const task = await prisma.task.findFirst({ where: { id: taskId, userId } });

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    if (isCompletedForPeriod(task.recurrence, task.lastCompletedAt)) {
      res.status(400).json({ error: 'Task is already completed for this period' });
      return;
    }

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: { completedToday: true, lastCompletedAt: new Date() },
    });

    await awardXP(userId, task.xpReward, `task:${taskId}`);

    // Also award skill XP if this task is linked to a skill
    if (task.linkedSkillId) {
      await prisma.skill.update({
        where: { id: task.linkedSkillId },
        data: { totalXP: { increment: task.xpReward } },
      });
    }

    res.json({ ...updated, completedToday: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function uncompleteTask(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const taskId = req.params.id as string;

    const task = await prisma.task.findFirst({ where: { id: taskId, userId } });

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    if (!isCompletedForPeriod(task.recurrence, task.lastCompletedAt)) {
      res.status(400).json({ error: 'Task is not completed for this period' });
      return;
    }

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: { completedToday: false, lastCompletedAt: null },
    });

    // Deduct XP from user (floor at 0)
    await prisma.user.update({
      where: { id: userId },
      data: { totalXP: { decrement: task.xpReward } },
    });
    await prisma.user.updateMany({
      where: { id: userId, totalXP: { lt: 0 } },
      data: { totalXP: 0 },
    });

    // Deduct skill XP if linked
    if (task.linkedSkillId) {
      await prisma.skill.update({
        where: { id: task.linkedSkillId },
        data: { totalXP: { decrement: task.xpReward } },
      });
      await prisma.skill.updateMany({
        where: { id: task.linkedSkillId, totalXP: { lt: 0 } },
        data: { totalXP: 0 },
      });
    }

    res.json({ ...updated, completedToday: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteTask(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;
    const task = await prisma.task.findFirst({ where: { id, userId } });
    if (!task) { res.status(404).json({ error: 'Task not found' }); return; }
    await prisma.task.delete({ where: { id } });
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
