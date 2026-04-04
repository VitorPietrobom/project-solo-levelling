import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { getCurrentLevel, getProgressToNextLevel } from '../services/xp';

export async function listSkills(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const skills = await prisma.skill.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' as const },
    });

    const result = skills.map(skill => ({
      ...skill,
      level: getCurrentLevel(skill.totalXP),
      progress: getProgressToNextLevel(skill.totalXP),
    }));

    res.json(result);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createSkill(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { name } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    const skill = await prisma.skill.create({
      data: { userId, name: name.trim() },
    });

    res.status(201).json({
      ...skill,
      level: getCurrentLevel(skill.totalXP),
      progress: getProgressToNextLevel(skill.totalXP),
    });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function logActivity(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const skillId = req.params.id as string;
    const { xp } = req.body;

    if (typeof xp !== 'number' || xp <= 0) {
      res.status(400).json({ error: 'XP must be a positive number' });
      return;
    }

    const skill = await prisma.skill.findFirst({
      where: { id: skillId, userId },
    });

    if (!skill) {
      res.status(404).json({ error: 'Skill not found' });
      return;
    }

    const updated = await prisma.skill.update({
      where: { id: skillId },
      data: { totalXP: { increment: xp } },
    });

    res.json({
      ...updated,
      level: getCurrentLevel(updated.totalXP),
      progress: getProgressToNextLevel(updated.totalXP),
    });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}
