import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { awardXP } from '../services/xp';

export async function listQuests(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const quests = await prisma.quest.findMany({
      where: { userId },
      include: { steps: { orderBy: { sortOrder: 'asc' as const } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(quests);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createQuest(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { title, description, steps, xpReward } = req.body;

    if (!title || !description || !Array.isArray(steps) || steps.length === 0) {
      res.status(400).json({ error: 'Title, description, and at least one step are required' });
      return;
    }

    if (typeof xpReward !== 'number' || xpReward < 0) {
      res.status(400).json({ error: 'xpReward must be a non-negative number' });
      return;
    }

    const quest = await prisma.quest.create({
      data: {
        userId,
        title,
        description,
        xpReward,
        steps: {
          create: steps.map((desc: string, i: number) => ({
            description: desc,
            sortOrder: i,
          })),
        },
      },
      include: { steps: { orderBy: { sortOrder: 'asc' as const } } },
    });

    res.status(201).json(quest);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function completeStep(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const questId = req.params.id as string;
    const stepId = req.params.stepId as string;

    const quest = await prisma.quest.findFirst({
      where: { id: questId, userId },
      include: { steps: { orderBy: { sortOrder: 'asc' as const } } },
    });

    if (!quest) {
      res.status(404).json({ error: 'Quest not found' });
      return;
    }

    if (quest.completed) {
      res.status(400).json({ error: 'Quest is already completed' });
      return;
    }

    const step = quest.steps.find((s: { id: string }) => s.id === stepId);
    if (!step) {
      res.status(404).json({ error: 'Step not found' });
      return;
    }

    if (step.completed) {
      res.status(400).json({ error: 'This step is already completed' });
      return;
    }

    await prisma.questStep.update({
      where: { id: stepId },
      data: { completed: true },
    });

    const completedCount = quest.steps.filter((s: { completed: boolean }) => s.completed).length + 1;
    const allDone = completedCount === quest.steps.length;

    if (allDone) {
      await prisma.quest.update({
        where: { id: questId },
        data: { completed: true },
      });
      await awardXP(userId, quest.xpReward, `quest:${questId}`);
    }

    const updated = await prisma.quest.findUnique({
      where: { id: questId },
      include: { steps: { orderBy: { sortOrder: 'asc' as const } } },
    });

    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}
