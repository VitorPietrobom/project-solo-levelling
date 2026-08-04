import { useState } from 'react';
import type { Lesson } from './LessonsList';

export interface Skill {
  id: string;
  name: string;
}

interface LessonFormProps {
  skills: Skill[];
  onCreated: (optimistic: Lesson, body: { content: string; tags: string[]; linkedSkillId?: string; date: string }) => void;
}

const field: React.CSSProperties = {
  width: '100%', background: 'var(--surface)', color: 'var(--text)',
  border: '1px solid var(--line-soft)', borderRadius: 'var(--r-sm)',
  padding: '9px 12px', fontSize: 14, outline: 'none',
};
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 11.5, color: 'var(--text-3)', marginBottom: 5, letterSpacing: '0.02em' };

export default function LessonForm({ skills, onCreated }: LessonFormProps) {
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [linkedSkillId, setLinkedSkillId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) { setError('Describe the lesson first'); return; }
    const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);
    const optimistic: Lesson = { id: `temp-${Date.now()}`, content: content.trim(), tags, linkedSkillId: linkedSkillId || null, date };
    const body: any = { content: content.trim(), tags, date };
    if (linkedSkillId) body.linkedSkillId = linkedSkillId;
    onCreated(optimistic, body);
    setContent(''); setTagsInput(''); setLinkedSkillId(''); setError(null);
  }

  return (
    <form onSubmit={handleSubmit} style={{ background: 'var(--surface-inset)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r)', padding: 16, display: 'grid', gap: 12 }}>
      {error && <p style={{ color: 'var(--warn)', fontSize: 13 }}>{error}</p>}
      <div>
        <label style={labelStyle}>Lesson learned</label>
        <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="What did you learn — and why does it matter?" aria-label="Lesson learned" style={{ ...field, minHeight: 80, resize: 'vertical', lineHeight: 1.5 }} />
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 180px' }}>
          <label style={labelStyle}>Tags (comma-separated)</label>
          <input type="text" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="debugging, architecture" aria-label="Tags (comma-separated)" style={field} />
        </div>
        <div style={{ flex: '0 1 150px' }}>
          <label style={labelStyle}>Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Date" style={field} />
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
      <button type="submit" className="btn btn-primary" style={{ justifySelf: 'start' }}>Add Lesson</button>
    </form>
  );
}
