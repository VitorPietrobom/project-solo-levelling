import { useState, useEffect, useCallback } from 'react';
import { Plus, X } from 'lucide-react';
import type { SkillAction } from './SkillList';
import { apiClient } from '../lib/apiClient';

interface Props {
  skillId: string;
  /** Tells the parent a log just happened, so it can refetch the skill's XP/level/lastActivityAt. */
  onLogged: () => void;
}

export default function SkillActionList({ skillId, onLogged }: Props) {
  const [actions, setActions] = useState<SkillAction[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [xpReward, setXpReward] = useState(20);
  const [logging, setLogging] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ actionId: string; text: string } | null>(null);

  const fetchActions = useCallback(async () => {
    try {
      setActions((await apiClient.get(`/api/skill-actions?skillId=${encodeURIComponent(skillId)}`)) as SkillAction[]);
    } catch { /* silently fail */ }
  }, [skillId]);

  useEffect(() => { fetchActions(); }, [fetchActions]);

  async function addAction(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || xpReward <= 0) return;
    const optimistic: SkillAction = { id: `temp-${Date.now()}`, skillId, name: name.trim(), xpReward };
    setActions((prev) => [...prev, optimistic]);
    setName('');
    setXpReward(20);
    setShowForm(false);
    try {
      const created = (await apiClient.post('/api/skill-actions', { body: { skillId, name: optimistic.name, xpReward } })) as SkillAction;
      setActions((prev) => prev.map((a) => (a.id === optimistic.id ? created : a)));
    } catch {
      setActions((prev) => prev.filter((a) => a.id !== optimistic.id));
    }
  }

  function deleteAction(id: string) {
    setActions((prev) => prev.filter((a) => a.id !== id));
    apiClient.delete(`/api/skill-actions/${id}`).catch(() => fetchActions());
  }

  async function logAction(action: SkillAction) {
    setLogging(action.id);
    try {
      const res = (await apiClient.post(`/api/skill-actions/${action.id}/log`)) as { xpAwarded: number; multiplier: number };
      onLogged();
      setFlash({
        actionId: action.id,
        text: res.multiplier < 1 ? `+${res.xpAwarded} XP (×${res.multiplier} today)` : `+${res.xpAwarded} XP`,
      });
      setTimeout(() => setFlash((f) => (f?.actionId === action.id ? null : f)), 2200);
    } catch { /* leave it loggable so it can be retried */ }
    setLogging(null);
  }

  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="eyebrow" style={{ fontSize: 9.5 }}>Practice actions</span>
        <button
          type="button" className="btn btn-ghost" style={{ padding: '3px 8px', fontSize: 11 }}
          onClick={() => setShowForm((v) => !v)}
        >
          <Plus size={11} strokeWidth={2.4} />{showForm ? 'Cancel' : 'New action'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={addAction} style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text" placeholder="e.g. Play drums" value={name} onChange={(e) => setName(e.target.value)}
            aria-label="Action name"
            style={{ flex: 1, minWidth: 100, background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r-sm)', padding: '5px 8px', fontSize: 12 }}
          />
          <input
            type="number" min={1} value={xpReward} onChange={(e) => setXpReward(Number(e.target.value))}
            aria-label="XP reward"
            style={{ width: 60, background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r-sm)', padding: '5px 8px', fontSize: 12 }}
          />
          <button type="submit" className="btn btn-primary" style={{ padding: '5px 10px', fontSize: 11.5 }}>Add</button>
        </form>
      )}

      {actions.length === 0 && !showForm && (
        <p style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>
          No practice actions yet — add one (e.g. "Play" or "Watch a lesson") to log XP each time you do it.
        </p>
      )}

      {actions.map((action) => (
        <div key={action.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'var(--surface)', borderRadius: 'var(--r-sm)' }}>
          <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{action.name}</span>
          {flash?.actionId === action.id ? (
            <span className="mono" style={{ fontSize: 11, color: 'var(--good)' }}>{flash.text}</span>
          ) : (
            <span className="mono" style={{ fontSize: 11, color: 'var(--accent)' }}>+{action.xpReward}</span>
          )}
          <button
            type="button" className="btn btn-primary" disabled={logging === action.id}
            onClick={() => logAction(action)}
            style={{ padding: '3px 10px', fontSize: 11 }}
          >{logging === action.id ? '…' : 'Log'}</button>
          <button
            type="button" onClick={() => deleteAction(action.id)} aria-label={`Delete action "${action.name}"`}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', display: 'flex', padding: 2 }}
          ><X size={12} /></button>
        </div>
      ))}
    </div>
  );
}
