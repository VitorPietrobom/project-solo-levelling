import { Request, Response } from 'express';
import prisma from '../lib/prisma';

// GET /api/learning/stats — knowledge overview for the Learning header.
export async function getLearningStats(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const now = new Date();
  const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));

  const [user, booksFinishedTotal, booksFinishedThisYear, booksReading, kindCounts, pagesAgg] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.book.count({ where: { userId, status: 'finished' } }),
    prisma.book.count({ where: { userId, status: 'finished', finishedAt: { gte: yearStart } } }),
    prisma.book.count({ where: { userId, status: 'reading' } }),
    // The UI only creates knowledge nodes now; count those by kind. Book
    // projections (legacyId `book:*`) mirror the bookshelf and aren't user notes.
    prisma.knowledgeNode.groupBy({
      by: ['kind'],
      where: { userId, OR: [{ legacyId: null }, { NOT: { legacyId: { startsWith: 'book:' } } }] },
      _count: { _all: true },
    }),
    prisma.book.aggregate({ where: { userId, status: 'finished' }, _sum: { totalPages: true } }),
  ]);

  const countOf = (kind: string) => kindCounts.find((k) => k.kind === kind)?._count._all ?? 0;

  res.json({
    readingGoal: user?.readingGoal ?? 12,
    booksFinishedThisYear,
    booksFinishedTotal,
    booksReading,
    pagesRead: pagesAgg._sum.totalPages ?? 0,
    notesCount: countOf('note'),
    lessonsCount: countOf('lesson'),
    journalCount: countOf('journal'),
  });
}

// PUT /api/learning/goal — { readingGoal }
export async function updateReadingGoal(req: Request, res: Response): Promise<void> {
  const raw = req.body?.readingGoal;
  const goal = typeof raw === 'number' && Number.isFinite(raw) ? Math.max(1, Math.min(500, Math.round(raw))) : null;
  if (goal === null) { res.status(400).json({ error: 'readingGoal must be a positive number' }); return; }
  const user = await prisma.user.update({ where: { id: req.user!.id }, data: { readingGoal: goal } });
  res.json({ readingGoal: user.readingGoal });
}
