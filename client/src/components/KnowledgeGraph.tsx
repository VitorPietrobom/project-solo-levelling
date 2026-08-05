import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Maximize2, Crosshair } from 'lucide-react';
import { seedPositions, computeDegrees, tick, energy, type SimNode } from '../lib/forceGraph';
import { KIND_META, type GraphEdge, type GraphNode } from '../lib/knowledge';

interface Props {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedId: string | null;
  /** Ids that survive the current search/tag filter. Others are dimmed. */
  matchIds: Set<string> | null;
  onSelect: (id: string) => void;
  height?: number;
}

const EDGE_DASH: Record<string, string | undefined> = {
  contradicts: '4 3',
  derived_from: '1 4',
};

function radiusFor(degree: number): number {
  return 7 + Math.min(9, Math.sqrt(degree) * 3.2);
}

export default function KnowledgeGraph({ nodes, edges, selectedId, matchIds, onSelect, height = 420 }: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const simRef = useRef<Map<string, SimNode>>(new Map());
  const frameRef = useRef<number | null>(null);
  const dragRef = useRef<{ id: string; pointerId: number } | null>(null);
  const panRef = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);

  const [, forceRender] = useState(0);
  const [view, setView] = useState({ tx: 0, ty: 0, scale: 1 });
  const [hoverId, setHoverId] = useState<string | null>(null);

  const simEdges = useMemo(() => edges.map((e) => ({ fromId: e.fromId, toId: e.toId })), [edges]);
  const nodeIds = useMemo(() => nodes.map((n) => n.id), [nodes]);
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  // Re-seed whenever the node set changes, keeping positions of nodes we
  // already know so adding one doesn't rearrange the whole map.
  useEffect(() => {
    simRef.current = seedPositions(nodeIds, simRef.current);
    computeDegrees(simRef.current, simEdges);
  }, [nodeIds, simEdges]);

  // Animation loop — stops itself once the layout settles, restarts on change.
  useEffect(() => {
    let alive = true;
    let idle = 0;
    function step() {
      if (!alive) return;
      tick(simRef.current, simEdges);
      forceRender((n) => n + 1);
      idle = energy(simRef.current) < 0.05 ? idle + 1 : 0;
      // Keep ticking while a node is being dragged, even at rest.
      if (idle > 30 && !dragRef.current) { frameRef.current = null; return; }
      frameRef.current = requestAnimationFrame(step);
    }
    frameRef.current = requestAnimationFrame(step);
    return () => {
      alive = false;
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };
  }, [simEdges, nodeIds]);

  const wake = useCallback(() => {
    if (frameRef.current !== null) return;
    let idle = 0;
    const step = () => {
      tick(simRef.current, simEdges);
      forceRender((n) => n + 1);
      idle = energy(simRef.current) < 0.05 ? idle + 1 : 0;
      if (idle > 30 && !dragRef.current) { frameRef.current = null; return; }
      frameRef.current = requestAnimationFrame(step);
    };
    frameRef.current = requestAnimationFrame(step);
  }, [simEdges]);

  function toGraphCoords(clientX: number, clientY: number) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const cx = clientX - rect.left - rect.width / 2;
    const cy = clientY - rect.top - rect.height / 2;
    return { x: (cx - view.tx) / view.scale, y: (cy - view.ty) / view.scale };
  }

  function handleNodeDown(e: React.PointerEvent, id: string) {
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragRef.current = { id, pointerId: e.pointerId };
    const n = simRef.current.get(id);
    if (n) n.fixed = true;
    wake();
  }

  function handlePointerMove(e: React.PointerEvent) {
    const drag = dragRef.current;
    if (drag) {
      const n = simRef.current.get(drag.id);
      if (n) {
        const p = toGraphCoords(e.clientX, e.clientY);
        n.x = p.x;
        n.y = p.y;
      }
      return;
    }
    const pan = panRef.current;
    if (pan) {
      setView((v) => ({ ...v, tx: pan.tx + (e.clientX - pan.x), ty: pan.ty + (e.clientY - pan.y) }));
    }
  }

  function endDrag() {
    const drag = dragRef.current;
    if (drag) {
      const n = simRef.current.get(drag.id);
      // Release the pin so the layout can relax around the new position.
      if (n) n.fixed = false;
      dragRef.current = null;
      wake();
    }
    panRef.current = null;
  }

  function handleBackgroundDown(e: React.PointerEvent) {
    panRef.current = { x: e.clientX, y: e.clientY, tx: view.tx, ty: view.ty };
  }

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    setView((v) => ({ ...v, scale: Math.max(0.3, Math.min(3, v.scale * (e.deltaY < 0 ? 1.12 : 0.89))) }));
  }

  function fitToView() {
    const list = [...simRef.current.values()];
    if (list.length === 0) { setView({ tx: 0, ty: 0, scale: 1 }); return; }
    const xs = list.map((n) => n.x);
    const ys = list.map((n) => n.y);
    const w = Math.max(120, Math.max(...xs) - Math.min(...xs)) + 90;
    const h = Math.max(120, Math.max(...ys) - Math.min(...ys)) + 90;
    const rect = svgRef.current?.getBoundingClientRect();
    const scale = rect ? Math.max(0.3, Math.min(1.6, Math.min(rect.width / w, rect.height / h))) : 1;
    const cx = (Math.max(...xs) + Math.min(...xs)) / 2;
    const cy = (Math.max(...ys) + Math.min(...ys)) / 2;
    setView({ tx: -cx * scale, ty: -cy * scale, scale });
  }

  // Nodes one hop from the selection get a highlighted edge.
  const adjacent = useMemo(() => {
    if (!selectedId) return new Set<string>();
    const s = new Set<string>();
    for (const e of edges) {
      if (e.fromId === selectedId) s.add(e.toId);
      if (e.toId === selectedId) s.add(e.fromId);
    }
    return s;
  }, [edges, selectedId]);

  if (nodes.length === 0) {
    return (
      <div style={{ height, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'var(--surface-inset)', borderRadius: 'var(--r)', color: 'var(--text-faint)' }}>
        <Crosshair size={26} />
        <p style={{ fontSize: 13 }}>Your graph is empty. Add a node to start connecting ideas.</p>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', background: 'var(--surface-inset)', borderRadius: 'var(--r)', overflow: 'hidden', touchAction: 'none' }}>
      <button
        onClick={fitToView} className="btn btn-ghost" aria-label="Fit graph to view"
        style={{ position: 'absolute', top: 10, right: 10, zIndex: 2, padding: '5px 8px', fontSize: 11.5 }}
      >
        <Maximize2 size={13} />Fit
      </button>

      <svg
        ref={svgRef} width="100%" height={height} role="img" aria-label="Knowledge graph"
        onPointerDown={handleBackgroundDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onPointerCancel={endDrag}
        onWheel={handleWheel}
        style={{ display: 'block', cursor: panRef.current ? 'grabbing' : 'grab' }}
      >
        <g transform={`translate(${(svgRef.current?.clientWidth ?? 0) / 2 + view.tx}, ${height / 2 + view.ty}) scale(${view.scale})`}>
          {edges.map((e) => {
            const a = simRef.current.get(e.fromId);
            const b = simRef.current.get(e.toId);
            if (!a || !b) return null;
            const touching = selectedId === e.fromId || selectedId === e.toId;
            const dimmed = matchIds ? !(matchIds.has(e.fromId) && matchIds.has(e.toId)) : false;
            return (
              <line
                key={e.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke={touching ? 'var(--accent)' : 'var(--line-soft)'}
                strokeWidth={touching ? 1.6 : 1}
                strokeDasharray={EDGE_DASH[e.kind]}
                opacity={dimmed ? 0.15 : touching ? 0.9 : 0.45}
              />
            );
          })}

          {nodes.map((n) => {
            const p = simRef.current.get(n.id);
            if (!p) return null;
            const meta = KIND_META[n.kind] ?? KIND_META.note;
            const selected = selectedId === n.id;
            const near = adjacent.has(n.id);
            const dimmed = matchIds ? !matchIds.has(n.id) : false;
            const r = radiusFor(p.degree);
            const showLabel = selected || near || hoverId === n.id || view.scale > 0.85;
            return (
              <g
                key={n.id}
                transform={`translate(${p.x}, ${p.y})`}
                opacity={dimmed ? 0.2 : 1}
                style={{ cursor: 'pointer' }}
                onPointerDown={(e) => handleNodeDown(e, n.id)}
                onPointerUp={(e) => { e.stopPropagation(); onSelect(n.id); endDrag(); }}
                onPointerEnter={() => setHoverId(n.id)}
                onPointerLeave={() => setHoverId((h) => (h === n.id ? null : h))}
              >
                {selected && <circle r={r + 6} fill="none" stroke="var(--accent)" strokeWidth={1.5} opacity={0.6} />}
                <circle
                  r={r} fill={meta.color}
                  stroke={selected ? 'var(--accent)' : 'var(--bg-1)'} strokeWidth={selected ? 2 : 1.5}
                  opacity={selected || near || !selectedId ? 1 : 0.55}
                />
                {showLabel && (
                  <text
                    y={r + 12} textAnchor="middle"
                    style={{ fontSize: 10.5, fill: selected ? 'var(--text)' : 'var(--text-3)', pointerEvents: 'none', fontWeight: selected ? 600 : 500 }}
                  >
                    {n.title.length > 22 ? `${n.title.slice(0, 21)}…` : n.title}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Legend */}
      <div style={{ position: 'absolute', bottom: 8, left: 10, display: 'flex', flexWrap: 'wrap', gap: 8, pointerEvents: 'none' }}>
        {[...new Set(nodes.map((n) => n.kind))].map((k) => {
          const meta = KIND_META[k] ?? KIND_META.note;
          return (
            <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10.5, color: 'var(--text-faint)' }}>
              <span style={{ width: 7, height: 7, borderRadius: 99, background: meta.color }} />{meta.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
