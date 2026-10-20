import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

vi.mock('../lib/prisma', () => ({
  default: {
    user: { upsert: vi.fn() },
  },
}));

import prisma from '../lib/prisma';
import { ensureUser } from './ensureUser';

const upsert = prisma.user.upsert as unknown as ReturnType<typeof vi.fn>;

function mockRes() {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

// Unique IDs per test so the module-level cache doesn't leak between cases.
let n = 0;
function mockReq() {
  n += 1;
  return { user: { id: `user-${n}`, email: `u${n}@example.com` } } as unknown as Request;
}

describe('ensureUser', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls next() for an activated user', async () => {
    upsert.mockResolvedValue({ activated: true });
    const next = vi.fn() as NextFunction;
    const res = mockRes();
    await ensureUser(mockReq(), res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects an unactivated user with 403 INVITE_REQUIRED', async () => {
    upsert.mockResolvedValue({ activated: false });
    const next = vi.fn() as NextFunction;
    const res = mockRes();
    await ensureUser(mockReq(), res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Alpha invite code required', code: 'INVITE_REQUIRED' });
  });

  it('creates new users unactivated and does not cache them', async () => {
    upsert.mockResolvedValue({ activated: false });
    const req = mockReq();
    await ensureUser(req, mockRes(), vi.fn());
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: { id: req.user!.id, email: req.user!.email, activated: false },
    }));

    // Not cached: a later request hits the DB again and passes once activated.
    upsert.mockResolvedValue({ activated: true });
    const next = vi.fn() as NextFunction;
    await ensureUser(req, mockRes(), next);
    expect(upsert).toHaveBeenCalledTimes(2);
    expect(next).toHaveBeenCalled();
  });

  it('returns 409 (not 500) when the email belongs to another account', async () => {
    upsert.mockRejectedValue(Object.assign(new Error('unique'), { code: 'P2002', meta: { target: ['email'] } }));
    const next = vi.fn() as NextFunction;
    const res = mockRes();
    await ensureUser(mockReq(), res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'EMAIL_CONFLICT' }));
  });

  it('still returns 500 for other unique violations', async () => {
    upsert.mockRejectedValue(Object.assign(new Error('unique'), { code: 'P2002', meta: { target: ['id'] } }));
    const res = mockRes();
    await ensureUser(mockReq(), res, vi.fn() as NextFunction);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
