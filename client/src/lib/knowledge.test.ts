import { describe, it, expect } from 'vitest';
import { parseWikiLinks, neighborhood, orphans, type GraphEdge, type GraphNode } from './knowledge';
import { layout, seedPositions, computeDegrees, tick, energy } from './forceGraph';

const node = (id: string, tags: string[] = []): GraphNode => ({
  id, kind: 'note', title: id, tags, updatedAt: '2026-01-01T00:00:00Z',
});
const edge = (id: string, fromId: string, toId: string): GraphEdge => ({
  id, fromId, toId, kind: 'relates', auto: false,
});

describe('parseWikiLinks', () => {
  it('pulls out every distinct [[link]]', () => {
    expect(parseWikiLinks('see [[Stoicism]] and [[Habit Loops]]')).toEqual(['Stoicism', 'Habit Loops']);
  });

  it('trims whitespace and de-duplicates', () => {
    expect(parseWikiLinks('[[ A ]] then [[A]] again')).toEqual(['A']);
  });

  it('ignores unclosed or empty brackets', () => {
    expect(parseWikiLinks('[[unclosed and [[]] here')).toEqual([]);
  });

  it('does not span newlines', () => {
    expect(parseWikiLinks('[[start\nend]]')).toEqual([]);
  });

  it('returns nothing for plain text', () => {
    expect(parseWikiLinks('no links at all')).toEqual([]);
  });
});

describe('neighborhood', () => {
  const edges = [edge('e1', 'a', 'b'), edge('e2', 'b', 'c'), edge('e3', 'd', 'e')];

  it('includes the node itself at depth 1', () => {
    expect([...neighborhood('a', edges, 1)].sort()).toEqual(['a', 'b']);
  });

  it('walks further hops', () => {
    expect([...neighborhood('a', edges, 2)].sort()).toEqual(['a', 'b', 'c']);
  });

  it('follows edges in both directions', () => {
    expect([...neighborhood('c', edges, 1)].sort()).toEqual(['b', 'c']);
  });

  it('does not leak into a disconnected component', () => {
    expect(neighborhood('a', edges, 5).has('d')).toBe(false);
  });
});

describe('orphans', () => {
  it('finds nodes with no edges', () => {
    const nodes = [node('a'), node('b'), node('lonely')];
    expect(orphans(nodes, [edge('e1', 'a', 'b')]).map((n) => n.id)).toEqual(['lonely']);
  });

  it('returns everything when there are no edges', () => {
    expect(orphans([node('a'), node('b')], [])).toHaveLength(2);
  });
});

describe('force layout', () => {
  it('separates connected nodes instead of stacking them', () => {
    const positions = layout(['a', 'b', 'c'], [{ fromId: 'a', toId: 'b' }]);
    const a = positions.get('a')!;
    const b = positions.get('b')!;
    const dist = Math.hypot(a.x - b.x, a.y - b.y);
    expect(dist).toBeGreaterThan(10);
    expect(Number.isFinite(dist)).toBe(true);
  });

  it('settles — kinetic energy decays', () => {
    const nodes = seedPositions(['a', 'b', 'c', 'd']);
    const edges = [{ fromId: 'a', toId: 'b' }, { fromId: 'c', toId: 'd' }];
    computeDegrees(nodes, edges);
    for (let i = 0; i < 5; i++) tick(nodes, edges);
    const early = energy(nodes);
    for (let i = 0; i < 300; i++) tick(nodes, edges);
    expect(energy(nodes)).toBeLessThan(early);
  });

  it('keeps every coordinate finite even when nodes start coincident', () => {
    const nodes = seedPositions(['a', 'b']);
    for (const n of nodes.values()) { n.x = 0; n.y = 0; }
    tick(nodes, [{ fromId: 'a', toId: 'b' }]);
    for (const n of nodes.values()) {
      expect(Number.isFinite(n.x)).toBe(true);
      expect(Number.isFinite(n.y)).toBe(true);
    }
  });

  it('never moves a pinned node', () => {
    const nodes = seedPositions(['a', 'b']);
    const a = nodes.get('a')!;
    a.fixed = true;
    a.x = 25;
    a.y = -40;
    for (let i = 0; i < 50; i++) tick(nodes, []);
    expect(a.x).toBe(25);
    expect(a.y).toBe(-40);
  });

  it('reuses known positions so adding a node does not reshuffle the graph', () => {
    const first = seedPositions(['a', 'b']);
    first.get('a')!.x = 123;
    const second = seedPositions(['a', 'b', 'c'], first);
    expect(second.get('a')!.x).toBe(123);
    expect(second.has('c')).toBe(true);
  });

  it('computes degree from edges', () => {
    const nodes = seedPositions(['a', 'b', 'c']);
    computeDegrees(nodes, [{ fromId: 'a', toId: 'b' }, { fromId: 'a', toId: 'c' }]);
    expect(nodes.get('a')!.degree).toBe(2);
    expect(nodes.get('b')!.degree).toBe(1);
  });

  it('handles an empty graph', () => {
    expect(() => layout([], [])).not.toThrow();
  });
});
