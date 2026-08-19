import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index';

vi.mock('../lib/prisma', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn().mockResolvedValue({}),
    },
    dailyActivity: {
      findMany: vi.fn().mockResolvedValue([]),
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

describe('GET /api/gamification/status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.dailyActivity.findMany as any).mockResolvedValue([]);
  });

  it('returns level 0 and progress for a user with 0 XP', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ totalXP: 0, hunterName: null, email: 'test@example.com' });

    const res = await request(app).get('/api/gamification/status');

    expect(res.status).toBe(200);
    expect(res.body.level).toBe(0);
    expect(res.body.totalXP).toBe(0);
    expect(res.body.progress).toEqual({ current: 0, required: 100, percentage: 0 });
    expect(res.body.streak).toBe(0);
  });

  it('returns level 2 for a user with 350 XP', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ totalXP: 350, hunterName: null, email: 'test@example.com' });

    const res = await request(app).get('/api/gamification/status');

    expect(res.status).toBe(200);
    expect(res.body.level).toBe(2);
    expect(res.body.totalXP).toBe(350);
    expect(res.body.progress.current).toBe(50);
    expect(res.body.progress.required).toBe(300);
  });

  it('returns 404 when user not found', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);

    const res = await request(app).get('/api/gamification/status');

    expect(res.status).toBe(404);
  });

  it('falls back to the email local part when hunterName is unset', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ totalXP: 0, hunterName: null, email: 'vitor.pietrobom@example.com' });

    const res = await request(app).get('/api/gamification/status');

    expect(res.body.hunterName).toBe('vitor.pietrobom');
  });

  it('uses hunterName when set', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ totalXP: 0, hunterName: 'Shadow Monarch', email: 'test@example.com' });

    const res = await request(app).get('/api/gamification/status');

    expect(res.body.hunterName).toBe('Shadow Monarch');
  });

  it('includes practiceReminderDays in the status payload', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ totalXP: 0, hunterName: null, email: 'test@example.com', practiceReminderDays: 21 });

    const res = await request(app).get('/api/gamification/status');

    expect(res.body.practiceReminderDays).toBe(21);
  });

  it('derives the streak from recent daily-activity rows', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ totalXP: 100, hunterName: null, email: 'test@example.com' });
    const today = new Date().toISOString().slice(0, 10);
    (prisma.dailyActivity.findMany as any).mockResolvedValue([{ date: today }]);

    const res = await request(app).get('/api/gamification/status');

    expect(res.body.streak).toBe(1);
  });
});

describe('PUT /api/gamification/profile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets a custom hunter name', async () => {
    (prisma.user.update as any).mockResolvedValue({ hunterName: 'Shadow Monarch', email: 'test@example.com' });

    const res = await request(app).put('/api/gamification/profile').send({ hunterName: 'Shadow Monarch' });

    expect(res.status).toBe(200);
    expect(res.body.hunterName).toBe('Shadow Monarch');
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: { hunterName: 'Shadow Monarch' } }));
  });

  it('clears back to the email fallback on an empty string', async () => {
    (prisma.user.update as any).mockResolvedValue({ hunterName: null, email: 'test@example.com' });

    const res = await request(app).put('/api/gamification/profile').send({ hunterName: '' });

    expect(res.status).toBe(200);
    expect(res.body.hunterName).toBe('test');
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: { hunterName: null } }));
  });

  it('rejects a non-string hunterName', async () => {
    const res = await request(app).put('/api/gamification/profile').send({ hunterName: 42 });

    expect(res.status).toBe(400);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('truncates an absurdly long name', async () => {
    (prisma.user.update as any).mockResolvedValue({ hunterName: 'a'.repeat(40), email: 'test@example.com' });

    await request(app).put('/api/gamification/profile').send({ hunterName: 'a'.repeat(200) });

    expect((prisma.user.update as any).mock.calls[0][0].data.hunterName).toHaveLength(40);
  });

  it('sets practiceReminderDays without touching hunterName', async () => {
    (prisma.user.update as any).mockResolvedValue({ hunterName: null, email: 'test@example.com', practiceReminderDays: 7 });

    const res = await request(app).put('/api/gamification/profile').send({ practiceReminderDays: 7 });

    expect(res.status).toBe(200);
    expect(res.body.practiceReminderDays).toBe(7);
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: { practiceReminderDays: 7 } }));
  });

  it('rejects an out-of-range practiceReminderDays', async () => {
    const res = await request(app).put('/api/gamification/profile').send({ practiceReminderDays: 0 });

    expect(res.status).toBe(400);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
