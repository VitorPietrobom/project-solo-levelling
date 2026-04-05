import { Request, Response } from 'express';
import prisma from '../lib/prisma';

const VALID_TYPES = ['chest', 'waist', 'hips', 'arms', 'thighs'] as const;

export async function listMeasurements(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { type } = req.query;

    const where: Record<string, unknown> = { userId };

    if (type) {
      if (!VALID_TYPES.includes(type as any)) {
        res.status(400).json({ error: 'Invalid measurement type' });
        return;
      }
      where.type = type;
    }

    const measurements = await prisma.measurement.findMany({
      where,
      orderBy: { date: 'asc' as const },
    });

    res.json(measurements);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createMeasurement(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { type, value, date } = req.body;

    if (!type || !VALID_TYPES.includes(type)) {
      res.status(400).json({ error: 'Type must be one of: chest, waist, hips, arms, thighs' });
      return;
    }

    if (typeof value !== 'number' || value <= 0) {
      res.status(400).json({ error: 'Value must be a positive number' });
      return;
    }

    if (!date) {
      res.status(400).json({ error: 'Date is required' });
      return;
    }

    const measurement = await prisma.measurement.create({
      data: { userId, type, value, date: new Date(date) },
    });

    res.status(201).json(measurement);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}
