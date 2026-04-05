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

export default function LessonForm({ skills, onCreated }: LessonFormProps) {
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

    const optimistic: Lesson = {
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
        <label htmlFor="lesson-content" className="text-text-secondary text-xs block mb-1">Lesson learned</label>
        <input
          id="lesson-content"
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What did you learn?"
          className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-text-primary"
          required
        />
      </div>
      <div>
        <label htmlFor="lesson-tags" className="text-text-secondary text-xs block mb-1">Tags (comma-separated)</label>
        <input
          id="lesson-tags"
          type="text"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="debugging, testing, architecture"
          className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-text-primary"
        />
      </div>
      <div>
        <label htmlFor="lesson-date" className="text-text-secondary text-xs block mb-1">Date</label>
        <input
          id="lesson-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-text-primary"
          required
        />
      </div>
      {skills.length > 0 && (
        <div>
          <label htmlFor="lesson-skill" className="text-text-secondary text-xs block mb-1">Link to Skill (optional)</label>
          <select
            id="lesson-skill"
            value={linkedSkillId}
            onChange={(e) => setLinkedSkillId(e.target.value)}
            className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-text-primary"
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
        Add Lesson
      </button>
    </form>
  );
}
