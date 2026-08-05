import { useState } from 'react';
import { X } from 'lucide-react';
import { KNOWLEDGE_KINDS, KIND_META, parseWikiLinks, type FullNode, type KnowledgeKind } from '../lib/knowledge';

export interface NodeDraft {
  kind: KnowledgeKind;
  title: string;
  content: string;
  tags: string[];
}

interface Props {
  node?: FullNode | null;
  /** Titles already in the graph, used to flag dangling [[links]] while typing. */
  knownTitles?: string[];
  onSave: (draft: NodeDraft) => void;
  onClose: () => void;
}

export default function KnowledgeNodeEditor({ node, knownTitles = [], onSave, onClose }: Props) {
  const [kind, setKind] = useState<KnowledgeKind>(node?.kind ?? 'note');
  const [title, setTitle] = useState(node?.title ?? '');
  const [content, setContent] = useState(node?.content ?? '');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(node?.tags ?? []);

  const known = new Set(knownTitles.map((t) => t.toLowerCase()));
  const mentioned = parseWikiLinks(content);
  const dangling = mentioned.filter((t) => !known.has(t.toLowerCase()) && t.toLowerCase() !== title.trim().toLowerCase());

  function addTag() {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput('');
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim() === '') return;
    onSave({ kind, title: title.trim(), content, tags });
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--surface-inset)', color: 'var(--text)',
    border: '1px solid var(--line-soft)', borderRadius: 'var(--r-sm)',
    padding: '9px 11px', fontSize: 14, outline: 'none',
  };

  return (
    <form onSubmit={submit} style={{ background: 'var(--surface-inset)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r)', padding: 16, display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="eyebrow">{node ? 'Edit node' : 'New node'}</span>
        <button type="button" onClick={onClose} aria-label="Close editor" style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', display: 'flex' }}><X size={16} /></button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }} role="radiogroup" aria-label="Node type">
        {KNOWLEDGE_KINDS.map((k) => {
          const meta = KIND_META[k];
          const on = kind === k;
          return (
            <button
              key={k} type="button" role="radio" aria-checked={on} onClick={() => setKind(k)}
              style={{
                fontSize: 11.5, fontWeight: 600, padding: '5px 11px', borderRadius: 99, cursor: 'pointer',
                background: on ? 'var(--surface)' : 'transparent',
                border: `1px solid ${on ? meta.color : 'var(--line-soft)'}`,
                color: on ? meta.color : 'var(--text-3)',
              }}
            >{meta.label}</button>
          );
        })}
      </div>

      <input
        type="text" value={title} onChange={(e) => setTitle(e.target.value)}
        placeholder="Title" aria-label="Node title" style={inputStyle}
      />

      <div>
        <textarea
          value={content} onChange={(e) => setContent(e.target.value)} rows={8}
          placeholder="Write in markdown. Type [[Another node]] to link it." aria-label="Node content"
          style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }}
        />
        <p style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 5 }}>
          Markdown supported · <code>[[Title]]</code> links to another node
        </p>
        {dangling.length > 0 && (
          <p style={{ fontSize: 11.5, color: 'var(--warn)', marginTop: 4 }}>
            New nodes will be suggested for: {dangling.join(', ')}
          </p>
        )}
      </div>

      <div>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
            placeholder="Add tag" aria-label="Add tag" style={inputStyle}
          />
          <button type="button" className="btn btn-ghost" onClick={addTag}>Add</button>
        </div>
        {tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {tags.map((t) => (
              <button
                key={t} type="button" onClick={() => setTags(tags.filter((x) => x !== t))}
                aria-label={`Remove tag ${t}`} className="chip"
                style={{ fontSize: 11, color: 'var(--accent-2)', borderColor: 'var(--accent-2-soft)', cursor: 'pointer' }}
              >{t} ×</button>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" className="btn btn-primary" disabled={title.trim() === ''}>{node ? 'Save' : 'Create node'}</button>
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
      </div>
    </form>
  );
}
