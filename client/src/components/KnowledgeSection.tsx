import { useCallback, useEffect, useMemo, useState } from 'react';
import { Network, List, Sparkles, Unlink } from 'lucide-react';
import { apiClient } from '../lib/apiClient';
import ConfirmDialog from './ui/ConfirmDialog';
import KnowledgeGraph from './KnowledgeGraph';
import KnowledgeNodeEditor, { type NodeDraft } from './KnowledgeNodeEditor';
import KnowledgeNodePanel from './KnowledgeNodePanel';
import { KIND_META, orphans, type EdgeKind, type FullNode, type GraphEdge, type GraphNode } from '../lib/knowledge';

export const NODE_XP = 12;
export const LINK_XP = 4;

interface Props {
  /** Search text from the Learning tab's global search box. */
  query: string;
  activeTags: string[];
  /** Reports every tag in the graph so the parent can render the tag cloud. */
  onTagsDiscovered?: (tags: string[]) => void;
  addXP: (amount: number, reason: string) => void;
  onChanged?: () => void;
}

export default function KnowledgeSection({ query, activeTags, onTagsDiscovered, addXP, onChanged }: Props) {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<FullNode | null>(null);
  const [mode, setMode] = useState<'graph' | 'list'>('graph');
  const [editing, setEditing] = useState<'new' | 'existing' | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const fetchGraph = useCallback(async () => {
    try {
      const data = (await apiClient.get('/api/knowledge')) as { nodes: GraphNode[]; edges: GraphEdge[] };
      setNodes(data.nodes ?? []);
      setEdges(data.edges ?? []);
    } catch { /* keep whatever we have */ }
    setLoaded(true);
  }, []);

  const fetchNode = useCallback(async (id: string) => {
    try { setSelected((await apiClient.get(`/api/knowledge/${id}`)) as FullNode); } catch { setSelected(null); }
  }, []);

  useEffect(() => { fetchGraph(); }, [fetchGraph]);
  useEffect(() => { if (selectedId) fetchNode(selectedId); else setSelected(null); }, [selectedId, fetchNode]);

  useEffect(() => {
    if (!onTagsDiscovered) return;
    const s = new Set<string>();
    for (const n of nodes) n.tags.forEach((t) => s.add(t));
    onTagsDiscovered([...s].sort());
  }, [nodes, onTagsDiscovered]);

  const q = query.trim().toLowerCase();
  const filtering = q !== '' || activeTags.length > 0;
  const matchIds = useMemo(() => {
    if (!filtering) return null;
    return new Set(
      nodes
        .filter((n) => (!q || n.title.toLowerCase().includes(q)) && activeTags.every((t) => n.tags.includes(t)))
        .map((n) => n.id),
    );
  }, [nodes, q, activeTags, filtering]);

  const visible = matchIds ? nodes.filter((n) => matchIds.has(n.id)) : nodes;
  const loose = useMemo(() => orphans(nodes, edges), [nodes, edges]);
  const knownTitles = useMemo(() => nodes.map((n) => n.title), [nodes]);

  function select(id: string) { setSelectedId(id); setEditing(null); }

  async function handleSave(draft: NodeDraft) {
    if (editing === 'existing' && selectedId) {
      setEditing(null);
      try {
        await apiClient.patch(`/api/knowledge/${selectedId}`, { body: draft });
      } catch { /* refetch below restores truth */ }
      await Promise.all([fetchGraph(), fetchNode(selectedId)]);
      onChanged?.();
      return;
    }
    setEditing(null);
    try {
      const created = (await apiClient.post('/api/knowledge', { body: draft })) as GraphNode;
      addXP(NODE_XP, 'Knowledge node');
      await fetchGraph();
      setSelectedId(created.id);
      onChanged?.();
    } catch { /* ignore */ }
  }

  async function handleDelete() {
    if (!selectedId) return;
    const id = selectedId;
    setConfirming(false);
    setSelectedId(null);
    setNodes((prev) => prev.filter((n) => n.id !== id));
    setEdges((prev) => prev.filter((e) => e.fromId !== id && e.toId !== id));
    try { await apiClient.delete(`/api/knowledge/${id}`); } catch { /* ignore */ }
    await fetchGraph();
    onChanged?.();
  }

  async function handleAddEdge(toId: string, kind: EdgeKind) {
    if (!selectedId) return;
    try {
      const edge = (await apiClient.post('/api/knowledge/edges', { body: { fromId: selectedId, toId, kind } })) as GraphEdge & { xpAwarded?: number };
      if (edge.xpAwarded) addXP(edge.xpAwarded, 'New connection');
      await Promise.all([fetchGraph(), fetchNode(selectedId)]);
    } catch { /* ignore */ }
  }

  async function handleRemoveEdge(edgeId: string) {
    setEdges((prev) => prev.filter((e) => e.id !== edgeId));
    try { await apiClient.delete(`/api/knowledge/edges/${edgeId}`); } catch { /* ignore */ }
    if (selectedId) await Promise.all([fetchGraph(), fetchNode(selectedId)]);
  }

  async function handleImport() {
    setImporting(true);
    try {
      const r = (await apiClient.post('/api/knowledge/import-legacy')) as { imported: number; linked: number };
      setImportResult(r.imported > 0
        ? `Imported ${r.imported} entries and seeded ${r.linked} connections.`
        : 'Everything is already in the graph.');
      await fetchGraph();
      onChanged?.();
    } catch {
      setImportResult('Import failed — try again.');
    }
    setImporting(false);
  }

  return (
    <section className="card arise-in" style={{ padding: 'var(--pad)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ fontSize: 17 }}>Knowledge Graph</h3>
          <p style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 3 }}>
            {nodes.length} nodes · {edges.length} connections{loose.length > 0 ? ` · ${loose.length} unconnected` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-ghost" style={{ padding: '6px 10px' }} aria-label={mode === 'graph' ? 'Show list' : 'Show graph'}
            onClick={() => setMode(mode === 'graph' ? 'list' : 'graph')}>
            {mode === 'graph' ? <List size={14} /> : <Network size={14} />}{mode === 'graph' ? 'List' : 'Graph'}
          </button>
          <button className="btn btn-ghost" onClick={() => { setEditing(editing === 'new' ? null : 'new'); setSelectedId(null); }}>
            {editing === 'new' ? 'Cancel' : '+ New Node'}
          </button>
        </div>
      </div>

      {/* One-time migration of the old notes / journal / lessons tables. */}
      {loaded && nodes.length === 0 && (
        <div style={{ background: 'var(--surface-inset)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r)', padding: 16, marginBottom: 14 }}>
          <p style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}><Sparkles size={14} color="var(--accent)" />Bring your notes, journal and lessons into the graph.</p>
          <p style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 5 }}>
            Nothing is deleted — each entry becomes a node, and entries sharing a tag get connected automatically.
          </p>
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={handleImport} disabled={importing}>
            {importing ? 'Importing…' : 'Import my notes'}
          </button>
          {importResult && <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 8 }}>{importResult}</p>}
        </div>
      )}

      {editing && (
        <div style={{ marginBottom: 14 }}>
          <KnowledgeNodeEditor
            node={editing === 'existing' ? selected : null}
            knownTitles={knownTitles}
            onSave={handleSave}
            onClose={() => setEditing(null)}
          />
        </div>
      )}

      {mode === 'graph' ? (
        <KnowledgeGraph nodes={nodes} edges={edges} selectedId={selectedId} matchIds={matchIds} onSelect={select} />
      ) : (
        <div style={{ display: 'grid', gap: 6 }}>
          {visible.length === 0 && <p style={{ fontSize: 13, color: 'var(--text-faint)' }}>No nodes match.</p>}
          {visible.map((n) => {
            const meta = KIND_META[n.kind] ?? KIND_META.note;
            const degree = edges.filter((e) => e.fromId === n.id || e.toId === n.id).length;
            return (
              <button
                key={n.id} onClick={() => select(n.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', background: n.id === selectedId ? 'var(--accent-soft)' : 'var(--surface-inset)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r-sm)', padding: '10px 12px', cursor: 'pointer', color: 'var(--text)' }}
              >
                <span style={{ width: 8, height: 8, borderRadius: 99, background: meta.color, flexShrink: 0 }} />
                <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</span>
                <span className="mono" style={{ fontSize: 11, color: degree === 0 ? 'var(--warn)' : 'var(--text-faint)', flexShrink: 0 }}>
                  {degree === 0 ? <Unlink size={11} /> : `${degree}`}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {selected && !editing && (
        <div style={{ marginTop: 14 }}>
          <KnowledgeNodePanel
            node={selected}
            allNodes={nodes}
            onSelect={select}
            onEdit={() => setEditing('existing')}
            onDelete={() => setConfirming(true)}
            onClose={() => setSelectedId(null)}
            onAddEdge={handleAddEdge}
            onRemoveEdge={handleRemoveEdge}
          />
        </div>
      )}

      {confirming && selected && (
        <ConfirmDialog
          message={`Delete "${selected.title}"? Its connections go with it. This cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setConfirming(false)}
        />
      )}
    </section>
  );
}
