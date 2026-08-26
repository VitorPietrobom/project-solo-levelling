import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index';

vi.mock('../lib/prisma', () => ({
  default: {
    user: {
      upsert: vi.fn(),
      update: vi.fn(),
    },
    inviteCode: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn((ops: any[]) => Promise.all(ops)),
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
    delete process.env.ADMIN_EMAIL;
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
    it('returns 400 for a missing code', async () => {
      const res = await request(app).post('/api/invite/redeem').send({});
      expect(res.status).toBe(400);
      expect(prisma.inviteCode.findUnique).not.toHaveBeenCalled();
    });

    it('returns 400 for a code that does not exist', async () => {
      (prisma.inviteCode.findUnique as any).mockResolvedValue(null);
      const res = await request(app).post('/api/invite/redeem').send({ code: 'nope' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid invite code');
    });

    it('returns 400 for an already-redeemed code', async () => {
      (prisma.inviteCode.findUnique as any).mockResolvedValue({ code: 'ABCD1234', redeemedById: 'someone-else' });
      const res = await request(app).post('/api/invite/redeem').send({ code: 'abcd1234' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('This invite code has already been used');
    });

    it('activates the user and burns the code, case-insensitively', async () => {
      (prisma.inviteCode.findUnique as any).mockResolvedValue({ code: 'ABCD1234', redeemedById: null });
      (prisma.user.upsert as any).mockResolvedValue({});

      const res = await request(app).post('/api/invite/redeem').send({ code: 'abcd1234' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ activated: true });
      expect(prisma.inviteCode.findUnique).toHaveBeenCalledWith({ where: { code: 'ABCD1234' } });
      expect(prisma.inviteCode.update).toHaveBeenCalledWith({
        where: { code: 'ABCD1234' },
        data: { redeemedById: 'test-user-id', redeemedAt: expect.any(Date) },
      });
      expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'test-user-id' }, data: { activated: true } });
    });

    it('returns 400 if the transaction races and the code was just claimed', async () => {
      (prisma.inviteCode.findUnique as any).mockResolvedValue({ code: 'ABCD1234', redeemedById: null });
      (prisma.user.upsert as any).mockResolvedValue({});
      (prisma.$transaction as any).mockRejectedValue(new Error('unique constraint'));

      const res = await request(app).post('/api/invite/redeem').send({ code: 'abcd1234' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('This invite code has already been used');
    });
  });

  describe('admin routes', () => {
    it('403s a non-admin trying to generate a code', async () => {
      process.env.ADMIN_EMAIL = 'owner@example.com';
      const res = await request(app).post('/api/invite/codes');
      expect(res.status).toBe(403);
      expect(prisma.inviteCode.create).not.toHaveBeenCalled();
    });

    it('403s a non-admin trying to list codes', async () => {
      process.env.ADMIN_EMAIL = 'owner@example.com';
      const res = await request(app).get('/api/invite/codes');
      expect(res.status).toBe(403);
    });

    it('403s everyone when ADMIN_EMAIL is not configured', async () => {
      const res = await request(app).post('/api/invite/codes');
      expect(res.status).toBe(403);
    });

    it('lets the admin generate a code', async () => {
      process.env.ADMIN_EMAIL = 'test@example.com';
      (prisma.inviteCode.create as any).mockResolvedValue({ id: 'i1', code: 'ABCDEFGH', createdById: 'test-user-id' });

      const res = await request(app).post('/api/invite/codes');

      expect(res.status).toBe(201);
      expect(res.body.code).toBe('ABCDEFGH');
      expect(prisma.inviteCode.create).toHaveBeenCalledWith({ data: { code: expect.any(String), createdById: 'test-user-id' } });
    });

    it('lets the admin list codes', async () => {
      process.env.ADMIN_EMAIL = 'test@example.com';
      (prisma.inviteCode.findMany as any).mockResolvedValue([{ id: 'i1', code: 'ABCDEFGH', redeemedBy: null }]);

      const res = await request(app).get('/api/invite/codes');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });

    it('admin email match is case-insensitive', async () => {
      process.env.ADMIN_EMAIL = 'Test@Example.com';
      (prisma.inviteCode.findMany as any).mockResolvedValue([]);

      const res = await request(app).get('/api/invite/codes');

      expect(res.status).toBe(200);
    });
  });
});
