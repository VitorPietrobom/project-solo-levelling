import { useState } from 'react';
import { X, Flag, Repeat } from 'lucide-react';
import type { Quest, QuestPriority, QuestRecurrence } from './QuestList';
import type { Skill } from './SkillList';

export interface QuestCreateBody {
  title: string;
  xpReward: number;
  priority: QuestPriority;
  dueDate: string | null;
  linkedSkillId: string | null;
  recurrence: QuestRecurrence | null;
  description?: string;
  steps?: string[];
}

interface QuestFormProps {
  onCreated: (optimistic: Quest, body: QuestCreateBody) => void;
  skills?: Skill[];
}

const PRIORITIES: { value: QuestPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'var(--text-faint)' },
  { value: 'medium', label: 'Medium', color: 'var(--accent)' },
  { value: 'high', label: 'High', color: 'var(--bad)' },
];

const RECURRENCES: { value: QuestRecurrence | null; label: string }[] = [
  { value: null, label: 'One-time' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
];

export default function QuestForm({ onCreated, skills = [] }: QuestFormProps) {
  const [title, setTitle] = useState('');
  const [recurrence, setRecurrence] = useState<QuestRecurrence | null>(null);
  const [description, setDescription] = useState('');
  const [xpReward, setXpReward] = useState(50);
  const [priority, setPriority] = useState<QuestPriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [linkedSkillId, setLinkedSkillId] = useState('');
  const [steps, setSteps] = useState<string[]>(['']);
  const [error, setError] = useState<string | null>(null);

  const isRecurring = recurrence !== null;

  function addStep() {
    setSteps([...steps, '']);
  }

  function removeStep(index: number) {
    setSteps(steps.filter((_, i) => i !== index));
  }

  function updateStep(index: number, value: string) {
    const updated = [...steps];
    updated[index] = value;
    setSteps(updated);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    const validSteps = steps.filter((s) => s.trim() !== '');
    if (!isRecurring && (!description.trim() || validSteps.length === 0)) {
      setError('One-time quests need a description and at least one step');
      return;
    }

    const optimistic: Quest = {
      id: `temp-${Date.now()}`,
      title: title.trim(),
      description: isRecurring ? null : description.trim(),
      xpReward,
      priority,
      dueDate: dueDate || null,
      linkedSkillId: linkedSkillId || null,
      recurrence,
      completed: false,
      steps: isRecurring
        ? []
        : validSteps.map((desc, i) => ({ id: `temp-step-${i}`, description: desc, sortOrder: i, completed: false })),
    };

    onCreated(optimistic, {
      title: title.trim(),
      xpReward,
      priority,
      dueDate: dueDate || null,
      linkedSkillId: linkedSkillId || null,
      recurrence,
      ...(isRecurring ? {} : { description: description.trim(), steps: validSteps }),
    });

    setTitle('');
    setRecurrence(null);
    setDescription('');
    setXpReward(50);
    setPriority('medium');
    setDueDate('');
    setLinkedSkillId('');
    setSteps(['']);
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--surface-inset)', color: 'var(--text)',
    border: '1px solid var(--line-soft)', borderRadius: 'var(--r-sm)',
    padding: '9px 11px', fontSize: 13.5, outline: 'none',
  };

  return (
    <form onSubmit={handleSubmit} style={{ background: 'var(--surface-inset)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r)', padding: 16, display: 'grid', gap: 12 }}>
      <span className="eyebrow">New quest</span>
      {error && <p style={{ fontSize: 12.5, color: 'var(--bad)' }}>{error}</p>}

      <input
        type="text" placeholder="Quest title" value={title} onChange={(e) => setTitle(e.target.value)}
        style={inputStyle} aria-label="Quest title"
      />

      <div>
        <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Repeat size={11} />Repeats
        </div>
        <div style={{ display: 'flex', gap: 5 }} role="radiogroup" aria-label="Repeats">
          {RECURRENCES.map((r) => {
            const on = recurrence === r.value;
            return (
              <button
                key={r.label} type="button" role="radio" aria-checked={on}
                onClick={() => setRecurrence(r.value)}
                style={{
                  fontSize: 11.5, fontWeight: 600, padding: '6px 11px', borderRadius: 99, cursor: 'pointer',
                  background: on ? 'var(--surface)' : 'transparent',
                  border: `1px solid ${on ? 'var(--accent-2)' : 'var(--line-soft)'}`,
                  color: on ? 'var(--accent-2)' : 'var(--text-3)',
                }}
              >{r.label}</button>
            );
          })}
        </div>
        <p style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 6 }}>
          {isRecurring ? 'A habit — a simple toggle that resets each period.' : 'A one-time goal, optionally broken into steps.'}
        </p>
      </div>

      {!isRecurring && (
        <>
          <textarea
            placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)}
            rows={2} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} aria-label="Quest description"
          />
          <div>
            <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginBottom: 8 }}>Steps</div>
            <div style={{ display: 'grid', gap: 6 }}>
              {steps.map((step, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--text-faint)', width: 16, textAlign: 'right', flexShrink: 0 }}>{i + 1}</span>
                  <input
                    type="text" placeholder={`Step ${i + 1}`} value={step}
                    onChange={(e) => updateStep(i, e.target.value)}
                    style={{ ...inputStyle, flex: 1 }} aria-label={`Step ${i + 1}`}
                  />
                  {steps.length > 1 && (
                    <button
                      type="button" onClick={() => removeStep(i)} aria-label={`Remove step ${i + 1}`}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', display: 'flex', flexShrink: 0 }}
                    ><X size={14} /></button>
                  )}
                </div>
              ))}
            </div>
            <button type="button" onClick={addStep} className="btn btn-ghost" style={{ marginTop: 8, padding: '5px 10px', fontSize: 12 }}>
              + Add step
            </button>
          </div>
        </>
      )}

      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
        {!isRecurring && (
          <div>
            <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Flag size={11} />Priority
            </div>
            <div style={{ display: 'flex', gap: 5 }} role="radiogroup" aria-label="Priority">
              {PRIORITIES.map((p) => {
                const on = priority === p.value;
                return (
                  <button
                    key={p.value} type="button" role="radio" aria-checked={on}
                    onClick={() => setPriority(p.value)}
                    style={{
                      fontSize: 11.5, fontWeight: 600, padding: '6px 11px', borderRadius: 99, cursor: 'pointer',
                      background: on ? 'var(--surface)' : 'transparent',
                      border: `1px solid ${on ? p.color : 'var(--line-soft)'}`,
                      color: on ? p.color : 'var(--text-3)',
                    }}
                  >{p.label}</button>
                );
              })}
            </div>
          </div>
        )}

        {!isRecurring && (
          <label style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
            Due date <span style={{ color: 'var(--text-faint)' }}>(optional)</span>
            <input
              type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
              style={{ display: 'block', marginTop: 6, background: 'var(--surface-inset)', color: 'var(--text)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r-sm)', padding: '7px 9px', fontSize: 13 }}
            />
          </label>
        )}

        <label style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
          XP reward
          <input
            id="xp-reward" type="number" min={0} value={xpReward}
            onChange={(e) => setXpReward(Number(e.target.value))}
            style={{ display: 'block', marginTop: 6, width: 90, background: 'var(--surface-inset)', color: 'var(--text)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r-sm)', padding: '7px 9px', fontSize: 13 }}
          />
        </label>

        {skills.length > 0 && (
          <label htmlFor="quest-skill" style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
            Link to skill <span style={{ color: 'var(--text-faint)' }}>(optional)</span>
            <select
              id="quest-skill" value={linkedSkillId} onChange={(e) => setLinkedSkillId(e.target.value)}
              style={{ display: 'block', marginTop: 6, background: 'var(--surface-inset)', color: 'var(--text)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r-sm)', padding: '7px 9px', fontSize: 13, minWidth: 140 }}
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
        {isRecurring ? 'Create Habit' : 'Create Quest'}
      </button>
    </form>
  );
}
