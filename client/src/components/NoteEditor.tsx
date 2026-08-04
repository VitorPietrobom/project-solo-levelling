import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Note } from './NoteList';
import Markdown from './ui/Markdown';

interface NoteEditorProps {
  note: Note | null;
  onSave: (body: { title: string; content: string; tags: string[] }) => void;
  onClose: () => void;
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--surface)', color: 'var(--text)',
  border: '1px solid var(--line-soft)', borderRadius: 'var(--r-sm)',
  padding: '9px 12px', fontSize: 14, outline: 'none',
};

export default function NoteEditor({ note, onSave, onClose }: NoteEditorProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [tab, setTab] = useState<'write' | 'preview'>('write');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTitle(note?.title ?? '');
    setContent(note?.content ?? '');
    setTagsInput(note?.tags.join(', ') ?? '');
    setTab('write');
  }, [note]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError('Title is required'); return; }
    const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);
    onSave({ title: title.trim(), content, tags });
  }

  return (
    <form onSubmit={handleSubmit} style={{ background: 'var(--surface-inset)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r)', padding: 18, display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ fontSize: 16 }}>{note ? 'Edit Note' : 'New Note'}</h3>
        <button type="button" className="btn btn-ghost" onClick={onClose} aria-label="Close editor" style={{ padding: '6px 8px' }}><X size={16} /></button>
      </div>

      {error && <p style={{ color: 'var(--warn)', fontSize: 13 }}>{error}</p>}

      <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" aria-label="Title" style={inputStyle} />

      {/* Write / Preview tabs */}
      <div>
        <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
          {(['write', 'preview'] as const).map((t) => (
            <button
              key={t} type="button" onClick={() => setTab(t)}
              style={{
                padding: '5px 14px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                borderRadius: 'var(--r-sm)', textTransform: 'capitalize',
                border: `1px solid ${tab === t ? 'var(--line-soft)' : 'transparent'}`,
                background: tab === t ? 'var(--surface-hi)' : 'transparent',
                color: tab === t ? 'var(--text)' : 'var(--text-3)',
              }}
            >{t}</button>
          ))}
          <span style={{ marginLeft: 'auto', alignSelf: 'center', fontSize: 11, color: 'var(--text-faint)' }}>Markdown supported</span>
        </div>
        {tab === 'write' ? (
          <textarea
            value={content} onChange={(e) => setContent(e.target.value)} aria-label="Content (markdown)"
            placeholder={'# Heading\n\nWrite in **markdown** — lists, `code`, > quotes, [links](https://…)'}
            style={{ ...inputStyle, minHeight: 200, resize: 'vertical', fontFamily: 'var(--font-mono)', fontSize: 13, lineHeight: 1.5 }}
          />
        ) : (
          <div style={{ ...inputStyle, minHeight: 200, cursor: 'default' }}>
            <Markdown text={content} />
          </div>
        )}
      </div>

      <input type="text" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="Tags (comma-separated) — e.g. react, hooks" aria-label="Tags (comma-separated)" style={inputStyle} />

      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" className="btn btn-primary">{note ? 'Save Changes' : 'Create Note'}</button>
        <button type="button" className="btn" onClick={onClose}>Cancel</button>
      </div>
    </form>
  );
}
