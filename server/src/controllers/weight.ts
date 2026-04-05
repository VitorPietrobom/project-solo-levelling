import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export async function listWeightEntries(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { start, end } = req.query;

    const where: Record<string, unknown> = { userId };

    if (start || end) {
      const dateFilter: Record<string, Date> = {};
      if (typeof start === 'string') dateFilter.gte = new Date(start);
      if (typeof end === 'string') dateFilter.lte = new Date(end);
      where.date = dateFilter;
    }

    const entries = await prisma.weightEntry.findMany({
      where,
      orderBy: { date: 'asc' as const },
    });

    res.json(entries);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createWeightEntry(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { weight, date } = req.body;

    if (typeof weight !== 'number' || weight <= 0) {
      res.status(400).json({ error: 'Weight must be a positive number' });
      return;
    }

    if (!date) {
      res.status(400).json({ error: 'Date is required' });
      return;
    }

    const entryDate = new Date(date);

    // Check for duplicate userId+date
    const existing = await prisma.weightEntry.findUnique({
      where: { userId_date: { userId, date: entryDate } },
    });

    if (existing) {
      res.status(409).json({ error: 'Weight entry already exists for this date' });
      return;
    }

    const entry = await prisma.weightEntry.create({
      data: { userId, weight, date: entryDate },
    });

    res.status(201).json(entry);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}
