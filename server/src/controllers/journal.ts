import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export async function listJournalEntries(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { start, end } = req.query;

    const where: any = { userId };
    if (start && typeof start === 'string') {
      where.date = { ...where.date, gte: new Date(start) };
    }
    if (end && typeof end === 'string') {
      where.date = { ...where.date, lte: new Date(end) };
    }

    const entries = await prisma.journalEntry.findMany({
      where,
      orderBy: { date: 'desc' as const },
    });

    res.json(entries);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createJournalEntry(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { content, tags, linkedSkillId, date } = req.body;

    if (!content || typeof content !== 'string' || content.trim() === '') {
      res.status(400).json({ error: 'Content is required' });
      return;
    }
    if (!date || typeof date !== 'string') {
      res.status(400).json({ error: 'Date is required' });
      return;
    }

    const parsedTags = Array.isArray(tags) ? tags.filter((t: any) => typeof t === 'string') : [];

    const entry = await prisma.journalEntry.create({
      data: {
        userId,
        content: content.trim(),
        tags: parsedTags,
        linkedSkillId: linkedSkillId || null,
        date: new Date(date),
      },
    });

    res.status(201).json(entry);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteJournalEntry(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const entryId = req.params.id as string;

    const entry = await prisma.journalEntry.findFirst({ where: { id: entryId, userId } });
    if (!entry) {
      res.status(404).json({ error: 'Journal entry not found' });
      return;
    }

    await prisma.journalEntry.delete({ where: { id: entryId } });
    res.json({ message: 'Journal entry deleted' });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}
