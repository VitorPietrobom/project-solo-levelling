import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/prisma', () => ({
  default: {
    book: { findMany: vi.fn() },
    knowledgeNode: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  },
}));

import prisma from '../lib/prisma';
import { syncBookNodes, removeBookNode } from './bookNodes';

describe('bookNodes (OE-020)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('only reads book projections (kind source, legacyId book:*) when syncing', async () => {
    (prisma.book.findMany as any).mockResolvedValue([]);
    (prisma.knowledgeNode.findMany as any).mockResolvedValue([]);

    await syncBookNodes('u1');

    expect(prisma.knowledgeNode.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 'u1', kind: 'source', bookId: { not: null }, legacyId: { startsWith: 'book:' } },
    }));
    expect(prisma.knowledgeNode.deleteMany).not.toHaveBeenCalled();
  });

  it('removeBookNode only deletes the projection node', async () => {
    await removeBookNode('u1', 'b1');

    expect(prisma.knowledgeNode.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'u1', bookId: 'b1', kind: 'source', legacyId: 'book:b1' },
    });
  });
});
