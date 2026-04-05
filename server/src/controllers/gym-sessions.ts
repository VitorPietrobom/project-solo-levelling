import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { calculateSoreness } from '../services/soreness';

export async function listGymSessions(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;

    const sessions = await prisma.gymSession.findMany({
      where: { userId },
      orderBy: { date: 'desc' as const },
      take: 20,
      include: {
        exercises: {
          include: {
            muscleGroups: true,
          },
        },
      },
    });

    res.json(sessions);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createGymSession(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { date, notes, exercises } = req.body;

    if (!date) {
      res.status(400).json({ error: 'Date is required' });
      return;
    }

    if (!Array.isArray(exercises) || exercises.length === 0) {
      res.status(400).json({ error: 'At least one exercise is required' });
      return;
    }

    const session = await prisma.gymSession.create({
      data: {
        userId,
        date: new Date(date),
        notes: notes || null,
        exercises: {
          create: exercises.map((ex: any) => ({
            name: ex.name,
            sets: ex.sets,
            reps: ex.reps,
            weight: ex.weight ?? 0,
            muscleGroups: {
              create: (ex.muscleGroups || []).map((mg: string) => ({
                muscleGroup: mg,
              })),
            },
          })),
        },
      },
      include: {
        exercises: {
          include: {
            muscleGroups: true,
          },
        },
      },
    });

    res.status(201).json(session);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getHeatmap(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const sessions = await prisma.gymSession.findMany({
      where: {
        userId,
        date: { gte: sevenDaysAgo },
      },
      include: {
        exercises: {
          include: {
            muscleGroups: true,
          },
        },
      },
    });

    const sorenessMap = calculateSoreness(sessions, now);

    const result: Record<string, number> = {};
    for (const [group, score] of sorenessMap) {
      result[group] = score;
    }

    res.json(result);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteGymSession(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const sessionId = req.params.id as string;

    const session = await prisma.gymSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    await prisma.gymSession.delete({ where: { id: sessionId } });
    res.json({ message: 'Session deleted' });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}
