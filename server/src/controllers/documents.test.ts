import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index';

vi.mock('../lib/prisma', () => ({
  default: {
    document: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      upsert: vi.fn().mockResolvedValue({}),
    },
  },
}));

vi.mock('../middleware/auth', async () => ({
  authMiddleware: (req: any, _res: any, next: any) => {
    req.user = { id: 'test-user-id', email: 'test@example.com' };
    next();
  },
}));

import prisma from '../lib/prisma';

describe('Document endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/documents', () => {
    it('returns all documents for the user without content field', async () => {
      const docs = [
        { id: 'd1', userId: 'test-user-id', title: 'Notes', category: 'Study', format: 'markdown', filePath: 'notes.md', uploadedAt: new Date().toISOString() },
      ];
      (prisma.document.findMany as any).mockResolvedValue(docs);

      const res = await request(app).get('/api/documents');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe('Notes');
      expect(res.body[0]).not.toHaveProperty('content');
      expect(prisma.document.findMany).toHaveBeenCalledWith({
        where: { userId: 'test-user-id' },
        select: {
          id: true,
          userId: true,
          title: true,
          category: true,
          format: true,
          filePath: true,
          uploadedAt: true,
        },
        orderBy: { uploadedAt: 'desc' },
      });
    });

    it('filters documents by search term in title or category (case-insensitive)', async () => {
      (prisma.document.findMany as any).mockResolvedValue([]);

      const res = await request(app).get('/api/documents?search=study');

      expect(res.status).toBe(200);
      expect(prisma.document.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'test-user-id',
          OR: [
            { title: { contains: 'study', mode: 'insensitive' } },
            { category: { contains: 'study', mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          userId: true,
          title: true,
          category: true,
          format: true,
          filePath: true,
          uploadedAt: true,
        },
        orderBy: { uploadedAt: 'desc' },
      });
    });

    it('returns empty array when no documents exist', async () => {
      (prisma.document.findMany as any).mockResolvedValue([]);

      const res = await request(app).get('/api/documents');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(0);
    });
  });

  describe('POST /api/documents', () => {
    it('creates a markdown document', async () => {
      const created = {
        id: 'd1',
        userId: 'test-user-id',
        title: 'My Notes',
        category: 'Study',
        format: 'markdown',
        filePath: 'notes.md',
        content: '# Hello World',
        uploadedAt: new Date().toISOString(),
      };
      (prisma.document.create as any).mockResolvedValue(created);

      const res = await request(app)
        .post('/api/documents')
        .send({
          title: 'My Notes',
          category: 'Study',
          format: 'markdown',
          content: '# Hello World',
          fileName: 'notes.md',
        });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('My Notes');
      expect(res.body.format).toBe('markdown');
    });

    it('creates a pdf document', async () => {
      const created = {
        id: 'd2',
        userId: 'test-user-id',
        title: 'Research Paper',
        category: 'Academic',
        format: 'pdf',
        filePath: 'paper.pdf',
        content: 'base64content',
        uploadedAt: new Date().toISOString(),
      };
      (prisma.document.create as any).mockResolvedValue(created);

      const res = await request(app)
        .post('/api/documents')
        .send({
          title: 'Research Paper',
          category: 'Academic',
          format: 'pdf',
          content: 'base64content',
          fileName: 'paper.pdf',
        });

      expect(res.status).toBe(201);
      expect(res.body.format).toBe('pdf');
    });

    it('returns 400 when title is missing', async () => {
      const res = await request(app)
        .post('/api/documents')
        .send({ category: 'Study', format: 'markdown' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Title is required');
    });

    it('returns 400 when category is missing', async () => {
      const res = await request(app)
        .post('/api/documents')
        .send({ title: 'Notes', format: 'markdown' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Category is required');
    });

    it('returns 400 for unsupported format', async () => {
      const res = await request(app)
        .post('/api/documents')
        .send({ title: 'Notes', category: 'Study', format: 'docx' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Unsupported file format. Please upload PDF or Markdown files.');
    });

    it('returns 400 when format is missing', async () => {
      const res = await request(app)
        .post('/api/documents')
        .send({ title: 'Notes', category: 'Study' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Unsupported file format. Please upload PDF or Markdown files.');
    });
  });

  describe('GET /api/documents/:id', () => {
    it('returns a document with content', async () => {
      const doc = {
        id: 'd1',
        userId: 'test-user-id',
        title: 'Notes',
        category: 'Study',
        format: 'markdown',
        filePath: 'notes.md',
        content: '# Hello',
        uploadedAt: new Date().toISOString(),
      };
      (prisma.document.findFirst as any).mockResolvedValue(doc);

      const res = await request(app).get('/api/documents/d1');

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Notes');
      expect(res.body.content).toBe('# Hello');
      expect(prisma.document.findFirst).toHaveBeenCalledWith({
        where: { id: 'd1', userId: 'test-user-id' },
      });
    });

    it('returns 404 when document not found', async () => {
      (prisma.document.findFirst as any).mockResolvedValue(null);

      const res = await request(app).get('/api/documents/bad-id');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Document not found');
    });
  });

  describe('GET /api/documents/categories', () => {
    it('returns distinct categories for the user', async () => {
      (prisma.document.findMany as any).mockResolvedValue([
        { category: 'Academic' },
        { category: 'Study' },
      ]);

      const res = await request(app).get('/api/documents/categories');

      expect(res.status).toBe(200);
      expect(res.body).toEqual(['Academic', 'Study']);
      expect(prisma.document.findMany).toHaveBeenCalledWith({
        where: { userId: 'test-user-id' },
        select: { category: true },
        distinct: ['category'],
        orderBy: { category: 'asc' },
      });
    });

    it('returns empty array when no documents exist', async () => {
      (prisma.document.findMany as any).mockResolvedValue([]);

      const res = await request(app).get('/api/documents/categories');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('DELETE /api/documents/:id', () => {
    it('deletes a document', async () => {
      const doc = { id: 'd1', userId: 'test-user-id', title: 'Notes' };
      (prisma.document.findFirst as any).mockResolvedValue(doc);
      (prisma.document.delete as any).mockResolvedValue(doc);

      const res = await request(app).delete('/api/documents/d1');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Document deleted');
      expect(prisma.document.delete).toHaveBeenCalledWith({ where: { id: 'd1' } });
    });

    it('returns 404 when document not found', async () => {
      (prisma.document.findFirst as any).mockResolvedValue(null);

      const res = await request(app).delete('/api/documents/bad-id');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Document not found');
    });
  });
});
