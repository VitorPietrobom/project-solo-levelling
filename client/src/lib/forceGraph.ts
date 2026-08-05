// A tiny force-directed layout. Deliberately dependency-free: the graphs here
// are personal-sized (tens to a few hundred nodes), so the naive O(n²)
// repulsion is cheaper than shipping d3-force or a WebGL renderer to a phone.

export interface SimNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Pinned by a drag — the simulation must not move it. */
  fixed?: boolean;
  /** Degree, used to size the node and weight its mass. */
  degree: number;
}

export interface SimEdge {
  fromId: string;
  toId: string;
}

export interface SimOptions {
  /** Node-node push. Higher = more spread out. */
  repulsion?: number;
  /** Resting length of a link. */
  linkDistance?: number;
  /** How hard links pull, 0–1. */
  linkStrength?: number;
  /** Pull toward the origin, keeps disconnected nodes from drifting away. */
  gravity?: number;
  damping?: number;
}

const DEFAULTS: Required<SimOptions> = {
  repulsion: 2600,
  linkDistance: 92,
  linkStrength: 0.06,
  gravity: 0.014,
  damping: 0.82,
};

/**
 * Lays nodes out on a circle (plus a deterministic jitter so the first tick
 * has something to push apart). Existing positions are preserved so adding a
 * node doesn't reshuffle the whole graph.
 */
export function seedPositions(ids: string[], previous?: Map<string, SimNode>): Map<string, SimNode> {
  const out = new Map<string, SimNode>();
  const n = Math.max(1, ids.length);
  ids.forEach((id, i) => {
    const prev = previous?.get(id);
    if (prev) {
      out.set(id, { ...prev, degree: 0, fixed: false });
      return;
    }
    const angle = (i / n) * Math.PI * 2;
    const radius = 60 + (i % 5) * 26;
    out.set(id, {
      id,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      vx: 0,
      vy: 0,
      degree: 0,
    });
  });
  return out;
}

export function computeDegrees(nodes: Map<string, SimNode>, edges: SimEdge[]): void {
  for (const n of nodes.values()) n.degree = 0;
  for (const e of edges) {
    const a = nodes.get(e.fromId);
    const b = nodes.get(e.toId);
    if (a) a.degree += 1;
    if (b) b.degree += 1;
  }
}

/** Advances the simulation one step, mutating `nodes` in place. */
export function tick(nodes: Map<string, SimNode>, edges: SimEdge[], options: SimOptions = {}): void {
  const opts = { ...DEFAULTS, ...options };
  const list = [...nodes.values()];
  if (list.length === 0) return;

  // Repulsion — every pair pushes apart.
  for (let i = 0; i < list.length; i++) {
    const a = list[i]!;
    for (let j = i + 1; j < list.length; j++) {
      const b = list[j]!;
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      let d2 = dx * dx + dy * dy;
      if (d2 < 0.01) {
        // Perfectly coincident nodes would divide by zero; nudge them apart
        // deterministically using their index so layouts stay reproducible.
        dx = (i - j) * 0.01 + 0.01;
        dy = 0.01;
        d2 = dx * dx + dy * dy;
      }
      const dist = Math.sqrt(d2);
      const force = opts.repulsion / d2;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      a.vx -= fx;
      a.vy -= fy;
      b.vx += fx;
      b.vy += fy;
    }
  }

  // Springs along edges.
  for (const e of edges) {
    const a = nodes.get(e.fromId);
    const b = nodes.get(e.toId);
    if (!a || !b) continue;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
    const force = (dist - opts.linkDistance) * opts.linkStrength;
    const fx = (dx / dist) * force;
    const fy = (dy / dist) * force;
    a.vx += fx;
    a.vy += fy;
    b.vx -= fx;
    b.vy -= fy;
  }

  // Gravity toward the origin + integrate.
  for (const n of list) {
    if (n.fixed) {
      n.vx = 0;
      n.vy = 0;
      continue;
    }
    n.vx -= n.x * opts.gravity;
    n.vy -= n.y * opts.gravity;
    n.vx *= opts.damping;
    n.vy *= opts.damping;
    // Clamp so a dense cluster can't fling a node off-screen.
    n.vx = Math.max(-40, Math.min(40, n.vx));
    n.vy = Math.max(-40, Math.min(40, n.vy));
    n.x += n.vx;
    n.y += n.vy;
  }
}

/** Total kinetic energy — used to stop ticking once the layout settles. */
export function energy(nodes: Map<string, SimNode>): number {
  let sum = 0;
  for (const n of nodes.values()) sum += n.vx * n.vx + n.vy * n.vy;
  return sum;
}

/** Runs the simulation to a settled state without animating (for tests/SSR). */
export function layout(ids: string[], edges: SimEdge[], steps = 240): Map<string, SimNode> {
  const nodes = seedPositions(ids);
  computeDegrees(nodes, edges);
  for (let i = 0; i < steps; i++) {
    tick(nodes, edges);
    if (energy(nodes) < 0.01) break;
  }
  return nodes;
}
