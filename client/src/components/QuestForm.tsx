import { useState } from 'react';
import { X, Flag } from 'lucide-react';
import type { Quest, QuestPriority } from './QuestList';

interface QuestFormProps {
  onCreated: (
    optimistic: Quest,
    validSteps: string[],
    xpReward: number,
    priority: QuestPriority,
    dueDate: string | null,
  ) => void;
}

const PRIORITIES: { value: QuestPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'var(--text-faint)' },
  { value: 'medium', label: 'Medium', color: 'var(--accent)' },
  { value: 'high', label: 'High', color: 'var(--bad)' },
];

export default function QuestForm({ onCreated }: QuestFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [xpReward, setXpReward] = useState(50);
  const [priority, setPriority] = useState<QuestPriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [steps, setSteps] = useState<string[]>(['']);
  const [error, setError] = useState<string | null>(null);

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

    const validSteps = steps.filter((s) => s.trim() !== '');
    if (!title.trim() || !description.trim() || validSteps.length === 0) {
      setError('Title, description, and at least one step are required');
      return;
    }

    const optimistic: Quest = {
      id: `temp-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      xpReward,
      priority,
      dueDate: dueDate || null,
      completed: false,
      steps: validSteps.map((desc, i) => ({
        id: `temp-step-${i}`,
        description: desc,
        sortOrder: i,
        completed: false,
      })),
    };

    onCreated(optimistic, validSteps, xpReward, priority, dueDate || null);
    setTitle('');
    setDescription('');
    setXpReward(50);
    setPriority('medium');
    setDueDate('');
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
      <textarea
        placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)}
        rows={2} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} aria-label="Quest description"
      />

      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
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

        <label style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
          Due date <span style={{ color: 'var(--text-faint)' }}>(optional)</span>
          <input
            type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
            style={{ display: 'block', marginTop: 6, background: 'var(--surface-inset)', color: 'var(--text)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r-sm)', padding: '7px 9px', fontSize: 13 }}
          />
        </label>

        <label style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
          XP reward
          <input
            id="xp-reward" type="number" min={0} value={xpReward}
            onChange={(e) => setXpReward(Number(e.target.value))}
            style={{ display: 'block', marginTop: 6, width: 90, background: 'var(--surface-inset)', color: 'var(--text)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r-sm)', padding: '7px 9px', fontSize: 13 }}
          />
        </label>
      </div>

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

      <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center' }}>
        Create Quest
      </button>
    </form>
  );
}
