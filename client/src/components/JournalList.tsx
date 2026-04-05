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
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(entry);
  }
  return groups;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

export default function JournalList({ entries = [], onDelete }: JournalListProps) {
  if (entries.length === 0) {
    return <p className="text-text-secondary text-sm">No journal entries yet.</p>;
  }

  const grouped = groupByDate(entries);
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-4">
      {sortedDates.map((dateKey) => (
        <div key={dateKey}>
          <h4 className="text-text-secondary text-xs font-semibold mb-2">{formatDate(dateKey)}</h4>
          <div className="space-y-2 border-l-2 border-border pl-4">
            {grouped[dateKey].map((entry) => (
              <div key={entry.id} className="bg-card rounded-lg p-3 border border-border">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-text-primary text-sm whitespace-pre-wrap">{entry.content}</p>
                  <button
                    onClick={() => onDelete(entry.id)}
                    className="text-accent-warning text-xs hover:opacity-80 shrink-0"
                    aria-label={`Delete journal entry`}
                  >
                    ✕
                  </button>
                </div>
                {entry.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {entry.tags.map((tag) => (
                      <span key={tag} className="bg-secondary text-accent-info text-xs px-2 py-0.5 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {entry.linkedSkillId && (
                  <span className="text-accent-secondary text-xs mt-1 inline-block">🔗 Linked skill</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
