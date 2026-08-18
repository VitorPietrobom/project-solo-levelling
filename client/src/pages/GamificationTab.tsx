import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Flame, Zap, Check, Trophy, Plus, Download,
} from 'lucide-react';
import Ring from '../components/ui/Ring';
import XPBar from '../components/ui/XPBar';
import QuestForm from '../components/QuestForm';
import type { QuestCreateBody } from '../components/QuestForm';
import QuestCard from '../components/QuestCard';
import HabitRow from '../components/HabitRow';
import type { HabitPatch } from '../components/HabitRow';
import type { Quest, QuestPriority } from '../components/QuestList';
import type { Skill } from '../components/SkillList';
import { apiClient } from '../lib/apiClient';
import { rankForLevel } from '../lib/rank';
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

  // Quests and habits are the same underlying entity (Quest.recurrence set
  // vs null) — one fetch, split client-side for the two very different UIs
  // they need (kanban vs a simple toggle list).
  const [quests, setQuests] = useState<Quest[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [localStatus, setLocalStatus] = useState<GamificationStatus | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const [dragQuestId, setDragQuestId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  // Whether any old Task rows are still waiting to be imported — see the
  // "import my tasks" banner below.
  const [hasLegacyTasks, setHasLegacyTasks] = useState(false);
  const [importing, setImporting] = useState(false);

  const fetchQuests = useCallback(async () => {
    try { setQuests((await apiClient.get('/api/quests')) as Quest[]); } catch { /* silently fail */ }
  }, []);

  const fetchSkills = useCallback(async () => {
    try { setSkills((await apiClient.get('/api/skills')) as Skill[]); } catch { /* silently fail */ }
  }, []);

  const fetchStatus = useCallback(async () => {
    try { setLocalStatus((await apiClient.get('/api/gamification/status')) as GamificationStatus); } catch { /* silently fail */ }
  }, []);

  // The old /api/tasks endpoint is still live (Task table isn't dropped
  // yet, on purpose — see the import-tasks migration) purely to detect
  // whether there's anything left to import.
  const checkLegacyTasks = useCallback(async () => {
    try {
      const legacy = (await apiClient.get('/api/tasks')) as { id: string }[];
      setHasLegacyTasks(legacy.length > 0);
    } catch { /* ignore — endpoint may be gone entirely in a future deploy */ }
  }, []);

  useEffect(() => {
    fetchQuests();
    fetchSkills();
    fetchStatus();
    checkLegacyTasks();
  }, [fetchQuests, fetchSkills, fetchStatus, checkLegacyTasks]);

  async function handleImportTasks() {
    setImporting(true);
    try {
      await apiClient.post('/api/quests/import-tasks');
      await fetchQuests();
      setHasLegacyTasks(false);
    } catch { /* leave the banner up so it can be retried */ }
    setImporting(false);
  }

  // Prefer localStatus (fetched directly from DB) over the Dashboard context
  // value which is only loaded once on mount and doesn't reflect level changes.
  const currentStatus = localStatus ?? status;

  const habits = quests.filter((q) => q.recurrence);
  const dailyHabits = habits.filter((q) => q.recurrence === 'daily');
  const weeklyHabits = habits.filter((q) => q.recurrence === 'weekly');
  const dailyDone = dailyHabits.filter((q) => q.completed).length;

  // One-time quests only, from here down — "In Progress" and "Done" are
  // DERIVED from step completion, not an independent status you can drag
  // into directly. See handleDrop for why.
  const oneTimeQuests = quests.filter((q) => !q.recurrence);
  const activeQuests = oneTimeQuests.filter((q) => !q.completed);
  const doneQuests = oneTimeQuests.filter((q) => q.completed);
  const inProgressQuests = activeQuests.filter((q) => q.steps.some((s) => s.completed));
  const todoQuests = activeQuests.filter((q) => !q.steps.some((s) => s.completed));

  function handleQuestCreated(optimistic: Quest, body: QuestCreateBody) {
    setQuests((prev) => [optimistic, ...prev]);
    setShowForm(false);
    apiClient
      .post('/api/quests', { body })
      .then((data) => setQuests((prev) => prev.map((q) => (q.id === optimistic.id ? (data as Quest) : q))))
      .catch(() => setQuests((prev) => prev.filter((q) => q.id !== optimistic.id)));
  }

  function handleHabitToggle(id: string, completed: boolean) {
    const habit = quests.find((q) => q.id === id);
    if (habit && completed && addXP) addXP(habit.xpReward, habit.title);
    setQuests((prev) => prev.map((q) => (q.id === id ? { ...q, completed } : q)));
    apiClient.patch(`/api/quests/${id}/${completed ? 'complete' : 'reset'}`)
      .then(() => fetchStatus())
      .catch(() => fetchQuests());
  }

  function handleHabitSave(id: string, patch: HabitPatch) {
    setQuests((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)));
    apiClient.patch(`/api/quests/${id}`, { body: patch }).catch(() => fetchQuests());
  }

  function handleHabitDelete(id: string, title: string) {
    setConfirmDelete({ id, name: title });
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
    setConfirmDelete({ id: questId, name: questTitle });
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
    const { id } = confirmDelete;
    setQuests((prev) => prev.filter((q) => q.id !== id));
    apiClient.delete(`/api/quests/${id}`).catch(() => fetchQuests());
    setConfirmDelete(null);
  }

  const rank = rankForLevel(currentStatus?.level ?? 1);
  const hunterName = currentStatus?.hunterName || 'Hunter';

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
          <StatCard icon={Check} label="Today's habits" value={`${dailyDone}/${dailyHabits.length}`} accent="var(--good)" />
          <StatCard icon={Trophy} label="Quests done" value={doneQuests.length} accent="var(--accent-2)" />
        </div>
      </div>

      {hasLegacyTasks && (
        <section className="card arise-in" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Download size={16} style={{ color: 'var(--accent)' }} />
            <span style={{ fontSize: 13.5 }}>Quests and Tasks are now one thing. Bring your old tasks in as habits below.</span>
          </div>
          <button className="btn btn-primary" onClick={handleImportTasks} disabled={importing} style={{ padding: '6px 14px', fontSize: 12.5 }}>
            {importing ? 'Importing…' : 'Import my tasks'}
          </button>
        </section>
      )}

      {/* Quests kanban — one-time goals only */}
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

      {/* Habits — recurring quests */}
      <section className="card arise-in" style={{ padding: 'var(--pad)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontSize: 17 }}>Daily & Weekly</h3>
        </div>
        <div className="grid-2-col" style={{ gap: 18 }}>
          {[['Daily', dailyHabits], ['Weekly', weeklyHabits]].map(([label, items]) => (
            <div key={label as string}>
              <div className="eyebrow" style={{ marginBottom: 9 }}>{label as string}</div>
              <div style={{ display: 'grid', gap: 8 }}>
                {(items as Quest[]).map((habit) => (
                  <HabitRow
                    key={habit.id}
                    habit={habit}
                    skills={skills}
                    onToggle={handleHabitToggle}
                    onSave={handleHabitSave}
                    onDelete={handleHabitDelete}
                  />
                ))}
                {(items as Quest[]).length === 0 && (
                  <p style={{ fontSize: 13, color: 'var(--text-faint)', textAlign: 'center', padding: '12px 0' }}>
                    No {label as string} habits yet
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
