import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export async function listLessons(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { search, tag } = req.query;

    const where: any = { userId };

    if (search && typeof search === 'string') {
      where.OR = [
        { content: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } },
      ];
    }

    if (tag && typeof tag === 'string') {
      where.tags = { has: tag };
    }

    const lessons = await prisma.lessonLearned.findMany({
      where,
      orderBy: { date: 'desc' as const },
    });

    res.json(lessons);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createLesson(req: Request, res: Response): Promise<void> {
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

    const lesson = await prisma.lessonLearned.create({
      data: {
        userId,
        content: content.trim(),
        tags: parsedTags,
        linkedSkillId: linkedSkillId || null,
        date: new Date(date),
      },
    });

    res.status(201).json(lesson);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteLesson(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const lessonId = req.params.id as string;

    const lesson = await prisma.lessonLearned.findFirst({ where: { id: lessonId, userId } });
    if (!lesson) {
      res.status(404).json({ error: 'Lesson not found' });
      return;
    }

    await prisma.lessonLearned.delete({ where: { id: lessonId } });
    res.json({ message: 'Lesson deleted' });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}
