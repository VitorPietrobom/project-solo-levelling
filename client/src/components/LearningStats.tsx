import { useState, useEffect, useCallback } from 'react';
import { BookOpen, StickyNote, Lightbulb, PenLine, Pencil, Check } from 'lucide-react';
import Ring from './ui/Ring';
import { apiClient } from '../lib/apiClient';

interface Stats {
  readingGoal: number;
  booksFinishedThisYear: number;
  booksFinishedTotal: number;
  booksReading: number;
  pagesRead: number;
  notesCount: number;
  lessonsCount: number;
  journalCount: number;
}

function Tile({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number | string; color: string }) {
  return (
    <div style={{ background: 'var(--surface-inset)', borderRadius: 'var(--r-sm)', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-3)' }}>
        <Icon size={14} style={{ color }} />
        <span className="eyebrow" style={{ fontSize: 9.5 }}>{label}</span>
      </div>
      <span className="mono" style={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }}>{value}</span>
    </div>
  );
}

// re-fetches on `refreshKey` change so it reflects new books/notes/etc.
export default function LearningStats({ refreshKey }: { refreshKey: number }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [editing, setEditing] = useState(false);
  const [goalDraft, setGoalDraft] = useState('12');

  const fetchStats = useCallback(async () => {
    try {
      const data = (await apiClient.get('/api/learning/stats')) as Stats;
      setStats(data);
      setGoalDraft(String(data.readingGoal));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats, refreshKey]);

  async function saveGoal() {
    const n = parseInt(goalDraft, 10);
    setEditing(false);
    if (!isNaN(n) && n > 0 && stats) {
      setStats({ ...stats, readingGoal: n });
      try { await apiClient.put('/api/learning/goal', { body: { readingGoal: n } }); } catch { fetchStats(); }
    }
  }

  if (!stats) {
    return <section className="card arise-in" style={{ padding: 'var(--pad)' }}><p style={{ color: 'var(--text-faint)', fontSize: 13 }}>Loading…</p></section>;
  }

  const goalPct = stats.readingGoal > 0 ? Math.min(100, Math.round((stats.booksFinishedThisYear / stats.readingGoal) * 100)) : 0;

  return (
    <section className="card arise-in grid-2-col-skewed" style={{ padding: 'var(--pad)', alignItems: 'center' }}>
      {/* Reading goal ring */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
        <Ring value={stats.booksFinishedThisYear} max={stats.readingGoal || 1} size={128} thick={11} color="var(--accent)">
          <span className="eyebrow" style={{ fontSize: 9 }}>THIS YEAR</span>
          <span className="mono" style={{ fontSize: 30, fontWeight: 700, lineHeight: 1 }}>{stats.booksFinishedThisYear}</span>
          <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>of {stats.readingGoal}</span>
        </Ring>
        <div>
          <div className="eyebrow" style={{ marginBottom: 4 }}>Reading goal</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{goalPct}% of your {stats.readingGoal}-book year</div>
          {editing ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="number" min={1} value={goalDraft} onChange={(e) => setGoalDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveGoal(); }}
                aria-label="Reading goal (books/year)"
                style={{ width: 70, background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r-sm)', padding: '5px 8px', fontSize: 13 }}
              />
              <button className="btn btn-ghost" onClick={saveGoal} aria-label="Save reading goal" style={{ padding: '5px 8px' }}><Check size={14} /></button>
            </div>
          ) : (
            <button className="btn btn-ghost" onClick={() => setEditing(true)}><Pencil size={13} />Set goal</button>
          )}
          <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 8 }}>
            {stats.booksFinishedTotal} finished all-time · {stats.pagesRead.toLocaleString()} pages
          </div>
        </div>
      </div>

      {/* Knowledge tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 10 }}>
        <Tile icon={BookOpen} label="Reading now" value={stats.booksReading} color="var(--accent)" />
        <Tile icon={StickyNote} label="Notes" value={stats.notesCount} color="var(--accent-2)" />
        <Tile icon={Lightbulb} label="Lessons" value={stats.lessonsCount} color="var(--warn)" />
        <Tile icon={PenLine} label="Journal" value={stats.journalCount} color="var(--good)" />
      </div>
    </section>
  );
}
