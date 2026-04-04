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
    <form onSubmit={handleSubmit} className="bg-card rounded-lg p-4 border border-border space-y-3">
      <h3 className="text-text-primary font-semibold">New Skill</h3>
      {error && <p className="text-accent-warning text-sm">{error}</p>}
      <input
        type="text"
        placeholder="Skill name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full bg-secondary text-text-primary border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-accent-primary"
        aria-label="Skill name"
      />
      <button
        type="submit"
        className="w-full bg-accent-primary text-primary font-semibold py-2 rounded hover:opacity-90 transition-opacity"
      >
        Create Skill
      </button>
    </form>
  );
}
