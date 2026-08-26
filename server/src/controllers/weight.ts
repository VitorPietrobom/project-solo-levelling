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
  } catch (err) {
    console.error(err);
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
      // A WHOOP auto-sync may have already logged today's weight — a manual
      // weigh-in for the same day should win, not silently 409 and vanish
      // from the UI. A real duplicate manual entry still gets rejected.
      if (existing.source === 'whoop') {
        const updated = await prisma.weightEntry.update({
          where: { id: existing.id },
          data: { weight, source: 'manual' },
        });
        res.status(200).json(updated);
        return;
      }
      res.status(409).json({ error: 'Weight entry already exists for this date' });
      return;
    }

    const entry = await prisma.weightEntry.create({
      data: { userId, weight, date: entryDate },
    });

    res.status(201).json(entry);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateWeightEntry(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;
    const { weight } = req.body;

    if (typeof weight !== 'number' || weight <= 0) {
      res.status(400).json({ error: 'Weight must be a positive number' });
      return;
    }

    const existing = await prisma.weightEntry.findFirst({ where: { id, userId } });
    if (!existing) {
      res.status(404).json({ error: 'Weight entry not found' });
      return;
    }

    // A correction to a manual weigh-in — not a re-sync — so it should stay
    // "manual" even if the original row came from WHOOP (same reasoning as
    // createWeightEntry's whoop→manual override for the same-day case).
    const updated = await prisma.weightEntry.update({
      where: { id },
      data: { weight, source: 'manual' },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteWeightEntry(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;

    const existing = await prisma.weightEntry.findFirst({ where: { id, userId } });
    if (!existing) {
      res.status(404).json({ error: 'Weight entry not found' });
      return;
    }

    await prisma.weightEntry.delete({ where: { id } });
    res.json({ message: 'Weight entry deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
