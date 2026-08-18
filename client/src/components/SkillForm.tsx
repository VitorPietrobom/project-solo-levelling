import { useState } from 'react';
import type { Skill } from './SkillList';

interface SkillFormProps {
  onCreated: (optimistic: Skill, body: { name: string }) => void;
}

export default function SkillForm({ onCreated }: SkillFormProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Skill name is required');
      return;
    }

    const optimistic: Skill = {
      id: `temp-${Date.now()}`,
      name: name.trim(),
      totalXP: 0,
      level: 0,
      progress: { current: 0, required: 100, percentage: 0 },
    };

    onCreated(optimistic, { name: optimistic.name });
    setName('');
  }

  return (
    <form onSubmit={handleSubmit} style={{ background: 'var(--surface-inset)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r)', padding: 16, display: 'grid', gap: 12 }}>
      <span className="eyebrow">New skill</span>
      {error && <p style={{ fontSize: 12.5, color: 'var(--bad)' }}>{error}</p>}
      <input
        type="text"
        placeholder="Skill name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{ width: '100%', background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r-sm)', padding: '9px 11px', fontSize: 13.5, outline: 'none' }}
        aria-label="Skill name"
      />
      <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center' }}>
        Create Skill
      </button>
    </form>
  );
}
