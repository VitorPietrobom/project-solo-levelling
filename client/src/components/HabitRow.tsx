import { useState } from 'react';
import { Check, Pencil, X } from 'lucide-react';
import type { Quest, QuestRecurrence } from './QuestList';
import type { Skill } from './SkillList';

export interface HabitPatch {
  title: string;
  xpReward: number;
  recurrence: QuestRecurrence;
  linkedSkillId: string | null;
}

interface Props {
  habit: Quest;
  skills: Skill[];
  onToggle: (id: string, completed: boolean) => void;
  onSave: (id: string, patch: HabitPatch) => void;
  onDelete: (id: string, title: string) => void;
}

export default function HabitRow({ habit, skills, onToggle, onSave, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(habit.title);
  const [xpReward, setXpReward] = useState(habit.xpReward);
  const [recurrence, setRecurrence] = useState<QuestRecurrence>(habit.recurrence ?? 'daily');
  const [linkedSkillId, setLinkedSkillId] = useState(habit.linkedSkillId ?? '');

  const linkedSkill = habit.linkedSkillId ? skills.find((s) => s.id === habit.linkedSkillId) : null;

  function startEdit() {
    setTitle(habit.title);
    setXpReward(habit.xpReward);
    setRecurrence(habit.recurrence ?? 'daily');
    setLinkedSkillId(habit.linkedSkillId ?? '');
    setEditing(true);
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onSave(habit.id, { title: title.trim(), xpReward, recurrence, linkedSkillId: linkedSkillId || null });
    setEditing(false);
  }

  const inputStyle: React.CSSProperties = {
    background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--line-soft)',
    borderRadius: 'var(--r-sm)', padding: '7px 9px', fontSize: 13, outline: 'none',
  };

  if (editing) {
    return (
      <form onSubmit={save} style={{ background: 'var(--surface-inset)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r-sm)', padding: 12, display: 'grid', gap: 8 }}>
        <input
          type="text" value={title} onChange={(e) => setTitle(e.target.value)}
          aria-label="Habit title" style={{ ...inputStyle, width: '100%' }}
        />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={recurrence} onChange={(e) => setRecurrence(e.target.value as QuestRecurrence)} aria-label="Recurrence" style={inputStyle}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
          <input
            type="number" min={0} value={xpReward} onChange={(e) => setXpReward(Number(e.target.value))}
            aria-label="XP reward" style={{ ...inputStyle, width: 70 }}
          />
          {skills.length > 0 && (
            <select value={linkedSkillId} onChange={(e) => setLinkedSkillId(e.target.value)} aria-label="Linked skill" style={{ ...inputStyle, flex: 1, minWidth: 100 }}>
              <option value="">No linked skill</option>
              {skills.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" className="btn btn-primary" style={{ padding: '5px 12px', fontSize: 12.5 }}>Save</button>
          <button type="button" className="btn btn-ghost" style={{ padding: '5px 12px', fontSize: 12.5 }} onClick={() => setEditing(false)}>Cancel</button>
        </div>
      </form>
    );
  }

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, boxSizing: 'border-box',
        padding: '11px 14px', borderRadius: 'var(--r-sm)', border: '1px solid var(--line-soft)',
        background: habit.completed ? 'var(--accent-soft)' : 'var(--surface-inset)',
      }}
    >
      <button
        onClick={() => onToggle(habit.id, !habit.completed)}
        title={habit.completed ? 'Click to undo' : 'Mark complete'}
        style={{
          display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0,
          background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', padding: 0,
        }}
      >
        <span
          style={{
            width: 22, height: 22, borderRadius: 7, flexShrink: 0,
            border: `2px solid ${habit.completed ? 'var(--accent)' : 'var(--line)'}`,
            background: habit.completed ? 'var(--accent)' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--bg-0)',
          }}
        >
          {habit.completed && <Check size={13} strokeWidth={3} />}
        </span>
        <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 500, color: habit.completed ? 'var(--text-3)' : 'var(--text)', textDecoration: habit.completed ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {habit.title}
          {linkedSkill && <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--accent-2)', opacity: 0.8 }}>· {linkedSkill.name}</span>}
        </span>
      </button>
      <span className="mono" style={{ fontSize: 12, color: habit.completed ? 'var(--text-faint)' : 'var(--accent)', flexShrink: 0 }}>
        +{habit.xpReward}
      </span>
      <button
        onClick={startEdit}
        aria-label={`Edit habit "${habit.title}"`}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', display: 'flex', flexShrink: 0, padding: 2 }}
      ><Pencil size={13} /></button>
      <button
        onClick={() => onDelete(habit.id, habit.title)}
        aria-label={`Delete habit "${habit.title}"`}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', display: 'flex', flexShrink: 0, padding: 2 }}
      ><X size={13} /></button>
    </div>
  );
}
