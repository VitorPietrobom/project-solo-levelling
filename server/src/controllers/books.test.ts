import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index';

vi.mock('../lib/prisma', () => ({
  default: {
    book: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    skill: {
      update: vi.fn(),
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

describe('Book endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/books', () => {
    it('returns all books for the user', async () => {
      const books = [
        { id: 'b1', userId: 'test-user-id', title: 'Clean Code', author: 'Robert Martin', status: 'reading', totalPages: 400, currentPage: 100 },
      ];
      (prisma.book.findMany as any).mockResolvedValue(books);

      const res = await request(app).get('/api/books');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe('Clean Code');
    });

    it('filters by status', async () => {
      (prisma.book.findMany as any).mockResolvedValue([]);

      const res = await request(app).get('/api/books?status=reading');
      expect(res.status).toBe(200);
      expect(prisma.book.findMany).toHaveBeenCalledWith({
        where: { userId: 'test-user-id', status: 'reading' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('POST /api/books', () => {
    it('creates a book with defaults', async () => {
      const created = {
        id: 'b1', userId: 'test-user-id', title: 'Clean Code', author: 'Robert Martin',
        status: 'want_to_read', totalPages: 400, currentPage: 0, notes: null,
        linkedSkillId: null, startedAt: null, finishedAt: null,
      };
      (prisma.book.create as any).mockResolvedValue(created);

      const res = await request(app).post('/api/books').send({
        title: 'Clean Code', author: 'Robert Martin', totalPages: 400,
      });
      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Clean Code');
      expect(res.body.status).toBe('want_to_read');
    });

    it('returns 400 when title is missing', async () => {
      const res = await request(app).post('/api/books').send({ author: 'Author', totalPages: 100 });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Title is required');
    });

    it('returns 400 when author is missing', async () => {
      const res = await request(app).post('/api/books').send({ title: 'Book', totalPages: 100 });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Author is required');
    });

    it('returns 400 when totalPages is not a positive integer', async () => {
      const res = await request(app).post('/api/books').send({ title: 'Book', author: 'Author', totalPages: 0 });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Total pages must be a positive integer');
    });

    it('creates a book with linkedSkillId', async () => {
      const created = {
        id: 'b1', userId: 'test-user-id', title: 'Book', author: 'Author',
        status: 'want_to_read', totalPages: 200, currentPage: 0, notes: null,
        linkedSkillId: 'skill-1', startedAt: null, finishedAt: null,
      };
      (prisma.book.create as any).mockResolvedValue(created);

      const res = await request(app).post('/api/books').send({
        title: 'Book', author: 'Author', totalPages: 200, linkedSkillId: 'skill-1',
      });
      expect(res.status).toBe(201);
      expect(res.body.linkedSkillId).toBe('skill-1');
    });
  });

  describe('PATCH /api/books/:id', () => {
    it('returns 404 when book not found', async () => {
      (prisma.book.findFirst as any).mockResolvedValue(null);
      const res = await request(app).patch('/api/books/bad-id').send({ status: 'reading' });
      expect(res.status).toBe(404);
    });

    it('updates status to reading and sets startedAt', async () => {
      const existing = {
        id: 'b1', userId: 'test-user-id', title: 'Book', author: 'Author',
        status: 'want_to_read', totalPages: 300, currentPage: 0,
        startedAt: null, finishedAt: null, linkedSkillId: null,
      };
      (prisma.book.findFirst as any).mockResolvedValue(existing);
      (prisma.book.update as any).mockResolvedValue({ ...existing, status: 'reading', startedAt: new Date() });

      const res = await request(app).patch('/api/books/b1').send({ status: 'reading' });
      expect(res.status).toBe(200);
      expect(prisma.book.update).toHaveBeenCalledWith({
        where: { id: 'b1' },
        data: expect.objectContaining({ status: 'reading', startedAt: expect.any(Date) }),
      });
    });

    it('updates status to finished, sets finishedAt and currentPage=totalPages', async () => {
      const existing = {
        id: 'b1', userId: 'test-user-id', title: 'Book', author: 'Author',
        status: 'reading', totalPages: 300, currentPage: 150,
        startedAt: new Date(), finishedAt: null, linkedSkillId: null,
      };
      (prisma.book.findFirst as any).mockResolvedValue(existing);
      (prisma.book.update as any).mockResolvedValue({ ...existing, status: 'finished', currentPage: 300, finishedAt: new Date() });

      const res = await request(app).patch('/api/books/b1').send({ status: 'finished' });
      expect(res.status).toBe(200);
      expect(prisma.book.update).toHaveBeenCalledWith({
        where: { id: 'b1' },
        data: expect.objectContaining({ status: 'finished', finishedAt: expect.any(Date), currentPage: 300 }),
      });
    });

    it('awards XP to linked skill when finishing', async () => {
      const existing = {
        id: 'b1', userId: 'test-user-id', title: 'Book', author: 'Author',
        status: 'reading', totalPages: 250, currentPage: 200,
        startedAt: new Date(), finishedAt: null, linkedSkillId: 'skill-1',
      };
      (prisma.book.findFirst as any).mockResolvedValue(existing);
      (prisma.book.update as any).mockResolvedValue({ ...existing, status: 'finished', currentPage: 250, finishedAt: new Date() });
      (prisma.skill.update as any).mockResolvedValue({});

      const res = await request(app).patch('/api/books/b1').send({ status: 'finished' });
      expect(res.status).toBe(200);
      expect(prisma.skill.update).toHaveBeenCalledWith({
        where: { id: 'skill-1' },
        data: { totalXP: { increment: 250 } },
      });
    });

    it('does not award XP when no linked skill', async () => {
      const existing = {
        id: 'b1', userId: 'test-user-id', title: 'Book', author: 'Author',
        status: 'reading', totalPages: 200, currentPage: 100,
        startedAt: new Date(), finishedAt: null, linkedSkillId: null,
      };
      (prisma.book.findFirst as any).mockResolvedValue(existing);
      (prisma.book.update as any).mockResolvedValue({ ...existing, status: 'finished', currentPage: 200, finishedAt: new Date() });

      await request(app).patch('/api/books/b1').send({ status: 'finished' });
      expect(prisma.skill.update).not.toHaveBeenCalled();
    });

    it('updates currentPage', async () => {
      const existing = {
        id: 'b1', userId: 'test-user-id', title: 'Book', author: 'Author',
        status: 'reading', totalPages: 300, currentPage: 50,
        startedAt: new Date(), finishedAt: null, linkedSkillId: null,
      };
      (prisma.book.findFirst as any).mockResolvedValue(existing);
      (prisma.book.update as any).mockResolvedValue({ ...existing, currentPage: 150 });

      const res = await request(app).patch('/api/books/b1').send({ currentPage: 150 });
      expect(res.status).toBe(200);
    });
  });

  describe('DELETE /api/books/:id', () => {
    it('deletes a book', async () => {
      (prisma.book.findFirst as any).mockResolvedValue({ id: 'b1', userId: 'test-user-id' });
      (prisma.book.delete as any).mockResolvedValue({});

      const res = await request(app).delete('/api/books/b1');
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Book deleted');
    });

    it('returns 404 when book not found', async () => {
      (prisma.book.findFirst as any).mockResolvedValue(null);
      const res = await request(app).delete('/api/books/bad-id');
      expect(res.status).toBe(404);
    });
  });
});
