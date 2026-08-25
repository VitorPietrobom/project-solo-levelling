import { useState, useEffect, useCallback } from 'react';
import { Check } from 'lucide-react';
import { apiClient, errorMessage } from '../lib/apiClient';
import { useToast } from '../contexts/ToastContext';

export interface SpecialQuest {
  id: string;
  category: 'daily' | 'weekly' | 'monthly';
  title: string;
  description: string;
  xpReward: number;
  periodKey: string;
  completed: boolean;
}

interface SpecialQuestBoard {
  daily: SpecialQuest[];
  weekly: SpecialQuest[];
  monthly: SpecialQuest[];
}

interface Props {
  onXpChange?: (amount: number, label: string) => void;
}

const SECTIONS: { key: keyof SpecialQuestBoard; label: string; resetHint: string }[] = [
  { key: 'daily', label: 'Daily', resetHint: 'Resets tomorrow' },
  { key: 'weekly', label: 'Weekly', resetHint: 'Shared by everyone — resets Monday' },
  { key: 'monthly', label: 'Monthly', resetHint: 'Shared by everyone — resets next month' },
];

function QuestRow({ quest, onToggle }: { quest: SpecialQuest; onToggle: (q: SpecialQuest, completed: boolean) => void }) {
  return (
    <button
      onClick={() => onToggle(quest, !quest.completed)}
      aria-label={`Mark "${quest.title}" ${quest.completed ? 'incomplete' : 'complete'}`}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, width: '100%', minWidth: 0, boxSizing: 'border-box', textAlign: 'left',
        background: 'var(--surface-inset)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r-sm)',
        padding: '9px 11px', cursor: 'pointer',
      }}
    >
      <span
        style={{
          width: 20, height: 20, borderRadius: 6, flexShrink: 0,
          border: `2px solid ${quest.completed ? 'var(--accent)' : 'var(--line)'}`,
          background: quest.completed ? 'var(--accent)' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--bg-0)',
        }}
      >
        {quest.completed && <Check size={12} strokeWidth={3} />}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 500, color: quest.completed ? 'var(--text-3)' : 'var(--text)', textDecoration: quest.completed ? 'line-through' : 'none' }}>
          {quest.title}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 1 }}>{quest.description}</div>
      </span>
      <span className="mono" style={{ fontSize: 12, color: quest.completed ? 'var(--text-faint)' : 'var(--accent)', flexShrink: 0 }}>
        +{quest.xpReward}
      </span>
    </button>
  );
}

export default function SpecialQuestPanel({ onXpChange }: Props) {
  const { showToast } = useToast();
  const [board, setBoard] = useState<SpecialQuestBoard | null>(null);

  const fetchBoard = useCallback(async () => {
    try { setBoard((await apiClient.get('/api/special-quests')) as SpecialQuestBoard); } catch { /* silently fail */ }
  }, []);

  useEffect(() => { fetchBoard(); }, [fetchBoard]);

  function handleToggle(quest: SpecialQuest, completed: boolean) {
    if (!board) return;
    const prevBoard = board;
    setBoard({ ...board, [quest.category]: board[quest.category].map((q) => (q.id === quest.id ? { ...q, completed } : q)) });
    if (completed && onXpChange) onXpChange(quest.xpReward, quest.title);
    else if (!completed && onXpChange) onXpChange(-quest.xpReward, quest.title);

    apiClient.patch(`/api/special-quests/${quest.id}`, { body: { completed } }).catch((err) => {
      setBoard(prevBoard);
      showToast(errorMessage(err, 'Failed to update quest'));
    });
  }

  if (!board) return null;

  return (
    <section className="card arise-in" style={{ padding: 'var(--pad)' }}>
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 17 }}>Quest Board</h3>
        <p style={{ fontSize: 12.5, color: 'var(--text-faint)', marginTop: 2 }}>
          Fresh picks every period — 3 daily just for you, 3 weekly and 2 monthly shared with every hunter.
        </p>
      </div>
      <div className="grid-3-col" style={{ gap: 18 }}>
        {SECTIONS.map(({ key, label, resetHint }) => (
          <div key={key} style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: '2px 8px', marginBottom: 9 }}>
              <span className="eyebrow">{label}</span>
              <span style={{ fontSize: 10.5, color: 'var(--text-faint)', minWidth: 0 }}>{resetHint}</span>
            </div>
            <div style={{ display: 'grid', gap: 8, minWidth: 0 }}>
              {(board[key] ?? []).map((quest) => (
                <QuestRow key={quest.id} quest={quest} onToggle={handleToggle} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
