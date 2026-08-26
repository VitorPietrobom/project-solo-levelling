import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index';

vi.mock('../lib/prisma', () => ({
  default: {
    feedback: {
      create: vi.fn(),
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

describe('POST /api/feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('stores feedback with the current page', async () => {
    const created = { id: 'f1', userId: 'test-user-id', message: 'Great app!', page: '/diet' };
    (prisma.feedback.create as any).mockResolvedValue(created);

    const res = await request(app).post('/api/feedback').send({ message: 'Great app!', page: '/diet' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(created);
    expect(prisma.feedback.create).toHaveBeenCalledWith({
      data: { userId: 'test-user-id', message: 'Great app!', page: '/diet' },
    });
  });

  it('stores feedback with a null page when omitted', async () => {
    (prisma.feedback.create as any).mockResolvedValue({});
    await request(app).post('/api/feedback').send({ message: 'Hi' });

    expect(prisma.feedback.create).toHaveBeenCalledWith({
      data: { userId: 'test-user-id', message: 'Hi', page: null },
    });
  });

  it('returns 400 for an empty message', async () => {
    const res = await request(app).post('/api/feedback').send({ message: '   ' });
    expect(res.status).toBe(400);
    expect(prisma.feedback.create).not.toHaveBeenCalled();
  });

  it('returns 400 for an overly long message', async () => {
    const res = await request(app).post('/api/feedback').send({ message: 'x'.repeat(4001) });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Message is too long');
  });
});
