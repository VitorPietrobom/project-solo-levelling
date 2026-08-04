import { X, Link2 } from 'lucide-react';

export interface JournalEntry {
  id: string;
  content: string;
  tags: string[];
  linkedSkillId: string | null;
  date: string;
}

interface JournalListProps {
  entries: JournalEntry[];
  onDelete: (id: string) => void;
}

function groupByDate(entries: JournalEntry[]): Record<string, JournalEntry[]> {
  const groups: Record<string, JournalEntry[]> = {};
  for (const entry of entries) {
    const dateKey = entry.date.slice(0, 10);
    (groups[dateKey] ??= []).push(entry);
  }
  return groups;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

export default function JournalList({ entries = [], onDelete }: JournalListProps) {
  if (entries.length === 0) {
    return <p style={{ color: 'var(--text-faint)', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>No journal entries yet. Reflect on what you learned today.</p>;
  }

  const grouped = groupByDate(entries);
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      {sortedDates.map((dateKey) => (
        <div key={dateKey}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>{formatDate(dateKey)}</div>
          <div style={{ display: 'grid', gap: 8, borderLeft: '2px solid var(--line-soft)', paddingLeft: 16 }}>
            {grouped[dateKey].map((entry) => (
              <div key={entry.id} style={{ position: 'relative', background: 'var(--surface-inset)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r-sm)', padding: '12px 14px' }}>
                <span style={{ position: 'absolute', left: -21, top: 16, width: 8, height: 8, borderRadius: 99, background: 'var(--accent-2)', border: '2px solid var(--bg-1)' }} />
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                  <p style={{ fontSize: 13.5, color: 'var(--text)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{entry.content}</p>
                  <button
                    onClick={() => onDelete(entry.id)} aria-label="Delete journal entry"
                    style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', flexShrink: 0, display: 'flex', lineHeight: 1 }}
                  ><X size={14} /></button>
                </div>
                {(entry.tags.length > 0 || entry.linkedSkillId) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                    {entry.tags.map((tag) => (
                      <span key={tag} className="chip" style={{ fontSize: 10.5, padding: '3px 8px', color: 'var(--accent-2)' }}>{tag}</span>
                    ))}
                    {entry.linkedSkillId && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--accent)' }}><Link2 size={11} /> skill</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
