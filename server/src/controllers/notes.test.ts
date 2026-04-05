import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index';

vi.mock('../lib/prisma', () => ({
  default: {
    note: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
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

describe('Note endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/notes', () => {
    it('returns notes without content', async () => {
      const notes = [
        { id: 'n1', title: 'My Note', tags: ['react'], createdAt: new Date(), updatedAt: new Date() },
      ];
      (prisma.note.findMany as any).mockResolvedValue(notes);

      const res = await request(app).get('/api/notes');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe('My Note');
    });

    it('searches by title or content', async () => {
      (prisma.note.findMany as any).mockResolvedValue([]);

      await request(app).get('/api/notes?search=react');
      expect(prisma.note.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'test-user-id',
          OR: [
            { title: { contains: 'react', mode: 'insensitive' } },
            { content: { contains: 'react', mode: 'insensitive' } },
          ],
        },
        select: { id: true, title: true, tags: true, createdAt: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
      });
    });
  });

  describe('GET /api/notes/:id', () => {
    it('returns full note with content', async () => {
      const note = { id: 'n1', userId: 'test-user-id', title: 'Note', content: 'Body text', tags: [] };
      (prisma.note.findFirst as any).mockResolvedValue(note);

      const res = await request(app).get('/api/notes/n1');
      expect(res.status).toBe(200);
      expect(res.body.content).toBe('Body text');
    });

    it('returns 404 when not found', async () => {
      (prisma.note.findFirst as any).mockResolvedValue(null);
      const res = await request(app).get('/api/notes/bad-id');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/notes', () => {
    it('creates a note', async () => {
      const created = { id: 'n1', userId: 'test-user-id', title: 'New Note', content: 'Content', tags: ['tag1'] };
      (prisma.note.create as any).mockResolvedValue(created);

      const res = await request(app).post('/api/notes').send({
        title: 'New Note', content: 'Content', tags: ['tag1'],
      });
      expect(res.status).toBe(201);
      expect(res.body.title).toBe('New Note');
    });

    it('returns 400 when title is missing', async () => {
      const res = await request(app).post('/api/notes').send({ content: 'Body' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Title is required');
    });

    it('creates note with empty content when not provided', async () => {
      const created = { id: 'n1', userId: 'test-user-id', title: 'Title Only', content: '', tags: [] };
      (prisma.note.create as any).mockResolvedValue(created);

      const res = await request(app).post('/api/notes').send({ title: 'Title Only' });
      expect(res.status).toBe(201);
    });
  });

  describe('PATCH /api/notes/:id', () => {
    it('updates a note', async () => {
      const existing = { id: 'n1', userId: 'test-user-id', title: 'Old', content: 'Old body', tags: [] };
      (prisma.note.findFirst as any).mockResolvedValue(existing);
      (prisma.note.update as any).mockResolvedValue({ ...existing, title: 'Updated', content: 'New body' });

      const res = await request(app).patch('/api/notes/n1').send({ title: 'Updated', content: 'New body' });
      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated');
    });

    it('returns 404 when not found', async () => {
      (prisma.note.findFirst as any).mockResolvedValue(null);
      const res = await request(app).patch('/api/notes/bad-id').send({ title: 'X' });
      expect(res.status).toBe(404);
    });

    it('returns 400 when title is empty string', async () => {
      const existing = { id: 'n1', userId: 'test-user-id', title: 'Old', content: '', tags: [] };
      (prisma.note.findFirst as any).mockResolvedValue(existing);

      const res = await request(app).patch('/api/notes/n1').send({ title: '  ' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Title cannot be empty');
    });
  });

  describe('DELETE /api/notes/:id', () => {
    it('deletes a note', async () => {
      (prisma.note.findFirst as any).mockResolvedValue({ id: 'n1', userId: 'test-user-id' });
      (prisma.note.delete as any).mockResolvedValue({});

      const res = await request(app).delete('/api/notes/n1');
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Note deleted');
    });

    it('returns 404 when not found', async () => {
      (prisma.note.findFirst as any).mockResolvedValue(null);
      const res = await request(app).delete('/api/notes/bad-id');
      expect(res.status).toBe(404);
    });
  });
});
