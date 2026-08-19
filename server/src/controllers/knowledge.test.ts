import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index';
import { parseWikiLinks, NODE_XP, LINK_XP } from './knowledge';

vi.mock('../services/bookNodes', () => ({
  syncBookNodes: vi.fn().mockResolvedValue({ created: 0, updated: 0, removed: 0 }),
}));

vi.mock('../lib/prisma', () => ({
  default: {
    knowledgeNode: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    knowledgeEdge: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      delete: vi.fn(),
    },
    user: {
      update: vi.fn().mockResolvedValue({ totalXP: 0 }),
      upsert: vi.fn().mockResolvedValue({}),
    },
    dailyActivity: { upsert: vi.fn().mockResolvedValue({}) },
  },
}));

vi.mock('../middleware/auth', async () => ({
  authMiddleware: (req: any, _res: any, next: any) => {
    req.user = { id: 'test-user-id', email: 'test@example.com' };
    next();
  },
}));

import prisma from '../lib/prisma';

describe('parseWikiLinks', () => {
  it('extracts [[Title]] references', () => {
    expect(parseWikiLinks('See [[Some Note]] and [[Another One]].')).toEqual(['Some Note', 'Another One']);
  });

  it('dedupes repeated references', () => {
    expect(parseWikiLinks('[[A]] then [[A]] again')).toEqual(['A']);
  });

  it('returns nothing for plain text', () => {
    expect(parseWikiLinks('no links here')).toEqual([]);
  });

  it('ignores an empty or unclosed bracket', () => {
    expect(parseWikiLinks('[[ ]] and [[unclosed')).toEqual([]);
  });
});

