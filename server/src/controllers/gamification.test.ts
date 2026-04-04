import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index';

// Mock prisma
vi.mock('../lib/prisma', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock auth middleware to inject a test user
vi.mock('../middleware/auth', async () => {
  const actual = await vi.importActual('../middleware/auth');
  return {
    ...actual,
    authMiddleware: (req: any, _res: any, next: any) => {
      req.user = { id: 'test-user-id', email: 'test@example.com' };
      next();
    },
  };
});

import prisma from '../lib/prisma';

describe('GET /api/gamification/status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns level 0 and progress for a user with 0 XP', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ totalXP: 0 });

    const res = await request(app).get('/api/gamification/status');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      level: 0,
      totalXP: 0,
      progress: { current: 0, required: 100, percentage: 0 },
    });
  });

  it('returns level 2 for a user with 350 XP', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ totalXP: 350 });

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
});
