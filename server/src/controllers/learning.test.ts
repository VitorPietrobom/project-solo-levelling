import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index';

vi.mock('../lib/prisma', () => ({
  default: {
    user: { upsert: vi.fn().mockResolvedValue({}), findUnique: vi.fn() },
    book: { count: vi.fn(), aggregate: vi.fn() },
    knowledgeNode: { groupBy: vi.fn() },
  },
}));

vi.mock('../middleware/auth', async () => ({
  authMiddleware: (req: any, _res: any, next: any) => {
    req.user = { id: 'test-user-id', email: 'test@example.com' };
    next();
  },
}));

import prisma from '../lib/prisma';

describe('GET /api/learning/stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.user.findUnique as any).mockResolvedValue({ readingGoal: 10 });
    (prisma.book.count as any).mockResolvedValue(0);
    (prisma.book.aggregate as any).mockResolvedValue({ _sum: { totalPages: null } });
  });

  it('counts knowledge nodes by kind, excluding book projections', async () => {
    (prisma.knowledgeNode.groupBy as any).mockResolvedValue([
      { kind: 'note', _count: { _all: 4 } },
      { kind: 'lesson', _count: { _all: 2 } },
      { kind: 'journal', _count: { _all: 1 } },
      { kind: 'idea', _count: { _all: 9 } },
    ]);

    const res = await request(app).get('/api/learning/stats');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ notesCount: 4, lessonsCount: 2, journalCount: 1 });
    const args = (prisma.knowledgeNode.groupBy as any).mock.calls[0][0];
    expect(args.by).toEqual(['kind']);
    expect(args.where.userId).toBe('test-user-id');
    expect(args.where.OR).toEqual([{ legacyId: null }, { NOT: { legacyId: { startsWith: 'book:' } } }]);
  });

  it('returns zeros when the user has no nodes', async () => {
    (prisma.knowledgeNode.groupBy as any).mockResolvedValue([]);
    const res = await request(app).get('/api/learning/stats');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ notesCount: 0, lessonsCount: 0, journalCount: 0 });
  });
});
