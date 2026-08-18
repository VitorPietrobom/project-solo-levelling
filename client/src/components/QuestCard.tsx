import { useState } from 'react';
import { ChevronDown, Calendar, Flag, Trash2, Sparkles } from 'lucide-react';
import type { Quest, QuestPriority } from './QuestList';
import type { Skill } from './SkillList';

interface Props {
  quest: Quest;
  /** All skills, so the expanded card can offer a link picker. */
  skills?: Skill[];
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onToggleStep: (questId: string, stepId: string, completed: boolean) => void;
  onDelete: (questId: string, title: string) => void;
  onUpdate: (questId: string, patch: { priority?: QuestPriority; dueDate?: string | null; linkedSkillId?: string | null }) => void;
}

const PRIORITY_META: Record<QuestPriority, { label: string; color: string }> = {
  low: { label: 'Low', color: 'var(--text-faint)' },
  medium: { label: 'Med', color: 'var(--accent)' },
  high: { label: 'High', color: 'var(--bad)' },
};

// "Aug 3" from a YYYY-MM-DD (or full ISO) date string.
function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function isOverdue(dueDate: string | null, completed: boolean): boolean {
  if (!dueDate || completed) return false;
  const today = new Date().toISOString().slice(0, 10);
  return dueDate.slice(0, 10) < today;
}

export default function QuestCard({ quest, skills = [], dragging, onDragStart, onDragEnd, onToggleStep, onDelete, onUpdate }: Props) {
  const [expanded, setExpanded] = useState(false);
  const done = quest.steps.filter((s) => s.completed).length;
  const total = quest.steps.length || 1;
  const isDone = quest.completed;
  const overdue = isOverdue(quest.dueDate, isDone);
  const priorityMeta = PRIORITY_META[quest.priority] ?? PRIORITY_META.medium;
  const linkedSkill = quest.linkedSkillId ? skills.find((s) => s.id === quest.linkedSkillId) : null;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      style={{
        background: 'var(--surface)',
        border: `1px solid ${overdue ? 'var(--bad)' : 'var(--line-soft)'}`,
        borderRadius: 'var(--r-sm)',
        cursor: dragging ? 'grabbing' : 'grab',
        transition: 'border-color .16s, opacity .16s',
        opacity: dragging ? 0.45 : 1,
        userSelect: 'none',
      }}
    >
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-label={`${expanded ? 'Collapse' : 'Expand'} quest "${quest.title}"`}
        onClick={() => setExpanded((v) => !v)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded((v) => !v); } }}
        style={{ padding: 13, cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
          <span style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.25 }}>{quest.title}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <span className="mono" style={{ fontSize: 11, color: 'var(--accent)', whiteSpace: 'nowrap' }}>+{quest.xpReward}</span>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(quest.id, quest.title); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', display: 'flex', padding: 2 }}
              title="Delete quest"
              aria-label={`Delete quest "${quest.title}"`}
            ><Trash2 size={13} /></button>
            <ChevronDown size={14} style={{ color: 'var(--text-faint)', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10.5, fontWeight: 600, color: priorityMeta.color }}>
            <Flag size={10} />{priorityMeta.label}
          </span>
          {quest.dueDate && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10.5, color: overdue ? 'var(--bad)' : 'var(--text-faint)' }}>
              <Calendar size={10} />{overdue ? 'Overdue' : shortDate(quest.dueDate)}
            </span>
          )}
          {linkedSkill && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10.5, color: 'var(--accent-2)' }}>
              <Sparkles size={10} />{linkedSkill.name}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 7, height: 7, borderRadius: 99, background: isDone ? 'var(--good)' : done > 0 ? 'var(--accent)' : 'var(--text-faint)', flexShrink: 0 }} />
          <div style={{ flex: 1, background: 'var(--surface-inset)', borderRadius: 99, height: 5, overflow: 'hidden' }}>
            <div style={{ width: `${(done / total) * 100}%`, height: '100%', background: isDone ? 'var(--good)' : 'var(--accent)', transition: 'width .2s' }} />
          </div>
          <span className="mono" style={{ fontSize: 11, color: 'var(--text-faint)' }}>{done}/{quest.steps.length}</span>
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: '1px solid var(--line-soft)', padding: 13, display: 'grid', gap: 12 }} onClick={(e) => e.stopPropagation()}>
          {quest.description && (
            <p style={{ fontSize: 12.5, color: 'var(--text-3)', lineHeight: 1.5 }}>{quest.description}</p>
          )}

          <div style={{ display: 'grid', gap: 6 }}>
            {quest.steps.map((step) => (
              <label
                key={step.id}
                style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 13, cursor: 'pointer' }}
              >
                <input
                  type="checkbox"
                  checked={step.completed}
                  onChange={() => onToggleStep(quest.id, step.id, !step.completed)}
                  aria-label={step.description}
                  style={{ marginTop: 2, accentColor: 'var(--accent)', width: 15, height: 15, flexShrink: 0, cursor: 'pointer' }}
                />
                <span style={{ color: step.completed ? 'var(--text-faint)' : 'var(--text)', textDecoration: step.completed ? 'line-through' : 'none' }}>
                  {step.description}
                </span>
              </label>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', paddingTop: 4 }}>
            <div style={{ display: 'flex', gap: 5 }} role="radiogroup" aria-label="Priority">
              {(['low', 'medium', 'high'] as const).map((p) => {
                const meta = PRIORITY_META[p];
                const on = quest.priority === p;
                return (
                  <button
                    key={p} type="button" role="radio" aria-checked={on}
                    onClick={() => onUpdate(quest.id, { priority: p })}
                    style={{
                      fontSize: 10.5, fontWeight: 600, padding: '3px 8px', borderRadius: 99, cursor: 'pointer',
                      background: on ? 'var(--surface-inset)' : 'transparent',
                      border: `1px solid ${on ? meta.color : 'var(--line-soft)'}`,
                      color: on ? meta.color : 'var(--text-faint)',
                    }}
                  >{meta.label}</button>
                );
              })}
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--text-faint)' }}>
              Due
              <input
                type="date"
                value={quest.dueDate ? quest.dueDate.slice(0, 10) : ''}
                onChange={(e) => onUpdate(quest.id, { dueDate: e.target.value || null })}
                aria-label="Due date"
                style={{ background: 'var(--surface-inset)', color: 'var(--text)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r-sm)', padding: '3px 7px', fontSize: 11.5 }}
              />
            </label>
            {skills.length > 0 && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--text-faint)' }}>
                Skill
                <select
                  value={quest.linkedSkillId ?? ''}
                  onChange={(e) => onUpdate(quest.id, { linkedSkillId: e.target.value || null })}
                  aria-label="Linked skill"
                  style={{ background: 'var(--surface-inset)', color: 'var(--text)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r-sm)', padding: '3px 7px', fontSize: 11.5 }}
                >
                  <option value="">None</option>
                  {skills.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </label>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
