import { useState } from 'react';
import { Pencil, X, Trash2, Link2, CornerUpLeft, Layers, HelpCircle, Check, Plus } from 'lucide-react';
import Markdown from './ui/Markdown';
import { KIND_META, EDGE_KINDS, EDGE_LABEL, type FullNode, type GraphNode, type EdgeKind } from '../lib/knowledge';

interface Props {
  node: FullNode;
  /** Every node in the graph, for the "link to…" picker. */
  allNodes: GraphNode[];
  onSelect: (id: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
  onAddEdge: (toId: string, kind: EdgeKind) => void;
  onRemoveEdge: (edgeId: string) => void;
}

function flashcardsPrompt(node: FullNode): string {
  return `Turn the note below into spaced-repetition flashcards. Output a numbered list of Q&A pairs — each a single, specific question and a concise answer. Cover every key fact, definition, and concept. Keep questions atomic (one idea each).\n\nNOTE: ${node.title}\n\n${node.content || ''}`;
}
function quizPrompt(node: FullNode): string {
  return `Quiz me on the note below to test my recall. Ask me 8 questions ONE AT A TIME (mix of recall, "why", and application). Wait for my answer before revealing the correct one, then grade it briefly and move on. At the end give me a score and the 2 weakest spots to review.\n\nNOTE: ${node.title}\n\n${node.content || ''}`;
}
function connectPrompt(node: FullNode): string {
  const neighbours = [...node.links, ...node.backlinks].map((l) => `- ${l.node.title}`).join('\n') || '- (nothing linked yet)';
  return `I keep a personal knowledge graph. Here is one node and everything it currently connects to. Suggest 5 non-obvious connections, questions, or contradictions worth exploring, and for each say which existing node it should link to (or that it needs a new node). Be concrete, no filler.\n\nNODE (${node.kind}): ${node.title}\n\n${node.content || ''}\n\nCURRENTLY LINKED TO:\n${neighbours}`;
}

function RefRow({ label, refs, onSelect, onRemove }: {
  label: string;
  refs: FullNode['links'];
  onSelect: (id: string) => void;
  onRemove: (edgeId: string) => void;
}) {
  if (refs.length === 0) return null;
  return (
    <div style={{ marginTop: 14 }}>
      <span className="eyebrow" style={{ fontSize: 10.5 }}>{label}</span>
      <div style={{ display: 'grid', gap: 5, marginTop: 7 }}>
        {refs.map((r) => {
          const meta = KIND_META[r.node.kind] ?? KIND_META.note;
          return (
            <div key={r.edgeId} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 7, height: 7, borderRadius: 99, background: meta.color, flexShrink: 0 }} />
              <button
                onClick={() => onSelect(r.node.id)}
                style={{ background: 'none', border: 'none', padding: 0, color: 'var(--text)', fontSize: 13, cursor: 'pointer', textAlign: 'left', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >{r.node.title}</button>
              <span style={{ fontSize: 10.5, color: 'var(--text-faint)', flexShrink: 0 }}>{EDGE_LABEL[r.kind]}</span>
              {!r.auto && (
                <button onClick={() => onRemove(r.edgeId)} aria-label={`Unlink ${r.node.title}`}
                  style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', display: 'flex', flexShrink: 0 }}><X size={12} /></button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function KnowledgeNodePanel({ node, allNodes, onSelect, onEdit, onDelete, onClose, onAddEdge, onRemoveEdge }: Props) {
  const [copied, setCopied] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);
  const [linkTarget, setLinkTarget] = useState('');
  const [linkKind, setLinkKind] = useState<EdgeKind>('relates');

  const meta = KIND_META[node.kind] ?? KIND_META.note;
  const connected = new Set([...node.links, ...node.backlinks].map((l) => l.node.id));
  const candidates = allNodes.filter((n) => n.id !== node.id && !connected.has(n.id));

  async function copy(kind: 'flashcards' | 'quiz' | 'connect') {
    const text = kind === 'flashcards' ? flashcardsPrompt(node) : kind === 'quiz' ? quizPrompt(node) : connectPrompt(node);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1800);
    } catch { /* clipboard blocked */ }
  }

  return (
    <div style={{ background: 'var(--surface-inset)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r)', padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <span className="chip" style={{ fontSize: 10.5, color: meta.color, borderColor: 'var(--line-soft)' }}>{meta.label}</span>
          <h3 style={{ fontSize: 19, marginTop: 8 }}>{node.title}</h3>
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button className="btn btn-ghost" onClick={onEdit} aria-label="Edit node" style={{ padding: '6px 8px' }}><Pencil size={14} /></button>
          <button className="btn btn-ghost" onClick={onDelete} aria-label="Delete node" style={{ padding: '6px 8px' }}><Trash2 size={14} /></button>
          <button className="btn btn-ghost" onClick={onClose} aria-label="Close node" style={{ padding: '6px 8px' }}><X size={15} /></button>
        </div>
      </div>

      {node.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
          {node.tags.map((t) => (
            <span key={t} className="chip" style={{ fontSize: 11, color: 'var(--accent-2)', borderColor: 'var(--accent-2-soft)' }}>{t}</span>
          ))}
        </div>
      )}

      {node.content.trim() !== '' && (
        <div style={{ borderTop: '1px solid var(--line-soft)', marginTop: 14, paddingTop: 14 }}>
          <Markdown text={node.content} />
        </div>
      )}

      <div style={{ borderTop: '1px solid var(--line-soft)', marginTop: 16, paddingTop: 4 }}>
        <RefRow label="Links out" refs={node.links} onSelect={onSelect} onRemove={onRemoveEdge} />
        <RefRow label="Backlinks" refs={node.backlinks} onSelect={onSelect} onRemove={onRemoveEdge} />
        {node.links.length === 0 && node.backlinks.length === 0 && (
          <p style={{ fontSize: 12.5, color: 'var(--text-faint)', marginTop: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <CornerUpLeft size={13} />Nothing connected yet — link it to something.
          </p>
        )}

        {linking ? (
          <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
            <select
              value={linkKind} onChange={(e) => setLinkKind(e.target.value as EdgeKind)} aria-label="Link type"
              style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r-sm)', padding: '7px 9px', fontSize: 12.5 }}
            >
              {EDGE_KINDS.map((k) => <option key={k} value={k}>{EDGE_LABEL[k]}</option>)}
            </select>
            <select
              value={linkTarget} onChange={(e) => setLinkTarget(e.target.value)} aria-label="Link to node"
              style={{ flex: 1, minWidth: 140, background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r-sm)', padding: '7px 9px', fontSize: 12.5 }}
            >
              <option value="">Choose a node…</option>
              {candidates.map((n) => <option key={n.id} value={n.id}>{n.title}</option>)}
            </select>
            <button
              className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 12.5 }} disabled={!linkTarget}
              onClick={() => { if (linkTarget) { onAddEdge(linkTarget, linkKind); setLinkTarget(''); setLinking(false); } }}
            >Link</button>
            <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 12.5 }} onClick={() => setLinking(false)}>Cancel</button>
          </div>
        ) : (
          <button className="btn btn-ghost" style={{ marginTop: 12, padding: '6px 10px', fontSize: 12.5 }} onClick={() => setLinking(true)} disabled={candidates.length === 0}>
            <Plus size={13} />Link to a node
          </button>
        )}
      </div>

      <div style={{ borderTop: '1px solid var(--line-soft)', marginTop: 16, paddingTop: 14, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => copy('flashcards')}>
          {copied === 'flashcards' ? <Check size={13} /> : <Layers size={13} />}{copied === 'flashcards' ? 'Copied' : 'Flashcard prompt'}
        </button>
        <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => copy('quiz')}>
          {copied === 'quiz' ? <Check size={13} /> : <HelpCircle size={13} />}{copied === 'quiz' ? 'Copied' : 'Quiz me'}
        </button>
        <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => copy('connect')}>
          {copied === 'connect' ? <Check size={13} /> : <Link2 size={13} />}{copied === 'connect' ? 'Copied' : 'Find connections'}
        </button>
      </div>
    </div>
  );
}
