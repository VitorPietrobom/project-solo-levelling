export const KNOWLEDGE_KINDS = ['note', 'journal', 'lesson', 'idea', 'question', 'source', 'person', 'concept'] as const;
export type KnowledgeKind = (typeof KNOWLEDGE_KINDS)[number];

export const EDGE_KINDS = ['relates', 'supports', 'contradicts', 'derived_from', 'example_of'] as const;
export type EdgeKind = (typeof EDGE_KINDS)[number];

export interface GraphNode {
  id: string;
  kind: KnowledgeKind;
  title: string;
  tags: string[];
  linkedSkillId?: string | null;
  bookId?: string | null;
  date?: string | null;
  createdAt?: string;
  updatedAt: string;
}

export interface GraphEdge {
  id: string;
  fromId: string;
  toId: string;
  kind: EdgeKind;
  auto: boolean;
}

export interface NodeRef {
  edgeId: string;
  kind: EdgeKind;
  auto: boolean;
  node: { id: string; title: string; kind: KnowledgeKind };
}

export interface FullNode extends GraphNode {
  content: string;
  links: NodeRef[];
  backlinks: NodeRef[];
}

/** Label + colour token + glyph per node kind. Colours come from the theme. */
export const KIND_META: Record<KnowledgeKind, { label: string; color: string; glyph: string }> = {
  note: { label: 'Note', color: 'var(--accent)', glyph: '◆' },
  journal: { label: 'Journal', color: 'var(--info)', glyph: '◉' },
  lesson: { label: 'Lesson', color: 'var(--good)', glyph: '★' },
  idea: { label: 'Idea', color: 'var(--warn)', glyph: '✦' },
  question: { label: 'Question', color: 'var(--bad)', glyph: '?' },
  source: { label: 'Source', color: 'var(--kind-source)', glyph: '▤' },
  person: { label: 'Person', color: 'var(--kind-person)', glyph: '☺' },
  concept: { label: 'Concept', color: 'var(--accent-2)', glyph: '◈' },
};

export const EDGE_LABEL: Record<EdgeKind, string> = {
  relates: 'relates to',
  supports: 'supports',
  contradicts: 'contradicts',
  derived_from: 'derived from',
  example_of: 'example of',
};

/** Extract `[[Title]]` references from a node body. */
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

/** Node ids reachable from `id` within `depth` hops, including `id` itself. */
export function neighborhood(id: string, edges: GraphEdge[], depth = 1): Set<string> {
  const seen = new Set([id]);
  let frontier = [id];
  for (let d = 0; d < depth; d++) {
    const next: string[] = [];
    for (const e of edges) {
      if (frontier.includes(e.fromId) && !seen.has(e.toId)) { seen.add(e.toId); next.push(e.toId); }
      if (frontier.includes(e.toId) && !seen.has(e.fromId)) { seen.add(e.fromId); next.push(e.fromId); }
    }
    if (next.length === 0) break;
    frontier = next;
  }
  return seen;
}

/**
 * Nodes with no edges at all — the ones worth surfacing, since an orphan in a
 * knowledge base is a thought you never connected to anything.
 */
export function orphans(nodes: GraphNode[], edges: GraphEdge[]): GraphNode[] {
  const linked = new Set<string>();
  for (const e of edges) { linked.add(e.fromId); linked.add(e.toId); }
  return nodes.filter((n) => !linked.has(n.id));
}
