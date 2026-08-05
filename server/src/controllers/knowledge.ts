import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { awardXP } from '../services/xp';

export const NODE_XP = 12;
export const LINK_XP = 4;

const KINDS = ['note', 'journal', 'lesson', 'idea', 'question', 'source', 'person', 'concept'] as const;
const EDGE_KINDS = ['relates', 'supports', 'contradicts', 'derived_from', 'example_of'] as const;

type Kind = (typeof KINDS)[number];
type EdgeKind = (typeof EDGE_KINDS)[number];

function isKind(v: unknown): v is Kind {
  return typeof v === 'string' && (KINDS as readonly string[]).includes(v);
}
function isEdgeKind(v: unknown): v is EdgeKind {
  return typeof v === 'string' && (EDGE_KINDS as readonly string[]).includes(v);
}
function cleanTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  return [...new Set(tags.filter((t): t is string => typeof t === 'string').map((t) => t.trim()).filter(Boolean))];
}

/** Pull `[[Some Title]]` references out of a node body. */
export function parseWikiLinks(content: string): string[] {
  const out: string[] = [];
  const re = /\[\[([^\]\[\n]{1,120})\]\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    const t = (m[1] ?? '').trim();
    if (t) out.push(t);
  }
  return [...new Set(out)];
}

/**
 * Rebuild the auto (wiki-link) edges leaving `nodeId`. Manual edges are left
 * alone — only rows with auto=true are managed here. Unresolved titles are
 * returned so the client can offer to create the missing node.
 */
async function syncAutoEdges(userId: string, nodeId: string, content: string): Promise<string[]> {
  const titles = parseWikiLinks(content);

  const targets = titles.length
    ? await prisma.knowledgeNode.findMany({
        where: { userId, title: { in: titles, mode: 'insensitive' } },
        select: { id: true, title: true },
      })
    : [];

  const byTitle = new Map(targets.map((t) => [t.title.toLowerCase(), t.id]));
  const wanted = new Set<string>();
  const unresolved: string[] = [];
  for (const t of titles) {
    const id = byTitle.get(t.toLowerCase());
    if (id && id !== nodeId) wanted.add(id);
    else if (!id) unresolved.push(t);
  }

  const existing = await prisma.knowledgeEdge.findMany({
    where: { userId, fromId: nodeId, auto: true },
    select: { id: true, toId: true },
  });

  const stale = existing.filter((e) => !wanted.has(e.toId)).map((e) => e.id);
  if (stale.length) await prisma.knowledgeEdge.deleteMany({ where: { id: { in: stale } } });

  const have = new Set(existing.map((e) => e.toId));
  const toCreate = [...wanted].filter((id) => !have.has(id));
  if (toCreate.length) {
    await prisma.knowledgeEdge.createMany({
      data: toCreate.map((toId) => ({ userId, fromId: nodeId, toId, kind: 'relates' as const, auto: true })),
      skipDuplicates: true,
    });
  }

  return unresolved;
}

