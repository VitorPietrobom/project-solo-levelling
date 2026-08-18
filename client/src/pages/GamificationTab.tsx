import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Flame, Zap, Check, Trophy, Plus, X, Pencil,
} from 'lucide-react';
import Ring from '../components/ui/Ring';
import XPBar from '../components/ui/XPBar';
import QuestForm from '../components/QuestForm';
import QuestCard from '../components/QuestCard';
import type { Quest, QuestPriority } from '../components/QuestList';
import TaskForm from '../components/TaskForm';
import type { Task } from '../components/TaskList';
import type { Skill } from '../components/SkillList';
import { apiClient } from '../lib/apiClient';
import ConfirmDialog from '../components/ui/ConfirmDialog';

interface GamificationStatus {
  level: number;
  totalXP: number;
  streak?: number;
  hunterName?: string;
  progress: { current: number; required: number; percentage: number };
}

interface OutletCtx {
  status: GamificationStatus | null;
  addXP: (amount: number, label: string) => void;
}

// Hunter rank by level.
const RANKS: { from: number; label: string; color: string }[] = [
  { from: 60, label: 'S-Rank', color: 'var(--warn)' },
  { from: 40, label: 'A-Rank', color: 'var(--bad)' },
  { from: 25, label: 'B-Rank', color: 'var(--accent-2)' },
  { from: 15, label: 'C-Rank', color: 'var(--info)' },
  { from: 7, label: 'D-Rank', color: 'var(--accent)' },
  { from: 0, label: 'E-Rank', color: 'var(--text-3)' },
];

export function rankForLevel(level: number): { label: string; color: string } {
  return RANKS.find((r) => level >= r.from) ?? RANKS[RANKS.length - 1]!;
}

// A small pool of flavor lines, picked deterministically by level so the
// card isn't the same static sentence forever, but also doesn't reshuffle
// on every reload.
const MOTTOS = [
  'The journey of a thousand miles begins beneath your feet.',
  'Strength is the only justice this world remembers.',
  'Every rank was once someone refusing to stay where they were.',
  'Small quests, repeated, are how a legend is actually built.',
  'The grind doesn’t care how you feel about it today.',
  'Discipline is a debt that always pays interest.',
];
function mottoForLevel(level: number): string {
  return MOTTOS[level % MOTTOS.length]!;
}

