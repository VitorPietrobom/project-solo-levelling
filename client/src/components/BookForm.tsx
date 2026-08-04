import { useState } from 'react';
import type { Book } from './BookList';

export interface Skill {
  id: string;
  name: string;
}

interface BookFormProps {
  skills: Skill[];
  onCreated: (optimistic: Book, body: { title: string; author: string; totalPages: number; linkedSkillId?: string }) => void;
}

const field: React.CSSProperties = {
  width: '100%', background: 'var(--surface)', color: 'var(--text)',
  border: '1px solid var(--line-soft)', borderRadius: 'var(--r-sm)',
  padding: '9px 12px', fontSize: 14, outline: 'none',
};
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 11.5, color: 'var(--text-3)', marginBottom: 5, letterSpacing: '0.02em' };

export default function BookForm({ skills, onCreated }: BookFormProps) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [totalPages, setTotalPages] = useState('');
  const [linkedSkillId, setLinkedSkillId] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const pages = parseInt(totalPages, 10);
    if (!title.trim()) { setError('Title is required'); return; }
    if (!author.trim()) { setError('Author is required'); return; }
    if (isNaN(pages) || pages <= 0) { setError('Total pages must be a positive number'); return; }

    const optimistic: Book = {
      id: `temp-${Date.now()}`, title: title.trim(), author: author.trim(),
      status: 'want_to_read', totalPages: pages, currentPage: 0,
      notes: null, linkedSkillId: linkedSkillId || null, startedAt: null, finishedAt: null,
    };
    const body: any = { title: title.trim(), author: author.trim(), totalPages: pages };
    if (linkedSkillId) body.linkedSkillId = linkedSkillId;
    onCreated(optimistic, body);
    setTitle(''); setAuthor(''); setTotalPages(''); setLinkedSkillId(''); setError(null);
  }

  return (
    <form onSubmit={handleSubmit} style={{ background: 'var(--surface-inset)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r)', padding: 16, display: 'grid', gap: 12 }}>
      {error && <p style={{ color: 'var(--warn)', fontSize: 13 }}>{error}</p>}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 200px' }}>
          <label style={labelStyle}>Title</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Title" style={field} />
        </div>
        <div style={{ flex: '1 1 160px' }}>
          <label style={labelStyle}>Author</label>
          <input type="text" value={author} onChange={(e) => setAuthor(e.target.value)} aria-label="Author" style={field} />
        </div>
        <div style={{ flex: '0 1 120px' }}>
          <label style={labelStyle}>Total pages</label>
          <input type="number" min={1} value={totalPages} onChange={(e) => setTotalPages(e.target.value)} aria-label="Total Pages" style={field} />
        </div>
      </div>
      {skills.length > 0 && (
        <div>
          <label style={labelStyle}>Link to skill (optional)</label>
          <select value={linkedSkillId} onChange={(e) => setLinkedSkillId(e.target.value)} aria-label="Link to Skill (optional)" style={field}>
            <option value="">None</option>
            {skills.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      )}
      <button type="submit" className="btn btn-primary" style={{ justifySelf: 'start' }}>Add Book</button>
    </form>
  );
}
