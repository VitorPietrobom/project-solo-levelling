import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { awardXP } from '../services/xp';
import { syncBookNodes, removeBookNode } from '../services/bookNodes';

export const BOOK_FINISH_XP = 80;

// Look up a cover image from the Open Library API (free, no key). Best-effort:
// returns null on any failure so book creation never blocks on it.
async function fetchCover(title: string, author: string): Promise<string | null> {
  try {
    const q = new URLSearchParams({ title, author, limit: '1', fields: 'cover_i,isbn' });
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    const r = await fetch(`https://openlibrary.org/search.json?${q}`, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!r.ok) return null;
    const data = await r.json() as { docs?: { cover_i?: number; isbn?: string[] }[] };
    const doc = data.docs?.[0];
    if (!doc) return null;
    if (doc.cover_i) return `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`;
    if (doc.isbn?.[0]) return `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-M.jpg`;
    return null;
  } catch {
    return null;
  }
}

export async function listBooks(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { status } = req.query;

    const where: any = { userId };
    if (status && typeof status === 'string') {
      where.status = status;
    }

    const books = await prisma.book.findMany({
      where,
      orderBy: { createdAt: 'desc' as const },
    });

    res.json(books);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createBook(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { title, author, totalPages, status, linkedSkillId } = req.body;

    if (!title || typeof title !== 'string' || title.trim() === '') {
      res.status(400).json({ error: 'Title is required' });
      return;
    }
    if (!author || typeof author !== 'string' || author.trim() === '') {
      res.status(400).json({ error: 'Author is required' });
      return;
    }
    if (typeof totalPages !== 'number' || !Number.isInteger(totalPages) || totalPages <= 0) {
      res.status(400).json({ error: 'Total pages must be a positive integer' });
      return;
    }

    const validStatuses = ['want_to_read', 'reading', 'finished'];
    const bookStatus = status && validStatuses.includes(status) ? status : 'want_to_read';

    const coverUrl = await fetchCover(title.trim(), author.trim());

    const book = await prisma.book.create({
      data: {
        userId,
        title: title.trim(),
        author: author.trim(),
        totalPages,
        status: bookStatus,
        coverUrl,
        linkedSkillId: linkedSkillId || null,
        startedAt: bookStatus === 'reading' ? new Date() : null,
      },
    });

    // Mirror the book into the knowledge graph as a source node.
    try { await syncBookNodes(userId); } catch (e) { console.error('book node sync failed', e); }

    res.status(201).json(book);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateBook(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const bookId = req.params.id as string;

    const existing = await prisma.book.findFirst({ where: { id: bookId, userId } });
    if (!existing) {
      res.status(404).json({ error: 'Book not found' });
      return;
    }

    const data: any = {};
    const { status, currentPage, notes, rating } = req.body;

    if (notes !== undefined) {
      data.notes = notes;
    }

    if (rating !== undefined) {
      if (rating === null) {
        data.rating = null;
      } else if (typeof rating === 'number' && rating >= 1 && rating <= 5) {
        data.rating = Math.round(rating);
      } else {
        res.status(400).json({ error: 'Rating must be 1–5' });
        return;
      }
    }

    if (currentPage !== undefined) {
      if (typeof currentPage !== 'number' || !Number.isInteger(currentPage) || currentPage < 0) {
        res.status(400).json({ error: 'Current page must be a non-negative integer' });
        return;
      }
      data.currentPage = currentPage;
    }

    if (status !== undefined) {
      const validStatuses = ['want_to_read', 'reading', 'finished'];
      if (!validStatuses.includes(status)) {
        res.status(400).json({ error: 'Invalid status' });
        return;
      }
      data.status = status;

      if (status === 'reading' && !existing.startedAt) {
        data.startedAt = new Date();
      }

      if (status === 'finished') {
        data.finishedAt = new Date();
        data.currentPage = existing.totalPages;
      }
    }

    const updated = await prisma.book.update({
      where: { id: bookId },
      data,
    });

    // Reward finishing a book — but only on the transition into "finished".
    const justFinished = status === 'finished' && existing.status !== 'finished';
    if (justFinished) {
      await awardXP(userId, BOOK_FINISH_XP, `book:${bookId}`);
      if (existing.linkedSkillId) {
        await prisma.skill.update({
          where: { id: existing.linkedSkillId },
          data: { totalXP: { increment: existing.totalPages } },
        });
      }
    }

    res.json({ ...updated, xpAwarded: justFinished ? BOOK_FINISH_XP : 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// POST /api/books/:id/cover — (re)fetch the cover from Open Library.
export async function refreshCover(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const bookId = req.params.id as string;
    const book = await prisma.book.findFirst({ where: { id: bookId, userId } });
    if (!book) { res.status(404).json({ error: 'Book not found' }); return; }

    const coverUrl = await fetchCover(book.title, book.author);
    const updated = await prisma.book.update({ where: { id: bookId }, data: { coverUrl } });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteBook(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const bookId = req.params.id as string;

    const book = await prisma.book.findFirst({ where: { id: bookId, userId } });
    if (!book) {
      res.status(404).json({ error: 'Book not found' });
      return;
    }

    await prisma.book.delete({ where: { id: bookId } });
    await removeBookNode(userId, bookId);
    res.json({ message: 'Book deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