describe('Knowledge graph endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.knowledgeNode.findMany as any).mockResolvedValue([]);
    (prisma.knowledgeEdge.findMany as any).mockResolvedValue([]);
    (prisma.knowledgeEdge.createMany as any).mockResolvedValue({ count: 0 });
    (prisma.knowledgeEdge.deleteMany as any).mockResolvedValue({ count: 0 });
  });

  describe('GET /api/knowledge', () => {
    it('returns nodes and edges for the user', async () => {
      (prisma.knowledgeNode.findMany as any).mockResolvedValue([{ id: 'n1', title: 'A' }]);
      (prisma.knowledgeEdge.findMany as any).mockResolvedValue([{ id: 'e1', fromId: 'n1', toId: 'n2' }]);

      const res = await request(app).get('/api/knowledge');

      expect(res.status).toBe(200);
      expect(res.body.nodes).toHaveLength(1);
      expect(res.body.edges).toHaveLength(1);
    });
  });

  describe('GET /api/knowledge/:id', () => {
    it('returns 404 for a node the user does not own', async () => {
      (prisma.knowledgeNode.findFirst as any).mockResolvedValue(null);
      const res = await request(app).get('/api/knowledge/n1');
      expect(res.status).toBe(404);
    });

    it('splits edges into links (outgoing) and backlinks (incoming)', async () => {
      (prisma.knowledgeNode.findFirst as any).mockResolvedValue({ id: 'n1', title: 'A' });
      (prisma.knowledgeEdge.findMany as any).mockResolvedValue([
        { id: 'e1', fromId: 'n1', toId: 'n2', kind: 'relates', auto: false, from: { id: 'n1' }, to: { id: 'n2', title: 'B' } },
        { id: 'e2', fromId: 'n3', toId: 'n1', kind: 'relates', auto: false, from: { id: 'n3', title: 'C' }, to: { id: 'n1' } },
      ]);

      const res = await request(app).get('/api/knowledge/n1');

      expect(res.status).toBe(200);
      expect(res.body.links).toHaveLength(1);
      expect(res.body.links[0].node.title).toBe('B');
      expect(res.body.backlinks).toHaveLength(1);
      expect(res.body.backlinks[0].node.title).toBe('C');
    });
  });

  describe('POST /api/knowledge', () => {
    it('creates a node, awards XP, and defaults kind to note', async () => {
      (prisma.knowledgeNode.create as any).mockResolvedValue({ id: 'n1', title: 'New', content: '', kind: 'note' });

      const res = await request(app).post('/api/knowledge').send({ title: 'New' });

      expect(res.status).toBe(201);
      expect(res.body.xpAwarded).toBe(NODE_XP);
      expect(prisma.knowledgeNode.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ kind: 'note', title: 'New' }),
      }));
    });

    it('rejects an empty title', async () => {
      const res = await request(app).post('/api/knowledge').send({ title: '  ' });
      expect(res.status).toBe(400);
      expect(prisma.knowledgeNode.create).not.toHaveBeenCalled();
    });

    it('rejects an invalid kind', async () => {
      const res = await request(app).post('/api/knowledge').send({ title: 'X', kind: 'bogus' });
      expect(res.status).toBe(400);
    });

    it('auto-links to an existing node referenced via [[wiki-link]]', async () => {
      (prisma.knowledgeNode.create as any).mockResolvedValue({ id: 'n1', title: 'New', content: 'See [[Target]]' });
      (prisma.knowledgeNode.findMany as any).mockResolvedValue([{ id: 'n2', title: 'Target' }]);

      const res = await request(app).post('/api/knowledge').send({ title: 'New', content: 'See [[Target]]' });

      expect(res.status).toBe(201);
      expect(res.body.unresolved).toEqual([]);
      expect(prisma.knowledgeEdge.createMany).toHaveBeenCalledWith({
        data: [{ userId: 'test-user-id', fromId: 'n1', toId: 'n2', kind: 'relates', auto: true }],
        skipDuplicates: true,
      });
    });

    it('reports an unresolved wiki-link when the target does not exist', async () => {
      (prisma.knowledgeNode.create as any).mockResolvedValue({ id: 'n1', title: 'New', content: 'See [[Missing]]' });
      (prisma.knowledgeNode.findMany as any).mockResolvedValue([]);

      const res = await request(app).post('/api/knowledge').send({ title: 'New', content: 'See [[Missing]]' });

      expect(res.body.unresolved).toEqual(['Missing']);
    });
  });

  describe('PATCH /api/knowledge/:id', () => {
    it('returns 404 for a node the user does not own', async () => {
      (prisma.knowledgeNode.findFirst as any).mockResolvedValue(null);
      const res = await request(app).patch('/api/knowledge/n1').send({ title: 'X' });
      expect(res.status).toBe(404);
    });

    it('rejects clearing the title to empty', async () => {
      (prisma.knowledgeNode.findFirst as any).mockResolvedValue({ id: 'n1', title: 'A', content: '' });
      const res = await request(app).patch('/api/knowledge/n1').send({ title: '' });
      expect(res.status).toBe(400);
    });

    it('updates fields that were provided', async () => {
      (prisma.knowledgeNode.findFirst as any).mockResolvedValue({ id: 'n1', title: 'A', content: '' });
      (prisma.knowledgeNode.update as any).mockResolvedValue({ id: 'n1', title: 'B', content: '' });

      const res = await request(app).patch('/api/knowledge/n1').send({ title: 'B' });

      expect(res.status).toBe(200);
      expect(prisma.knowledgeNode.update).toHaveBeenCalledWith({ where: { id: 'n1' }, data: { title: 'B' } });
    });
  });

  describe('DELETE /api/knowledge/:id', () => {
    it('returns 404 for a node the user does not own', async () => {
      (prisma.knowledgeNode.findFirst as any).mockResolvedValue(null);
      const res = await request(app).delete('/api/knowledge/n1');
      expect(res.status).toBe(404);
      expect(prisma.knowledgeNode.delete).not.toHaveBeenCalled();
    });

    it('deletes a node the user owns', async () => {
      (prisma.knowledgeNode.findFirst as any).mockResolvedValue({ id: 'n1' });
      const res = await request(app).delete('/api/knowledge/n1');
      expect(res.status).toBe(200);
      expect(prisma.knowledgeNode.delete).toHaveBeenCalledWith({ where: { id: 'n1' } });
    });
  });

  describe('POST /api/knowledge/edges', () => {
    it('rejects linking a node to itself', async () => {
      const res = await request(app).post('/api/knowledge/edges').send({ fromId: 'n1', toId: 'n1' });
      expect(res.status).toBe(400);
    });

    it('returns 404 when either node is not owned by the user', async () => {
      (prisma.knowledgeNode.count as any).mockResolvedValue(1);
      const res = await request(app).post('/api/knowledge/edges').send({ fromId: 'n1', toId: 'n2' });
      expect(res.status).toBe(404);
    });

    it('creates a manual edge and awards XP', async () => {
      (prisma.knowledgeNode.count as any).mockResolvedValue(2);
      (prisma.knowledgeEdge.findFirst as any).mockResolvedValue(null);
      (prisma.knowledgeEdge.create as any).mockResolvedValue({ id: 'e1', fromId: 'n1', toId: 'n2', kind: 'relates' });

      const res = await request(app).post('/api/knowledge/edges').send({ fromId: 'n1', toId: 'n2' });

      expect(res.status).toBe(201);
      expect(res.body.xpAwarded).toBe(LINK_XP);
    });

    it('is idempotent — a duplicate edge awards no XP', async () => {
      (prisma.knowledgeNode.count as any).mockResolvedValue(2);
      (prisma.knowledgeEdge.findFirst as any).mockResolvedValue({ id: 'e1', fromId: 'n1', toId: 'n2', kind: 'relates' });

      const res = await request(app).post('/api/knowledge/edges').send({ fromId: 'n1', toId: 'n2' });

      expect(res.status).toBe(200);
      expect(res.body.xpAwarded).toBe(0);
      expect(prisma.knowledgeEdge.create).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /api/knowledge/edges/:id', () => {
    it('returns 404 for an edge the user does not own', async () => {
      (prisma.knowledgeEdge.findFirst as any).mockResolvedValue(null);
      const res = await request(app).delete('/api/knowledge/edges/e1');
      expect(res.status).toBe(404);
    });
  });
});
