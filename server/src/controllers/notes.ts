import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export async function listNotes(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { search } = req.query;

    const where: any = { userId };

    if (search && typeof search === 'string') {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    const notes = await prisma.note.findMany({
      where,
      select: {
        id: true,
        title: true,
        tags: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' as const },
    });

    res.json(notes);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getNote(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const noteId = req.params.id as string;

    const note = await prisma.note.findFirst({ where: { id: noteId, userId } });
    if (!note) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }

    res.json(note);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createNote(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { title, content, tags } = req.body;

    if (!title || typeof title !== 'string' || title.trim() === '') {
      res.status(400).json({ error: 'Title is required' });
      return;
    }

    const parsedTags = Array.isArray(tags) ? tags.filter((t: any) => typeof t === 'string') : [];

    const note = await prisma.note.create({
      data: {
        userId,
        title: title.trim(),
        content: typeof content === 'string' ? content : '',
        tags: parsedTags,
      },
    });

    res.status(201).json(note);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateNote(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const noteId = req.params.id as string;

    const existing = await prisma.note.findFirst({ where: { id: noteId, userId } });
    if (!existing) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }

    const data: any = {};
    const { title, content, tags } = req.body;

    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim() === '') {
        res.status(400).json({ error: 'Title cannot be empty' });
        return;
      }
      data.title = title.trim();
    }

    if (content !== undefined) {
      data.content = typeof content === 'string' ? content : '';
    }

    if (tags !== undefined) {
      data.tags = Array.isArray(tags) ? tags.filter((t: any) => typeof t === 'string') : [];
    }

    const updated = await prisma.note.update({
      where: { id: noteId },
      data,
    });

    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteNote(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const noteId = req.params.id as string;

    const note = await prisma.note.findFirst({ where: { id: noteId, userId } });
    if (!note) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }

    await prisma.note.delete({ where: { id: noteId } });
    res.json({ message: 'Note deleted' });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}
