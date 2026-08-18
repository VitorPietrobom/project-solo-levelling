import { useState } from 'react';
import type { Task } from './TaskList';
import type { Skill } from './SkillList';

interface TaskFormProps {
  onCreated: (optimistic: Task, body: { title: string; recurrence: string; xpReward: number; linkedSkillId?: string }) => void;
  skills?: Skill[];
}

export default function TaskForm({ onCreated, skills = [] }: TaskFormProps) {
  const [title, setTitle] = useState('');
  const [recurrence, setRecurrence] = useState<'daily' | 'weekly'>('daily');
  const [xpReward, setXpReward] = useState(25);
  const [linkedSkillId, setLinkedSkillId] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    const optimistic: Task = {
      id: `temp-${Date.now()}`,
      title: title.trim(),
      recurrence,
      xpReward,
      completedToday: false,
      lastCompletedAt: null,
      linkedSkillId: linkedSkillId || null,
    };

    onCreated(optimistic, {
      title: optimistic.title,
      recurrence,
      xpReward,
      ...(linkedSkillId ? { linkedSkillId } : {}),
    });

    setTitle('');
    setRecurrence('daily');
    setXpReward(25);
    setLinkedSkillId('');
  }

  const inputStyle: React.CSSProperties = {
    background: 'var(--surface-inset)', color: 'var(--text)', border: '1px solid var(--line-soft)',
    borderRadius: 'var(--r-sm)', padding: '9px 11px', fontSize: 13.5, outline: 'none',
  };

  return (
    <form onSubmit={handleSubmit} style={{ background: 'var(--surface-inset)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r)', padding: 16, display: 'grid', gap: 12 }}>
      <span className="eyebrow">New task</span>
      {error && <p style={{ fontSize: 12.5, color: 'var(--bad)' }}>{error}</p>}
      <input
        type="text" placeholder="Task title" value={title} onChange={(e) => setTitle(e.target.value)}
        style={{ ...inputStyle, width: '100%' }} aria-label="Task title"
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <label style={{ fontSize: 13, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}>
          <input type="radio" name="recurrence" value="daily" checked={recurrence === 'daily'} onChange={() => setRecurrence('daily')} style={{ accentColor: 'var(--accent)' }} />
          Daily
        </label>
        <label style={{ fontSize: 13, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}>
          <input type="radio" name="recurrence" value="weekly" checked={recurrence === 'weekly'} onChange={() => setRecurrence('weekly')} style={{ accentColor: 'var(--accent)' }} />
          Weekly
        </label>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
        <label style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
          XP reward
          <input
            id="task-xp-reward" type="number" min={0} value={xpReward}
            onChange={(e) => setXpReward(Number(e.target.value))}
            style={{ ...inputStyle, display: 'block', marginTop: 6, width: 90 }}
          />
        </label>
        {skills.length > 0 && (
          <label htmlFor="task-skill" style={{ fontSize: 11.5, color: 'var(--text-3)', flex: 1, minWidth: 160 }}>
            Link to skill
            <select
              id="task-skill" value={linkedSkillId} onChange={(e) => setLinkedSkillId(e.target.value)}
              style={{ ...inputStyle, display: 'block', marginTop: 6, width: '100%' }}
            >
              <option value="">None</option>
              {skills.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>
        )}
      </div>
      <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center' }}>
        Create Task
      </button>
    </form>
  );
}
