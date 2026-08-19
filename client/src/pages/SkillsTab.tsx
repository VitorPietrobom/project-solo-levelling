import { useState, useEffect, useCallback } from 'react';
import { Plus, ChevronDown, AlertTriangle, Layers, Trophy, Target, Pencil } from 'lucide-react';
import XPBar from '../components/ui/XPBar';
import RadarChart, { niceMax } from '../components/ui/RadarChart';
import SkillForm from '../components/SkillForm';
import SkillActionList from '../components/SkillActionList';
import type { Skill } from '../components/SkillList';
import type { Quest } from '../components/QuestList';
import { apiClient, errorMessage } from '../lib/apiClient';
import { rankForLevel } from '../lib/rank';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useToast } from '../contexts/ToastContext';

function OverviewStat({ icon: IconComp, label, value, accent }: {
  icon: React.ElementType; label: string; value: string; accent: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface-inset)', borderRadius: 'var(--r-sm)', padding: '10px 14px', flex: 1, minWidth: 140 }}>
      <span style={{ color: accent, display: 'flex', flexShrink: 0 }}><IconComp size={16} /></span>
      <div style={{ minWidth: 0 }}>
        <div className="eyebrow" style={{ fontSize: 9.5 }}>{label}</div>
        <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
      </div>
    </div>
  );
}

function LinkedItemRow({ item }: { item: Quest }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: 'var(--surface)', borderRadius: 'var(--r-sm)', fontSize: 12.5 }}>
      <span style={{ width: 6, height: 6, borderRadius: 99, background: item.completed ? 'var(--good)' : item.recurrence ? 'var(--accent-2)' : 'var(--accent)', flexShrink: 0 }} />
      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: item.completed ? 'var(--text-faint)' : 'var(--text-2)', textDecoration: item.completed && !item.recurrence ? 'line-through' : 'none' }}>
        {item.title}
      </span>
      <span style={{ fontSize: 10.5, color: 'var(--text-faint)', flexShrink: 0 }}>
        {item.recurrence ? (item.recurrence === 'daily' ? 'Daily' : 'Weekly') : 'Quest'}
      </span>
      <span className="mono" style={{ fontSize: 10.5, color: 'var(--accent)', flexShrink: 0 }}>+{item.xpReward}</span>
    </div>
  );
}

interface SkillRowProps {
  skill: Skill;
  linkedItems: Quest[];
  highlighted: boolean;
  expanded: boolean;
  onHover: () => void;
  onUnhover: () => void;
  onToggleExpand: () => void;
  onDelete: (id: string, name: string) => void;
  onRename: (id: string, name: string) => void;
  onActionLogged: () => void;
}