// GET /api/knowledge — the whole graph (nodes + edges) for the user.
export async function getGraph(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const [nodes, edges] = await Promise.all([
      prisma.knowledgeNode.findMany({
        where: { userId },
        select: {
          id: true, kind: true, title: true, tags: true, linkedSkillId: true,
          bookId: true, date: true, createdAt: true, updatedAt: true,
        },
        orderBy: { updatedAt: 'desc' as const },
      }),
      prisma.knowledgeEdge.findMany({
        where: { userId },
        select: { id: true, fromId: true, toId: true, kind: true, auto: true },
      }),
    ]);
    res.json({ nodes, edges });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// GET /api/knowledge/:id — full node with its neighbours (both directions).
export async function getNode(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;

    const node = await prisma.knowledgeNode.findFirst({ where: { id, userId } });
    if (!node) {
      res.status(404).json({ error: 'Node not found' });
      return;
    }

    const edges = await prisma.knowledgeEdge.findMany({
      where: { userId, OR: [{ fromId: id }, { toId: id }] },
      include: {
        from: { select: { id: true, title: true, kind: true } },
        to: { select: { id: true, title: true, kind: true } },
      },
    });

    const links = edges.filter((e) => e.fromId === id).map((e) => ({ edgeId: e.id, kind: e.kind, auto: e.auto, node: e.to }));
    const backlinks = edges.filter((e) => e.toId === id).map((e) => ({ edgeId: e.id, kind: e.kind, auto: e.auto, node: e.from }));

    res.json({ ...node, links, backlinks });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createNode(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { kind, title, content, tags, linkedSkillId, bookId, date } = req.body;

    if (!title || typeof title !== 'string' || title.trim() === '') {
      res.status(400).json({ error: 'Title is required' });
      return;
    }
    if (kind !== undefined && !isKind(kind)) {
      res.status(400).json({ error: 'Invalid kind' });
      return;
    }

    const body = typeof content === 'string' ? content : '';
    const node = await prisma.knowledgeNode.create({
      data: {
        userId,
        kind: isKind(kind) ? kind : 'note',
        title: title.trim(),
        content: body,
        tags: cleanTags(tags),
        linkedSkillId: linkedSkillId || null,
        bookId: bookId || null,
        date: typeof date === 'string' && date ? new Date(`${date.slice(0, 10)}T00:00:00Z`) : null,
      },
    });

    const unresolved = await syncAutoEdges(userId, node.id, body);
    await awardXP(userId, NODE_XP, `knowledge:${node.id}`);

    res.status(201).json({ ...node, unresolved, xpAwarded: NODE_XP });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateNode(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;

    const existing = await prisma.knowledgeNode.findFirst({ where: { id, userId } });
    if (!existing) {
      res.status(404).json({ error: 'Node not found' });
      return;
    }

    const { kind, title, content, tags, linkedSkillId, bookId, date } = req.body;
    const data: Record<string, unknown> = {};

    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim() === '') {
        res.status(400).json({ error: 'Title cannot be empty' });
        return;
      }
      data.title = title.trim();
    }
    if (kind !== undefined) {
      if (!isKind(kind)) {
        res.status(400).json({ error: 'Invalid kind' });
        return;
      }
      data.kind = kind;
    }
    if (content !== undefined) data.content = typeof content === 'string' ? content : '';
    if (tags !== undefined) data.tags = cleanTags(tags);
    if (linkedSkillId !== undefined) data.linkedSkillId = linkedSkillId || null;
    if (bookId !== undefined) data.bookId = bookId || null;
    if (date !== undefined) data.date = typeof date === 'string' && date ? new Date(`${date.slice(0, 10)}T00:00:00Z`) : null;

    const updated = await prisma.knowledgeNode.update({ where: { id }, data });

    // A title change can resolve other notes' dangling [[links]], so resync
    // the edited node and anything that already points at it.
    const unresolved = await syncAutoEdges(userId, id, updated.content);

    res.json({ ...updated, unresolved });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteNode(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;
    const node = await prisma.knowledgeNode.findFirst({ where: { id, userId } });
    if (!node) {
      res.status(404).json({ error: 'Node not found' });
      return;
    }
    await prisma.knowledgeNode.delete({ where: { id } });
    res.json({ message: 'Node deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// POST /api/knowledge/edges — manual link between two nodes.
export async function createEdge(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { fromId, toId, kind } = req.body;

    if (typeof fromId !== 'string' || typeof toId !== 'string' || fromId === toId) {
      res.status(400).json({ error: 'fromId and toId must be two different nodes' });
      return;
    }
    if (kind !== undefined && !isEdgeKind(kind)) {
      res.status(400).json({ error: 'Invalid edge kind' });
      return;
    }

    const owned = await prisma.knowledgeNode.count({ where: { userId, id: { in: [fromId, toId] } } });
    if (owned !== 2) {
      res.status(404).json({ error: 'Node not found' });
      return;
    }

    const edgeKind = isEdgeKind(kind) ? kind : 'relates';
    const dupe = await prisma.knowledgeEdge.findFirst({ where: { fromId, toId, kind: edgeKind } });
    if (dupe) {
      res.status(200).json({ ...dupe, xpAwarded: 0 });
      return;
    }

    const edge = await prisma.knowledgeEdge.create({
      data: { userId, fromId, toId, kind: edgeKind, auto: false },
    });
    await awardXP(userId, LINK_XP, `knowledge-edge:${edge.id}`);

    res.status(201).json({ ...edge, xpAwarded: LINK_XP });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteEdge(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;
    const edge = await prisma.knowledgeEdge.findFirst({ where: { id, userId } });
    if (!edge) {
      res.status(404).json({ error: 'Edge not found' });
      return;
    }
    await prisma.knowledgeEdge.delete({ where: { id } });
    res.json({ message: 'Edge deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * POST /api/knowledge/import-legacy
 * Backfills the graph from the old Note / JournalEntry / LessonLearned tables.
 * Idempotent: every imported row records its source id in `legacyId`, so
 * re-running only picks up whatever is new. The legacy rows are left in place.
 */
export async function importLegacy(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;

    const [notes, journal, lessons, already] = await Promise.all([
      prisma.note.findMany({ where: { userId } }),
      prisma.journalEntry.findMany({ where: { userId } }),
      prisma.lessonLearned.findMany({ where: { userId } }),
      prisma.knowledgeNode.findMany({ where: { userId, legacyId: { not: null } }, select: { legacyId: true } }),
    ]);

    const done = new Set(already.map((n) => n.legacyId));
    const rows: {
      userId: string; kind: Kind; title: string; content: string;
      tags: string[]; linkedSkillId: string | null; legacyId: string; date: Date | null; createdAt: Date;
    }[] = [];

    const firstLine = (text: string, fallback: string) => {
      const line = (text || '').split('\n').find((l) => l.trim() !== '')?.trim() ?? '';
      const stripped = line.replace(/^#+\s*/, '');
      return stripped ? stripped.slice(0, 90) : fallback;
    };

    for (const n of notes) {
      const key = `note:${n.id}`;
      if (done.has(key)) continue;
      rows.push({ userId, kind: 'note', title: n.title, content: n.content, tags: n.tags, linkedSkillId: null, legacyId: key, date: null, createdAt: n.createdAt });
    }
    for (const j of journal) {
      const key = `journal:${j.id}`;
      if (done.has(key)) continue;
      const day = j.date.toISOString().slice(0, 10);
      rows.push({ userId, kind: 'journal', title: firstLine(j.content, `Journal — ${day}`), content: j.content, tags: j.tags, linkedSkillId: j.linkedSkillId, legacyId: key, date: j.date, createdAt: j.createdAt });
    }
    for (const l of lessons) {
      const key = `lesson:${l.id}`;
      if (done.has(key)) continue;
      rows.push({ userId, kind: 'lesson', title: firstLine(l.content, 'Lesson'), content: l.content, tags: l.tags, linkedSkillId: l.linkedSkillId, legacyId: key, date: l.date, createdAt: l.createdAt });
    }

    if (rows.length) {
      await prisma.knowledgeNode.createMany({ data: rows, skipDuplicates: true });
    }

    // Shared tags are the cheapest honest signal for "these two are related",
    // so seed auto-edges between nodes that share a tag. Imports only.
    const all = await prisma.knowledgeNode.findMany({ where: { userId }, select: { id: true, tags: true } });
    const byTag = new Map<string, string[]>();
    for (const n of all) {
      for (const t of n.tags) {
        const list = byTag.get(t) ?? [];
        list.push(n.id);
        byTag.set(t, list);
      }
    }
    const seeded: { userId: string; fromId: string; toId: string; kind: 'relates'; auto: true }[] = [];
    const seen = new Set<string>();
    for (const ids of byTag.values()) {
      // Skip runaway tags — a tag on 12+ notes says nothing specific.
      if (ids.length < 2 || ids.length > 12) continue;
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const a = ids[i]!;
          const b = ids[j]!;
          const key = `${a}|${b}`;
          if (seen.has(key)) continue;
          seen.add(key);
          seeded.push({ userId, fromId: a, toId: b, kind: 'relates', auto: true });
        }
      }
    }
    if (seeded.length) {
      await prisma.knowledgeEdge.createMany({ data: seeded, skipDuplicates: true });
    }

    res.json({ imported: rows.length, linked: seeded.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