function StatCard({
  icon: IconComp,
  label,
  value,
  suffix,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  suffix?: string;
  accent: string;
}) {
  return (
    <div className="card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="eyebrow">{label}</span>
        <span style={{ color: accent, display: 'flex' }}><IconComp size={18} /></span>
      </div>
      <div style={{ marginTop: 14, display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span className="mono" style={{ fontSize: 30, fontWeight: 700, color: 'var(--text)' }}>{value}</span>
        {suffix && <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>{suffix}</span>}
      </div>
    </div>
  );
}

export default function GamificationTab() {
  const { status, addXP } = (useOutletContext() ?? {}) as Partial<OutletCtx>;

  const [quests, setQuests] = useState<Quest[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  // Fetched here (not just on the Skills page) so quests/tasks can link to a
  // skill and show its name — the actual skill management UI lives on its
  // own page now, since a shared card with the list was too cramped for the
  // radar once you had more than a handful of skills.
  const [skills, setSkills] = useState<Skill[]>([]);
  const [localStatus, setLocalStatus] = useState<GamificationStatus | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'quest' | 'task'; id: string; name: string } | null>(null);
  const [dragQuestId, setDragQuestId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  const fetchQuests = useCallback(async () => {
    try { setQuests((await apiClient.get('/api/quests')) as Quest[]); } catch { /* silently fail */ }
  }, []);

  const fetchTasks = useCallback(async () => {
    try { setTasks((await apiClient.get('/api/tasks')) as Task[]); } catch { /* silently fail */ }
  }, []);

  const fetchSkills = useCallback(async () => {
    try { setSkills((await apiClient.get('/api/skills')) as Skill[]); } catch { /* silently fail */ }
  }, []);

  const fetchStatus = useCallback(async () => {
    try { setLocalStatus((await apiClient.get('/api/gamification/status')) as GamificationStatus); } catch { /* silently fail */ }
  }, []);

  useEffect(() => {
    fetchQuests();
    fetchTasks();
    fetchSkills();
    fetchStatus();
  }, [fetchQuests, fetchTasks, fetchSkills, fetchStatus]);

  // Prefer localStatus (fetched directly from DB) over the Dashboard context
  // value which is only loaded once on mount and doesn't reflect level changes.
  const currentStatus = localStatus ?? status;

  // Quests categorized. "In Progress" and "Done" are DERIVED from step
  // completion, not an independent status you can drag into directly — see
  // handleDrop for why that used to be a confusing, half-working mechanism.
  const activeQuests = quests.filter((q) => !q.completed);
  const doneQuests = quests.filter((q) => q.completed);
  const inProgressQuests = activeQuests.filter((q) => q.steps.some((s) => s.completed));
  const todoQuests = activeQuests.filter((q) => !q.steps.some((s) => s.completed));

  function handleQuestCreated(
    optimistic: Quest,
    validSteps: string[],
    xpReward: number,
    priority: QuestPriority,
    dueDate: string | null,
    linkedSkillId: string | null,
  ) {
    setQuests((prev) => [optimistic, ...prev]);
    setShowForm(false);
    apiClient
      .post('/api/quests', { body: { title: optimistic.title, description: optimistic.description, xpReward, steps: validSteps, priority, dueDate, linkedSkillId } })
      .then((data) => setQuests((prev) => prev.map((q) => (q.id === optimistic.id ? (data as Quest) : q))))
      .catch(() => setQuests((prev) => prev.filter((q) => q.id !== optimistic.id)));
  }

  function handleTaskCreated(optimistic: Task, body: { title: string; recurrence: string; xpReward: number; linkedSkillId?: string }) {
    setTasks((prev) => [optimistic, ...prev]);
    setShowTaskForm(false);
    apiClient
      .post('/api/tasks', { body })
      .then((data) => setTasks((prev) => prev.map((t) => (t.id === optimistic.id ? (data as Task) : t))))
      .catch(() => setTasks((prev) => prev.filter((t) => t.id !== optimistic.id)));
  }

  function handleTaskSave(taskId: string, patch: { title: string; recurrence: 'daily' | 'weekly'; xpReward: number; linkedSkillId: string | null }) {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...patch } : t)));
    setEditingTaskId(null);
    apiClient.patch(`/api/tasks/${taskId}`, { body: patch }).catch(() => fetchTasks());
  }

  function handleTaskToggle(taskId: string) {
    const task = tasks.find((t) => t.id === taskId);
    if (task && !task.completedToday && addXP) addXP(task.xpReward, task.title);
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, completedToday: true } : t)));
    apiClient.patch(`/api/tasks/${taskId}/complete`)
      .then(() => { fetchStatus(); fetchSkills(); })
      .catch(() => fetchTasks());
  }

  function handleTaskUncomplete(taskId: string) {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, completedToday: false } : t)));
    apiClient.patch(`/api/tasks/${taskId}/uncomplete`)
      .then(() => { fetchStatus(); fetchSkills(); })
      .catch(() => fetchTasks());
  }

  function handleTaskDelete(taskId: string, title: string) {
    setConfirmDelete({ type: 'task', id: taskId, name: title });
  }

  // Any step, any direction — the checklist inside an expanded quest card.
  function handleToggleStep(questId: string, stepId: string, completed: boolean) {
    setQuests((prev) =>
      prev.map((q) => {
        if (q.id !== questId) return q;
        const steps = q.steps.map((s) => (s.id === stepId ? { ...s, completed } : s));
        return { ...q, steps, completed: steps.every((s) => s.completed) };
      }),
    );
    apiClient.patch(`/api/quests/${questId}/steps/${stepId}`, { body: { completed } })
      .then(() => fetchStatus())
      .catch(() => fetchQuests());
  }

  // Inline priority / due-date / linked-skill edit from inside an expanded
  // quest card.
  function handleQuestUpdate(questId: string, patch: { priority?: QuestPriority; dueDate?: string | null; linkedSkillId?: string | null }) {
    setQuests((prev) => prev.map((q) => (q.id === questId ? { ...q, ...patch } : q)));
    apiClient.patch(`/api/quests/${questId}`, { body: patch }).catch(() => fetchQuests());
  }

  function handleQuestDelete(questId: string, questTitle: string) {
    setConfirmDelete({ type: 'quest', id: questId, name: questTitle });
  }

  // Dragging is now a coarse shortcut on top of the real per-step checklist:
  // drop on Done = complete every step; drop on To Do = reset every step.
  // "In Progress" isn't a droppable target — that state only ever comes from
  // checking some-but-not-all steps, which you do inside the card itself.
  function handleDrop(targetCol: 'To Do' | 'Done') {
    setDragOverCol(null);
    if (!dragQuestId) return;
    const quest = quests.find((q) => q.id === dragQuestId);
    setDragQuestId(null);
    if (!quest) return;

    if (targetCol === 'Done') {
      if (quest.completed) return;
      setQuests((prev) => prev.map((q) =>
        q.id === quest.id ? { ...q, completed: true, steps: q.steps.map((s) => ({ ...s, completed: true })) } : q,
      ));
      if (addXP) addXP(quest.xpReward, quest.title);
      apiClient.patch(`/api/quests/${quest.id}/complete`).then(() => fetchStatus()).catch(() => fetchQuests());
    } else {
      const alreadyEmpty = quest.steps.every((s) => !s.completed) && !quest.completed;
      if (alreadyEmpty) return;
      setQuests((prev) => prev.map((q) =>
        q.id === quest.id ? { ...q, completed: false, steps: q.steps.map((s) => ({ ...s, completed: false })) } : q,
      ));
      apiClient.patch(`/api/quests/${quest.id}/reset`).then(() => fetchStatus()).catch(() => fetchQuests());
    }
  }

  function confirmDeleteAction() {
    if (!confirmDelete) return;
    const { type, id } = confirmDelete;
    if (type === 'quest') {
      setQuests((prev) => prev.filter((q) => q.id !== id));
      apiClient.delete(`/api/quests/${id}`).catch(() => fetchQuests());
    } else {
      setTasks((prev) => prev.filter((t) => t.id !== id));
      apiClient.delete(`/api/tasks/${id}`).catch(() => fetchTasks());
    }
    setConfirmDelete(null);
  }

  const rank = rankForLevel(currentStatus?.level ?? 1);
  const hunterName = currentStatus?.hunterName || 'Hunter';

  const daily = tasks.filter((t) => t.recurrence === 'daily');
  const weekly = tasks.filter((t) => t.recurrence === 'weekly');
  const dailyDone = daily.filter((t) => t.completedToday).length;

  const questCols: [string, Quest[]][] = [
    ['To Do', todoQuests],
    ['In Progress', inProgressQuests],
    ['Done', doneQuests],
  ];

  return (
    <>
    <div style={{ display: 'grid', gap: 'var(--gap)' }}>
      {/* Hero row */}
      <div className="grid-2-col-skewed">
        {/* Level card */}
        <div
          className="card"
          style={{ padding: 'var(--pad)', display: 'flex', gap: 26, alignItems: 'center', position: 'relative', overflow: 'hidden' }}
        >
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 90% at 12% 0%, var(--accent-2-soft), transparent 55%)', pointerEvents: 'none' }} />
          <Ring value={currentStatus?.progress.current ?? 0} max={currentStatus?.progress.required ?? 1000} size={150} thick={12} color="var(--accent-2)">
            <span className="eyebrow" style={{ fontSize: 9.5 }}>LEVEL</span>
            <span className="mono" style={{ fontSize: 46, fontWeight: 700, lineHeight: 1, color: 'var(--text)' }}>
              {currentStatus?.level ?? 1}
            </span>
          </Ring>
          <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <h2 style={{ fontSize: 26, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{hunterName}</h2>
              <span className="chip" style={{ borderColor: rank.color, color: rank.color, flexShrink: 0 }}>{rank.label}</span>
            </div>
            <div style={{ color: 'var(--text-3)', fontSize: 14, marginBottom: 16 }}>"{mottoForLevel(currentStatus?.level ?? 0)}"</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12, color: 'var(--text-3)', marginBottom: 7 }}>
              <span className="mono" style={{ whiteSpace: 'nowrap' }}>
                {currentStatus?.progress.current ?? 0} / {currentStatus?.progress.required ?? 1000} XP
              </span>
              <span className="mono" style={{ whiteSpace: 'nowrap' }}>
                {currentStatus?.progress.percentage ?? 0}% to Lv {(currentStatus?.level ?? 1) + 1}
              </span>
            </div>
            <XPBar value={currentStatus?.progress.current ?? 0} max={currentStatus?.progress.required ?? 1000} color="var(--accent-2)" height={10} />
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid-2-col">
          <StatCard icon={Flame} label="Day streak" value={currentStatus?.streak ?? 0} suffix="days" accent="var(--warn)" />
          <StatCard icon={Zap} label="Total XP" value={(currentStatus?.totalXP ?? 0).toLocaleString()} accent="var(--accent)" />
          <StatCard icon={Check} label="Today's tasks" value={`${dailyDone}/${daily.length}`} accent="var(--good)" />
          <StatCard icon={Trophy} label="Quests done" value={doneQuests.length} accent="var(--accent-2)" />
        </div>
      </div>

      {/* Quests kanban */}
      <section className="card arise-in" style={{ padding: 'var(--pad)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontSize: 17 }}>Quests</h3>
          <button className="btn btn-ghost" onClick={() => setShowForm(!showForm)}>
            <Plus size={15} strokeWidth={2.4} />{showForm ? 'Cancel' : 'New Quest'}
          </button>
        </div>
        {showForm && (
          <div style={{ marginBottom: 16 }}>
            <QuestForm onCreated={handleQuestCreated} skills={skills} />
          </div>
        )}
        <div className="grid-3-col">
          {questCols.map(([label, items]) => {
            const droppable = label === 'To Do' || label === 'Done';
            const isOver = dragOverCol === label && dragQuestId !== null && droppable;
            return (
              <div
                key={label}
                onDragOver={(e) => { if (droppable) { e.preventDefault(); setDragOverCol(label); } }}
                onDragLeave={() => setDragOverCol(null)}
                onDrop={() => { if (droppable) handleDrop(label as 'To Do' | 'Done'); }}
                style={{
                  background: isOver ? 'var(--accent-soft)' : 'var(--surface-inset)',
                  borderRadius: 'var(--r)',
                  padding: 12,
                  minHeight: 180,
                  border: `2px solid ${isOver ? 'var(--accent)' : 'transparent'}`,
                  transition: 'background .15s, border-color .15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, padding: '0 4px' }}>
                  <span className="eyebrow">{label}</span>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--text-faint)' }}>{items.length}</span>
                </div>
                <div style={{ display: 'grid', gap: 10 }}>
                  {items.map((q) => (
                    <QuestCard
                      key={q.id}
                      quest={q}
                      skills={skills}
                      dragging={dragQuestId === q.id}
                      onDragStart={() => setDragQuestId(q.id)}
                      onDragEnd={() => { setDragQuestId(null); setDragOverCol(null); }}
                      onToggleStep={handleToggleStep}
                      onDelete={handleQuestDelete}
                      onUpdate={handleQuestUpdate}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        {(todoQuests.length + inProgressQuests.length) > 0 && (
          <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-faint)', textAlign: 'center' }}>
            Tip — click a quest to check off steps. Drag to "Done" or back to "To Do" to set them all at once.
          </div>
        )}
      </section>

      {/* Tasks */}
      <section className="card arise-in" style={{ padding: 'var(--pad)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontSize: 17 }}>Daily & Weekly</h3>
          <button className="btn btn-ghost" onClick={() => { setShowTaskForm(!showTaskForm); setEditingTaskId(null); }}>
            <Plus size={15} strokeWidth={2.4} />{showTaskForm ? 'Cancel' : 'New Task'}
          </button>
        </div>
        {showTaskForm && (
          <div style={{ marginBottom: 16 }}>
            <TaskForm onCreated={handleTaskCreated} skills={skills} />
          </div>
        )}
        <div className="grid-2-col" style={{ gap: 18 }}>
          {[['Daily', daily], ['Weekly', weekly]].map(([label, items]) => (
            <div key={label as string}>
              <div className="eyebrow" style={{ marginBottom: 9 }}>{label as string}</div>
              <div style={{ display: 'grid', gap: 8 }}>
                {(items as Task[]).map((t) => {
                  const linkedSkill = t.linkedSkillId ? skills.find((s) => s.id === t.linkedSkillId) : null;
                  if (editingTaskId === t.id) {
                    return (
                      <TaskForm
                        key={t.id}
                        task={t}
                        skills={skills}
                        onSave={handleTaskSave}
                        onCancel={() => setEditingTaskId(null)}
                      />
                    );
                  }
                  return (
                    <div
                      key={t.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '11px 14px', borderRadius: 'var(--r-sm)', border: '1px solid var(--line-soft)',
                        background: t.completedToday ? 'var(--accent-soft)' : 'var(--surface-inset)',
                      }}
                    >
                      <button
                        onClick={() => t.completedToday ? handleTaskUncomplete(t.id) : handleTaskToggle(t.id)}
                        title={t.completedToday ? 'Click to undo' : 'Mark complete'}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0,
                          background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', padding: 0,
                        }}
                      >
                        <span
                          style={{
                            width: 22, height: 22, borderRadius: 7, flexShrink: 0,
                            border: `2px solid ${t.completedToday ? 'var(--accent)' : 'var(--line)'}`,
                            background: t.completedToday ? 'var(--accent)' : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--bg-0)',
                          }}
                        >
                          {t.completedToday && <Check size={13} strokeWidth={3} />}
                        </span>
                        <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 500, color: t.completedToday ? 'var(--text-3)' : 'var(--text)', textDecoration: t.completedToday ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {t.title}
                          {linkedSkill && <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--accent-2)', opacity: 0.8 }}>· {linkedSkill.name}</span>}
                        </span>
                      </button>
                      <span className="mono" style={{ fontSize: 12, color: t.completedToday ? 'var(--text-faint)' : 'var(--accent)', flexShrink: 0 }}>
                        +{t.xpReward}
                      </span>
                      <button
                        onClick={() => { setEditingTaskId(t.id); setShowTaskForm(false); }}
                        aria-label={`Edit task "${t.title}"`}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', display: 'flex', flexShrink: 0, padding: 2 }}
                      ><Pencil size={13} /></button>
                      <button
                        onClick={() => handleTaskDelete(t.id, t.title)}
                        aria-label={`Delete task "${t.title}"`}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', display: 'flex', flexShrink: 0, padding: 2 }}
                      ><X size={13} /></button>
                    </div>
                  );
                })}
                {(items as Task[]).length === 0 && (
                  <p style={{ fontSize: 13, color: 'var(--text-faint)', textAlign: 'center', padding: '12px 0' }}>
                    No {label as string} tasks yet
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>

    {confirmDelete && (
      <ConfirmDialog
        message={`Delete "${confirmDelete.name}"? This cannot be undone.`}
        onConfirm={confirmDeleteAction}
        onCancel={() => setConfirmDelete(null)}
      />
    )}
    </>
  );
}
