import { useState, useEffect, useCallback } from 'react';
import { Plus } from 'lucide-react';
import XPBar from '../components/ui/XPBar';
import RadarChart, { niceMax } from '../components/ui/RadarChart';
import SkillForm from '../components/SkillForm';
import type { Skill } from '../components/SkillList';
import { apiClient } from '../lib/apiClient';
import ConfirmDialog from '../components/ui/ConfirmDialog';

export default function SkillsTab() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [showSkillForm, setShowSkillForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  // Shared highlight between the skill list and the radar.
  const [hoveredSkill, setHoveredSkill] = useState<number | null>(null);

  const fetchSkills = useCallback(async () => {
    try { setSkills((await apiClient.get('/api/skills')) as Skill[]); } catch { /* silently fail */ }
  }, []);

  useEffect(() => { fetchSkills(); }, [fetchSkills]);

  function handleSkillCreated(optimistic: Skill, body: { name: string }) {
    setSkills((prev) => [optimistic, ...prev]);
    setShowSkillForm(false);
    apiClient
      .post('/api/skills', { body })
      .then((data) => setSkills((prev) => prev.map((s) => (s.id === optimistic.id ? (data as Skill) : s))))
      .catch(() => setSkills((prev) => prev.filter((s) => s.id !== optimistic.id)));
  }

  function handleSkillDelete(skillId: string, skillName: string) {
    setConfirmDelete({ id: skillId, name: skillName });
  }

  function confirmDeleteAction() {
    if (!confirmDelete) return;
    setSkills((prev) => prev.filter((s) => s.id !== confirmDelete.id));
    apiClient.delete(`/api/skills/${confirmDelete.id}`).catch(() => fetchSkills());
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

  const sortedSkills = [...skills].sort((a, b) => b.level - a.level || a.name.localeCompare(b.name));

  return (
    <>
      <div style={{ display: 'grid', gap: 'var(--gap)' }}>
        <section className="card arise-in" style={{ padding: 'var(--pad)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <div>
              <h3 style={{ fontSize: 17 }}>Skills</h3>
              <p style={{ fontSize: 12.5, color: 'var(--text-faint)', marginTop: 3 }}>
                Skills only grow by linking a quest or habit to them — finishing it grants the XP automatically.
                No manual XP entry, so a skill's level always means something real got done.
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
            <div className="grid-2-col" style={{ gap: 10 }}>
              {sortedSkills.map((s) => {
                const radarIndex = radarData.findIndex((d) => d.name === s.name);
                const on = hoveredSkill === radarIndex && radarIndex >= 0;
                return (
                  <div
                    key={s.id}
                    onPointerEnter={() => setHoveredSkill(radarIndex >= 0 ? radarIndex : null)}
                    onPointerLeave={() => setHoveredSkill(null)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                      background: on ? 'var(--accent-soft)' : 'var(--surface-inset)', borderRadius: 'var(--r-sm)',
                      border: `1px solid ${on ? 'var(--accent)' : 'var(--line-soft)'}`, transition: 'background .15s, border-color .15s',
                    }}
                  >
                    <span
                      title={s.name}
                      style={{
                        flex: '0 1 120px', minWidth: 0, fontSize: 13, fontWeight: 600,
                        color: on ? 'var(--accent)' : 'var(--text)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}
                    >{s.name}</span>
                    <div style={{ flex: 1 }}>
                      <XPBar value={s.progress.percentage} max={100} height={6} color={on ? 'var(--accent)' : 'var(--accent-2)'} />
                    </div>
                    <span className="mono" style={{ fontSize: 12, color: 'var(--text-3)', width: 38, textAlign: 'right', flexShrink: 0 }}>Lv {s.level}</span>
                    <button
                      className="btn btn-ghost"
                      style={{ padding: '4px 8px', fontSize: 11, color: 'var(--bad)', flexShrink: 0 }}
                      onClick={() => handleSkillDelete(s.id, s.name)}
                      title="Delete skill"
                      aria-label={`Delete skill "${s.name}"`}
                    >✕</button>
                  </div>
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