function SkillRow({ skill, linkedItems, highlighted, expanded, onHover, onUnhover, onToggleExpand, onDelete, onRename, onActionLogged }: SkillRowProps) {
  const rank = rankForLevel(skill.level);
  const unlinked = linkedItems.length === 0;
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(skill.name);

  if (editing) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!nameDraft.trim()) return;
          onRename(skill.id, nameDraft.trim());
          setEditing(false);
        }}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'var(--surface-inset)', borderRadius: 'var(--r-sm)', border: '1px solid var(--line-soft)' }}
      >
        <input
          type="text" value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} autoFocus
          aria-label={`Rename skill "${skill.name}"`}
          style={{ flex: 1, background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r-sm)', padding: '6px 9px', fontSize: 13 }}
        />
        <button type="submit" className="btn btn-primary" style={{ padding: '5px 12px', fontSize: 12 }}>Save</button>
        <button type="button" className="btn btn-ghost" style={{ padding: '5px 12px', fontSize: 12 }} onClick={() => { setNameDraft(skill.name); setEditing(false); }}>Cancel</button>
      </form>
    );
  }

  return (
    <div
      style={{
        background: highlighted ? 'var(--accent-soft)' : 'var(--surface-inset)', borderRadius: 'var(--r-sm)',
        border: `1px solid ${highlighted ? 'var(--accent)' : 'var(--line-soft)'}`, transition: 'background .15s, border-color .15s',
      }}
    >
      <div
        onPointerEnter={onHover} onPointerLeave={onUnhover}
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', cursor: 'pointer' }}
        onClick={onToggleExpand}
      >
        <span
          title={skill.name}
          style={{
            flex: '0 1 110px', minWidth: 0, fontSize: 13, fontWeight: 600,
            color: highlighted ? 'var(--accent)' : 'var(--text)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}
        >{skill.name}</span>
        <span className="chip" style={{ fontSize: 9.5, padding: '2px 7px', borderColor: rank.color, color: rank.color, flexShrink: 0 }}>{rank.label}</span>
        <div style={{ flex: 1, minWidth: 40 }}>
          <XPBar value={skill.progress.percentage} max={100} height={6} color={highlighted ? 'var(--accent)' : 'var(--accent-2)'} />
        </div>
        <span className="mono" style={{ fontSize: 12, color: 'var(--text-3)', width: 34, textAlign: 'right', flexShrink: 0 }}>Lv {skill.level}</span>
        {unlinked && (
          <span
            role="img"
            aria-label="Not linked to any quest or habit — it can't grow"
            title="Not linked to any quest or habit — it can't grow"
            style={{ display: 'flex', color: 'var(--warn)', flexShrink: 0 }}
          >
            <AlertTriangle size={13} />
          </span>
        )}
        <ChevronDown size={13} style={{ color: 'var(--text-faint)', flexShrink: 0, transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
        <button
          className="btn btn-ghost"
          style={{ padding: '4px 8px', fontSize: 11, flexShrink: 0, display: 'flex' }}
          onClick={(e) => { e.stopPropagation(); setNameDraft(skill.name); setEditing(true); }}
          title="Rename skill"
          aria-label={`Rename skill "${skill.name}"`}
        ><Pencil size={12} /></button>
        <button
          className="btn btn-ghost"
          style={{ padding: '4px 8px', fontSize: 11, color: 'var(--bad)', flexShrink: 0 }}
          onClick={(e) => { e.stopPropagation(); onDelete(skill.id, skill.name); }}
          title="Delete skill"
          aria-label={`Delete skill "${skill.name}"`}
        >✕</button>
      </div>

      {expanded && (
        <div style={{ borderTop: '1px solid var(--line-soft)', padding: '10px 12px', display: 'grid', gap: 12 }}>
          <div style={{ display: 'grid', gap: 6 }}>
            {unlinked ? (
              <p style={{ fontSize: 12, color: 'var(--warn)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertTriangle size={12} />Not linked to anything yet — link it to a quest or habit on the Status page so it can grow.
              </p>
            ) : (
              <>
                <span className="eyebrow" style={{ fontSize: 9.5 }}>Feeds this skill</span>
                {linkedItems.map((item) => <LinkedItemRow key={item.id} item={item} />)}
              </>
            )}
          </div>
          <SkillActionList skillId={skill.id} onLogged={onActionLogged} />
        </div>
      )}
    </div>
  );
}

export default function SkillsTab() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [showSkillForm, setShowSkillForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  // Shared highlight between the skill list and the radar.
  const [hoveredSkill, setHoveredSkill] = useState<number | null>(null);
  const [expandedSkillId, setExpandedSkillId] = useState<string | null>(null);
  const [practiceReminderDays, setPracticeReminderDays] = useState(14);

  const fetchSkills = useCallback(async () => {
    try { setSkills((await apiClient.get('/api/skills')) as Skill[]); } catch { /* silently fail */ }
  }, []);

  const fetchQuests = useCallback(async () => {
    try { setQuests((await apiClient.get('/api/quests')) as Quest[]); } catch { /* silently fail */ }
  }, []);

  const fetchReminderSetting = useCallback(async () => {
    try {
      const status = (await apiClient.get('/api/gamification/status')) as { practiceReminderDays?: number };
      if (status.practiceReminderDays) setPracticeReminderDays(status.practiceReminderDays);
    } catch { /* silently fail */ }
  }, []);

  useEffect(() => {
    Promise.all([fetchSkills(), fetchQuests(), fetchReminderSetting()]).finally(() => setLoading(false));
  }, [fetchSkills, fetchQuests, fetchReminderSetting]);

  function handleSkillCreated(optimistic: Skill, body: { name: string }) {
    setSkills((prev) => [optimistic, ...prev]);
    setShowSkillForm(false);
    apiClient
      .post('/api/skills', { body })
      .then((data) => setSkills((prev) => prev.map((s) => (s.id === optimistic.id ? (data as Skill) : s))))
      .catch((err) => {
        setSkills((prev) => prev.filter((s) => s.id !== optimistic.id));
        showToast(errorMessage(err, 'Failed to create skill'));
      });
  }

  function handleSkillDelete(skillId: string, skillName: string) {
    setConfirmDelete({ id: skillId, name: skillName });
  }

  function handleSkillRename(skillId: string, name: string) {
    setSkills((prev) => prev.map((s) => (s.id === skillId ? { ...s, name } : s)));
    apiClient.patch(`/api/skills/${skillId}`, { body: { name } }).catch((err) => {
      fetchSkills();
      showToast(errorMessage(err, 'Failed to rename skill'));
    });
  }

  function confirmDeleteAction() {
    if (!confirmDelete) return;
    setSkills((prev) => prev.filter((s) => s.id !== confirmDelete.id));
    apiClient.delete(`/api/skills/${confirmDelete.id}`).catch((err) => {
      fetchSkills();
      showToast(errorMessage(err, 'Failed to delete skill'));
    });
    setConfirmDelete(null);
  }

  // Every skill goes on the radar. Sorted by name rather than by level so the
  // shape stays comparable over time instead of reshuffling as levels change.
  const radarData = [...skills]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((s) => ({
      name: s.name,
      axis: s.level + s.progress.percentage / 100,
      detail: `Lv ${s.level}`,
    }));
  const radarMax = niceMax(radarData.map((d) => d.axis));

  const linkedByskill = new Map<string, Quest[]>();
  for (const q of quests) {
    if (!q.linkedSkillId) continue;
    const list = linkedByskill.get(q.linkedSkillId) ?? [];
    list.push(q);
    linkedByskill.set(q.linkedSkillId, list);
  }

  const sortedSkills = [...skills].sort((a, b) => b.level - a.level || a.name.localeCompare(b.name));
  const unlinkedCount = skills.filter((s) => !(linkedByskill.get(s.id)?.length)).length;

  // Skills flagged for the practice reminder — split into "gone stale" (has
  // a last-practiced date, but it's older than the configured window) and
  // "never practiced" (no XP-granting activity at all yet), since those are
  // different situations worth saying differently.
  const daysSince = (iso: string) => (Date.now() - new Date(iso).getTime()) / 86_400_000;
  const staleSkills = skills.filter((s) => s.lastActivityAt && daysSince(s.lastActivityAt) >= practiceReminderDays);
  const neverPracticedSkills = skills.filter((s) => !s.lastActivityAt);

  const topSkill = sortedSkills[0] ?? null;
  const mostActive = [...skills].sort((a, b) => (linkedByskill.get(b.id)?.length ?? 0) - (linkedByskill.get(a.id)?.length ?? 0))[0] ?? null;
  const mostActiveCount = mostActive ? (linkedByskill.get(mostActive.id)?.length ?? 0) : 0;

  if (loading) {
    return <p style={{ color: 'var(--text-faint)', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>Loading…</p>;
  }

  return (
    <>
      <div style={{ display: 'grid', gap: 'var(--gap)' }}>
        <section className="card arise-in" style={{ padding: 'var(--pad)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <div>
              <h3 style={{ fontSize: 17 }}>Skills</h3>
              <p style={{ fontSize: 12.5, color: 'var(--text-faint)', marginTop: 3 }}>
                Skills grow by linking a quest or habit, or by logging a practice action on an expanded skill below.
                Every source pays a fixed, predefined amount — no typing in an arbitrary number — so a skill's level always means something real got done.
              </p>
            </div>
            <button className="btn btn-ghost" onClick={() => setShowSkillForm(!showSkillForm)} style={{ flexShrink: 0 }}>
              <Plus size={15} strokeWidth={2.4} />{showSkillForm ? 'Cancel' : 'New Skill'}
            </button>
          </div>
          {showSkillForm && (
            <div style={{ marginTop: 16 }}>
              <SkillForm onCreated={handleSkillCreated} />
            </div>
          )}
        </section>

        {skills.length > 0 && (
          <div className="grid-3-col">
            <OverviewStat icon={Layers} label="Total skills" value={String(skills.length)} accent="var(--accent)" />
            <OverviewStat
              icon={Trophy} label="Highest level"
              value={topSkill ? `${topSkill.name} · Lv ${topSkill.level}` : '—'}
              accent="var(--warn)"
            />
            <OverviewStat
              icon={Target} label="Most active"
              value={mostActive && mostActiveCount > 0 ? `${mostActive.name} · ${mostActiveCount} linked` : 'None linked yet'}
              accent="var(--accent-2)"
            />
          </div>
        )}

        {unlinkedCount > 0 && (
          <section className="card arise-in" style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertTriangle size={15} style={{ color: 'var(--warn)', flexShrink: 0 }} />
            <span style={{ fontSize: 13 }}>
              {unlinkedCount} skill{unlinkedCount === 1 ? '' : 's'} {unlinkedCount === 1 ? "isn't" : "aren't"} linked to anything yet — {unlinkedCount === 1 ? 'it' : 'they'} can't grow until you link {unlinkedCount === 1 ? 'it' : 'them'} to a quest or habit.
            </span>
          </section>
        )}

        {(staleSkills.length > 0 || neverPracticedSkills.length > 0) && (
          <section className="card arise-in" style={{ padding: '12px 18px', display: 'grid', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <AlertTriangle size={15} style={{ color: 'var(--warn)', flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>Needs practice</span>
            </div>
            {staleSkills.length > 0 && (
              <p style={{ fontSize: 12.5, color: 'var(--text-3)', paddingLeft: 25 }}>
                Untouched for {practiceReminderDays}+ days: {staleSkills.map((s) => s.name).join(', ')}
              </p>
            )}
            {neverPracticedSkills.length > 0 && (
              <p style={{ fontSize: 12.5, color: 'var(--text-3)', paddingLeft: 25 }}>
                Never practiced yet: {neverPracticedSkills.map((s) => s.name).join(', ')}
              </p>
            )}
          </section>
        )}

        {radarData.length >= 3 ? (
          <section className="card arise-in" style={{ padding: 'var(--pad)', display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: '100%', maxWidth: 480 }}>
              <RadarChart
                data={radarData}
                size={440}
                max={radarMax}
                highlightIndex={hoveredSkill}
                onHighlight={setHoveredSkill}
              />
            </div>
          </section>
        ) : skills.length > 0 ? (
          <section className="card arise-in" style={{ padding: 'var(--pad)', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--text-faint)' }}>
              {3 - skills.length} more skill{3 - skills.length === 1 ? '' : 's'} unlocks the radar.
            </p>
          </section>
        ) : null}

        <section className="card arise-in" style={{ padding: 'var(--pad)' }}>
          {sortedSkills.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-faint)' }}>No skills yet. Add one, then link it to a quest or habit.</p>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {sortedSkills.map((s) => {
                const radarIndex = radarData.findIndex((d) => d.name === s.name);
                const on = hoveredSkill === radarIndex && radarIndex >= 0;
                return (
                  <SkillRow
                    key={s.id}
                    skill={s}
                    linkedItems={linkedByskill.get(s.id) ?? []}
                    highlighted={on}
                    expanded={expandedSkillId === s.id}
                    onHover={() => setHoveredSkill(radarIndex >= 0 ? radarIndex : null)}
                    onUnhover={() => setHoveredSkill(null)}
                    onToggleExpand={() => setExpandedSkillId((prev) => (prev === s.id ? null : s.id))}
                    onDelete={handleSkillDelete}
                    onRename={handleSkillRename}
                    onActionLogged={fetchSkills}
                  />
                );
              })}
            </div>
          )}
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
