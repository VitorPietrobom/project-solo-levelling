import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export async function listDocuments(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { search } = req.query;

    const where: any = { userId };

    if (search && typeof search === 'string' && search.trim() !== '') {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
      ];
    }

    const documents = await prisma.document.findMany({
      where,
      select: {
        id: true,
        userId: true,
        title: true,
        category: true,
        format: true,
        filePath: true,
        uploadedAt: true,
      },
      orderBy: { uploadedAt: 'desc' as const },
    });

    res.json(documents);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createDocument(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { title, category, format, content, fileName } = req.body;

    if (!title || typeof title !== 'string' || title.trim() === '') {
      res.status(400).json({ error: 'Title is required' });
      return;
    }

    if (!category || typeof category !== 'string' || category.trim() === '') {
      res.status(400).json({ error: 'Category is required' });
      return;
    }

    if (format !== 'pdf' && format !== 'markdown') {
      res.status(400).json({ error: 'Unsupported file format. Please upload PDF or Markdown files.' });
      return;
    }

    const document = await prisma.document.create({
      data: {
        userId,
        title: title.trim(),
        category: category.trim(),
        format,
        filePath: fileName || '',
        content: content || null,
      },
    });

    res.status(201).json(document);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getDocument(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const documentId = req.params.id as string;

    const document = await prisma.document.findFirst({
      where: { id: documentId, userId },
    });

    if (!document) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    res.json(document);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function listCategories(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;

    const results = await prisma.document.findMany({
      where: { userId },
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' as const },
    });

    const categories = results.map((r) => r.category);
    res.json(categories);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteDocument(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const documentId = req.params.id as string;

    const document = await prisma.document.findFirst({
      where: { id: documentId, userId },
    });

    if (!document) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    await prisma.document.delete({ where: { id: documentId } });

    res.json({ message: 'Document deleted' });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}
