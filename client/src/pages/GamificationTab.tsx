import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Flame, Zap, Check, Trophy, Plus, CheckSquare,
} from 'lucide-react';
import Ring from '../components/ui/Ring';
import XPBar from '../components/ui/XPBar';
import RadarChart from '../components/ui/RadarChart';
import QuestForm from '../components/QuestForm';
import type { Quest } from '../components/QuestList';
import TaskForm from '../components/TaskForm';
import type { Task } from '../components/TaskList';
import SkillForm from '../components/SkillForm';
import type { Skill } from '../components/SkillList';
import { apiClient } from '../lib/apiClient';

interface GamificationStatus {
  level: number;
  totalXP: number;
  streak?: number;
  progress: { current: number; required: number; percentage: number };
}

interface OutletCtx {
  status: GamificationStatus | null;
  addXP: (amount: number, label: string) => void;
}

const TAG_COLOR: Record<string, string> = {
  Work: 'var(--info)',
  Mind: 'var(--accent-2)',
  Body: 'var(--accent)',
  Diet: 'var(--good)',
};

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
  const [skills, setSkills] = useState<Skill[]>([]);
  const [showSkillForm, setShowSkillForm] = useState(false);
  const [localStatus, setLocalStatus] = useState<GamificationStatus | null>(null);

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

  // Quests categorized
  const activeQuests = quests.filter((q) => !q.completed);
  const doneQuests = quests.filter((q) => q.completed);
  const inProgressQuests = activeQuests.filter((q) => q.steps.some((s) => s.completed));
  const todoQuests = activeQuests.filter((q) => q.steps.every((s) => !s.completed));

  function handleQuestCreated(optimistic: Quest, validSteps: string[], xpReward: number) {
    setQuests((prev) => [optimistic, ...prev]);
    setShowForm(false);
    apiClient
      .post('/api/quests', { body: { title: optimistic.title, description: optimistic.description, xpReward, steps: validSteps } })
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

  function handleStepToggle(questId: string, stepId: string) {
    setQuests((prev) =>
      prev.map((q) => {
        if (q.id !== questId) return q;
        const updatedSteps = q.steps.map((s) => (s.id === stepId ? { ...s, completed: true } : s));
        const allDone = updatedSteps.every((s) => s.completed);
        return { ...q, steps: updatedSteps, completed: allDone };
      }),
    );
    apiClient.patch(`/api/quests/${questId}/steps/${stepId}`).catch(() => fetchQuests());
  }

  function handleSkillCreated(optimistic: Skill, body: { name: string }) {
    setSkills((prev) => [optimistic, ...prev]);
    setShowSkillForm(false);
    apiClient
      .post('/api/skills', { body })
      .then((data) => setSkills((prev) => prev.map((s) => (s.id === optimistic.id ? (data as Skill) : s))))
      .catch(() => setSkills((prev) => prev.filter((s) => s.id !== optimistic.id)));
  }

  function handleSkillLog(skillId: string, xp: number) {
    setSkills((prev) => prev.map((s) => (s.id === skillId ? { ...s, totalXP: s.totalXP + xp } : s)));
    if (addXP) addXP(xp, 'Skill XP');
    apiClient
      .post(`/api/skills/${skillId}/log`, { body: { xp } })
      .then((data) => {
        setSkills((prev) => prev.map((s) => (s.id === skillId ? (data as Skill) : s)));
        fetchStatus();
      })
      .catch(() => fetchSkills());
  }

  const daily = tasks.filter((t) => t.recurrence === 'daily');
  const weekly = tasks.filter((t) => t.recurrence === 'weekly');
  const dailyDone = daily.filter((t) => t.completedToday).length;

  // Map skills to radar — use actual level so chart reflects mastery, not next-level progress
  const radarData = skills.slice(0, 6).map((s) => ({
    name: s.name.slice(0, 6),
    axis: s.level,
  }));
  const radarMax = Math.max(1, ...radarData.map((d) => d.axis));

  const questCols: [string, string, Quest[]][] = [
    ['To Do', 'todo', todoQuests],
    ['In Progress', 'doing', inProgressQuests],
    ['Done', 'done', doneQuests],
  ];

  return (
    <div style={{ display: 'grid', gap: 'var(--gap)' }}>
      {/* Hero row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.15fr) minmax(0,1fr)', gap: 'var(--gap)' }}>
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
          <div style={{ flex: 1, position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <h2 style={{ fontSize: 26 }}>Hunter</h2>
              <span className="chip" style={{ borderColor: 'var(--accent-2)', color: 'var(--accent-2)' }}>E-Rank</span>
            </div>
            <div style={{ color: 'var(--text-3)', fontSize: 14, marginBottom: 16 }}>"The journey of a thousand miles begins beneath your feet."</div>
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--gap)' }}>
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
            <QuestForm onCreated={handleQuestCreated} />
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {questCols.map(([label, , items]) => (
            <div key={label} style={{ background: 'var(--surface-inset)', borderRadius: 'var(--r)', padding: 12, minHeight: 180 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, padding: '0 4px' }}>
                <span className="eyebrow">{label}</span>
                <span className="mono" style={{ fontSize: 11, color: 'var(--text-faint)' }}>{items.length}</span>
              </div>
              <div style={{ display: 'grid', gap: 10 }}>
                {items.map((q) => {
                  const done = q.steps.filter((s) => s.completed).length;
                  const total = q.steps.length || 1;
                  const isDone = q.completed;
                  return (
                    <div
                      key={q.id}
                      onClick={() => !isDone && q.steps.find((s) => !s.completed) && handleStepToggle(q.id, q.steps.find((s) => !s.completed)!.id)}
                      style={{
                        background: 'var(--surface)',
                        border: '1px solid var(--line-soft)',
                        borderRadius: 'var(--r-sm)',
                        padding: 13,
                        cursor: isDone ? 'default' : 'pointer',
                        transition: 'border-color .16s, transform .16s',
                      }}
                      onMouseEnter={(e) => { if (!isDone) { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--line-soft)'; e.currentTarget.style.transform = 'none'; }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.25 }}>{q.title}</span>
                        <span className="mono" style={{ fontSize: 11, color: 'var(--accent)', whiteSpace: 'nowrap' }}>+{q.xpReward}</span>
                      </div>
                      {q.description && (
                        <div style={{ color: 'var(--text-3)', fontSize: 12.5, marginBottom: 11 }}>{q.description}</div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 7, height: 7, borderRadius: 99, background: TAG_COLOR['Work'] ?? 'var(--text-3)' }} />
                        <div style={{ flex: 1 }}>
                          <XPBar value={done} max={total} height={5} color={isDone ? 'var(--good)' : 'var(--accent)'} />
                        </div>
                        <span className="mono" style={{ fontSize: 11, color: 'var(--text-faint)' }}>{done}/{total}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        {(todoQuests.length + inProgressQuests.length) > 0 && (
          <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-faint)', textAlign: 'center' }}>
            Tip — click a quest card to complete its next step.
          </div>
        )}
      </section>

      {/* Tasks + Skills */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.05fr)', gap: 'var(--gap)' }}>
        {/* Tasks */}
        <section className="card arise-in" style={{ padding: 'var(--pad)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: 17 }}>Daily & Weekly</h3>
            <button className="btn btn-ghost" onClick={() => setShowTaskForm(!showTaskForm)}>
              <Plus size={15} strokeWidth={2.4} />{showTaskForm ? 'Cancel' : 'New Task'}
            </button>
          </div>
          {showTaskForm && (
            <div style={{ marginBottom: 16 }}>
              <TaskForm onCreated={handleTaskCreated} skills={skills} />
            </div>
          )}
          <div style={{ display: 'grid', gap: 18 }}>
            {[['Daily', daily], ['Weekly', weekly]].map(([label, items]) => (
              <div key={label as string}>
                <div className="eyebrow" style={{ marginBottom: 9 }}>{label as string}</div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {(items as Task[]).map((t) => {
                    const linkedSkill = t.linkedSkillId ? skills.find((s) => s.id === t.linkedSkillId) : null;
                    return (
                      <button
                        key={t.id}
                        onClick={() => t.completedToday ? handleTaskUncomplete(t.id) : handleTaskToggle(t.id)}
                        title={t.completedToday ? 'Click to undo' : 'Mark complete'}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '11px 14px',
                          borderRadius: 'var(--r-sm)',
                          border: '1px solid var(--line-soft)',
                          background: t.completedToday ? 'var(--accent-soft)' : 'var(--surface-inset)',
                          textAlign: 'left',
                          transition: 'all .16s',
                          cursor: 'pointer',
                          width: '100%',
                        }}
                      >
                        <span
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 7,
                            border: `2px solid ${t.completedToday ? 'var(--accent)' : 'var(--line)'}`,
                            background: t.completedToday ? 'var(--accent)' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--bg-0)',
                            flexShrink: 0,
                          }}
                        >
                          {t.completedToday && <Check size={13} strokeWidth={3} />}
                        </span>
                        <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: t.completedToday ? 'var(--text-3)' : 'var(--text)', textDecoration: t.completedToday ? 'line-through' : 'none' }}>
                          {t.title}
                          {linkedSkill && <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--accent-2)', opacity: 0.8 }}>· {linkedSkill.name}</span>}
                        </span>
                        <span className="mono" style={{ fontSize: 12, color: t.completedToday ? 'var(--text-faint)' : 'var(--accent)' }}>
                          +{t.xpReward}
                        </span>
                      </button>
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

        {/* Skills */}
        <section className="card arise-in" style={{ padding: 'var(--pad)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: 17 }}>Skills</h3>
            <button className="btn btn-ghost" onClick={() => setShowSkillForm(!showSkillForm)}>
              <Plus size={15} strokeWidth={2.4} />{showSkillForm ? 'Cancel' : 'New Skill'}
            </button>
          </div>
          {showSkillForm && (
            <div style={{ marginBottom: 16 }}>
              <SkillForm onCreated={handleSkillCreated} />
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 200px', gap: 18, alignItems: 'center' }}>
            <div style={{ display: 'grid', gap: 9 }}>
              {skills.map((s) => {
                const axisVal = s.progress.percentage;
                const level = s.level;
                return (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ width: 78, fontSize: 13, fontWeight: 600 }}>{s.name}</span>
                    <div style={{ flex: 1 }}>
                      <XPBar value={axisVal} max={100} height={6} color="var(--accent-2)" />
                    </div>
                    <span className="mono" style={{ fontSize: 12, color: 'var(--text-3)', width: 42, textAlign: 'right' }}>Lv {level}</span>
                    <button
                      className="btn btn-ghost"
                      style={{ padding: '4px 8px', fontSize: 11 }}
                      onClick={() => handleSkillLog(s.id, 100)}
                      title="Log 100 XP"
                    >
                      <CheckSquare size={12} />
                    </button>
                  </div>
                );
              })}
              {skills.length === 0 && (
                <p style={{ fontSize: 13, color: 'var(--text-faint)' }}>No skills yet. Add one!</p>
              )}
            </div>
            {radarData.length > 0 ? (
              <RadarChart data={radarData} size={200} max={radarMax} />
            ) : (
              <div style={{ width: 200, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)', fontSize: 12 }}>
                Add skills to see radar
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
