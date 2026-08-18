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
  } catch (err) {
    console.error(err);
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
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteSkill(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;
    const skill = await prisma.skill.findFirst({ where: { id, userId } });
    if (!skill) { res.status(404).json({ error: 'Skill not found' }); return; }
    await prisma.skill.delete({ where: { id } });
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
