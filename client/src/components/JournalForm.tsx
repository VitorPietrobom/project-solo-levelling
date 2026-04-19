import { useState } from 'react';
import type { JournalEntry } from './JournalList';

export interface Skill {
  id: string;
  name: string;
}

interface JournalFormProps {
  skills: Skill[];
  onCreated: (optimistic: JournalEntry, body: { content: string; tags: string[]; linkedSkillId?: string; date: string }) => void;
}

export default function JournalForm({ skills, onCreated }: JournalFormProps) {
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [linkedSkillId, setLinkedSkillId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || !date) return;

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const optimistic: JournalEntry = {
      id: `temp-${Date.now()}`,
      content: content.trim(),
      tags,
      linkedSkillId: linkedSkillId || null,
      date,
    };

    const body: any = { content: content.trim(), tags, date };
    if (linkedSkillId) body.linkedSkillId = linkedSkillId;

    onCreated(optimistic, body);
    setContent('');
    setTagsInput('');
    setLinkedSkillId('');
  }

  return (
    <form onSubmit={handleSubmit} className="bg-card rounded-lg p-4 border border-border space-y-3">
      <div>
        <label htmlFor="journal-content" className="text-text-secondary text-xs block mb-1">What did you learn?</label>
        <textarea
          id="journal-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-text-primary min-h-[80px] resize-y focus:outline-none focus:border-accent-primary"
          required
        />
      </div>
      <div>
        <label htmlFor="journal-tags" className="text-text-secondary text-xs block mb-1">Tags (comma-separated)</label>
        <input
          id="journal-tags"
          type="text"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="react, hooks, state"
          className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-primary"
        />
      </div>
      <div>
        <label htmlFor="journal-date" className="text-text-secondary text-xs block mb-1">Date</label>
        <input
          id="journal-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-primary"
          required
        />
      </div>
      {skills.length > 0 && (
        <div>
          <label htmlFor="journal-skill" className="text-text-secondary text-xs block mb-1">Link to Skill (optional)</label>
          <select
            id="journal-skill"
            value={linkedSkillId}
            onChange={(e) => setLinkedSkillId(e.target.value)}
            className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-primary"
          >
            <option value="">None</option>
            {skills.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      )}
      <button
        type="submit"
        className="bg-accent-primary text-primary px-4 py-2 rounded text-sm font-semibold hover:opacity-90"
      >
        Add Entry
      </button>
    </form>
  );
}
