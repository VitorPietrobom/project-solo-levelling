import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index';

vi.mock('../lib/prisma', () => ({
  default: {
    user: {
      upsert: vi.fn(),
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

describe('Invite endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.ALPHA_INVITE_CODES;
  });

  describe('GET /api/invite/status', () => {
    it('reports activated: false for a brand new user', async () => {
      (prisma.user.upsert as any).mockResolvedValue({ id: 'test-user-id', activated: false });

      const res = await request(app).get('/api/invite/status');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ activated: false });
      expect(prisma.user.upsert).toHaveBeenCalledWith({
        where: { id: 'test-user-id' },
        update: {},
        create: { id: 'test-user-id', email: 'test@example.com', activated: false },
      });
    });

    it('reports activated: true for an already-activated user', async () => {
      (prisma.user.upsert as any).mockResolvedValue({ id: 'test-user-id', activated: true });

      const res = await request(app).get('/api/invite/status');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ activated: true });
    });
  });

  describe('POST /api/invite/redeem', () => {
    it('returns 503 when no invite codes are configured', async () => {
      const res = await request(app).post('/api/invite/redeem').send({ code: 'anything' });
      expect(res.status).toBe(503);
    });

    it('returns 400 for a missing code', async () => {
      process.env.ALPHA_INVITE_CODES = 'arise-alpha';
      const res = await request(app).post('/api/invite/redeem').send({});
      expect(res.status).toBe(400);
      expect(prisma.user.upsert).not.toHaveBeenCalled();
    });

    it('returns 400 for an invalid code', async () => {
      process.env.ALPHA_INVITE_CODES = 'arise-alpha,friend2';
      const res = await request(app).post('/api/invite/redeem').send({ code: 'wrong' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid invite code');
    });

    it('activates the user on a valid code, case-insensitively', async () => {
      process.env.ALPHA_INVITE_CODES = 'Arise-Alpha, friend2';
      (prisma.user.upsert as any).mockResolvedValue({ id: 'test-user-id', activated: true });

      const res = await request(app).post('/api/invite/redeem').send({ code: 'ARISE-ALPHA' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ activated: true });
      expect(prisma.user.upsert).toHaveBeenCalledWith({
        where: { id: 'test-user-id' },
        update: { activated: true },
        create: { id: 'test-user-id', email: 'test@example.com', activated: true },
      });
    });
  });
});
