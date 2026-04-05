import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export async function listTrainingPrograms(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;

    const programs = await prisma.trainingProgram.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' as const },
      include: {
        days: {
          orderBy: { dayOfWeek: 'asc' as const },
          include: {
            exercises: {
              orderBy: { sortOrder: 'asc' as const },
            },
          },
        },
      },
    });

    res.json(programs);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createTrainingProgram(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { name, days } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    if (!Array.isArray(days) || days.length === 0) {
      res.status(400).json({ error: 'At least one day is required' });
      return;
    }

    const program = await prisma.trainingProgram.create({
      data: {
        userId,
        name,
        days: {
          create: days.map((day: any) => ({
            dayOfWeek: day.dayOfWeek,
            exercises: {
              create: (day.exercises || []).map((ex: any, index: number) => ({
                name: ex.name,
                sets: ex.sets,
                reps: ex.reps,
                targetWeight: ex.targetWeight,
                sortOrder: index,
              })),
            },
          })),
        },
      },
      include: {
        days: {
          orderBy: { dayOfWeek: 'asc' as const },
          include: {
            exercises: {
              orderBy: { sortOrder: 'asc' as const },
            },
          },
        },
      },
    });

    res.status(201).json(program);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function activateTrainingProgram(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const programId = req.params.id as string;

    const program = await prisma.trainingProgram.findFirst({
      where: { id: programId, userId },
    });

    if (!program) {
      res.status(404).json({ error: 'Training program not found' });
      return;
    }

    // Deactivate all user programs first
    await prisma.trainingProgram.updateMany({
      where: { userId },
      data: { active: false },
    });

    // Activate the specified program
    const updated = await prisma.trainingProgram.update({
      where: { id: programId },
      data: { active: true },
      include: {
        days: {
          orderBy: { dayOfWeek: 'asc' as const },
          include: {
            exercises: {
              orderBy: { sortOrder: 'asc' as const },
            },
          },
        },
      },
    });

    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteTrainingProgram(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const programId = req.params.id as string;

    const program = await prisma.trainingProgram.findFirst({
      where: { id: programId, userId },
    });

    if (!program) {
      res.status(404).json({ error: 'Training program not found' });
      return;
    }

    await prisma.trainingProgram.delete({ where: { id: programId } });
    res.json({ message: 'Training program deleted' });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}
