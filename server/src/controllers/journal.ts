import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { parseCalendarDate } from '../lib/calendarDate';
import { awardXP, revokeXP } from '../services/xp';

export const JOURNAL_XP = 10;

export async function listJournalEntries(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { start, end } = req.query;

    const where: any = { userId };
    if (start !== undefined) {
      const d = parseCalendarDate(start);
      if (!d) {
        res.status(400).json({ error: 'start must be in YYYY-MM-DD format' });
        return;
      }
      where.date = { ...where.date, gte: d };
    }
    if (end !== undefined) {
      const d = parseCalendarDate(end);
      if (!d) {
        res.status(400).json({ error: 'end must be in YYYY-MM-DD format' });
        return;
      }
      where.date = { ...where.date, lte: d };
    }

    const entries = await prisma.journalEntry.findMany({
      where,
      orderBy: { date: 'desc' as const },
    });

    res.json(entries);
  } catch (err) {
    console.error(err);
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
    const parsedDate = parseCalendarDate(date);
    if (!parsedDate) {
      res.status(400).json({ error: 'Date must be in YYYY-MM-DD format' });
      return;
    }

    const parsedTags = Array.isArray(tags) ? tags.filter((t: any) => typeof t === 'string') : [];

    const entry = await prisma.journalEntry.create({
      data: {
        userId,
        content: content.trim(),
        tags: parsedTags,
        linkedSkillId: linkedSkillId || null,
        date: parsedDate,
      },
    });

    await awardXP(userId, JOURNAL_XP, `journal:${entry.id}`);
    res.status(201).json({ ...entry, xpAwarded: JOURNAL_XP });
  } catch (err) {
    console.error(err);
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
    await revokeXP(userId, JOURNAL_XP);
    res.json({ message: 'Journal entry deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
