import { useState } from 'react';
import { Pencil, X, Check } from 'lucide-react';
import type { WeightEntry } from './WeightChart';

interface WeightEntryListProps {
  entries: WeightEntry[];
  onUpdate: (id: string, weight: number) => void;
  onDelete: (id: string) => void;
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function Row({ entry, onUpdate, onDelete }: { entry: WeightEntry; onUpdate: (id: string, weight: number) => void; onDelete: (id: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(entry.weight));

  function save() {
    const parsed = parseFloat(draft);
    if (!draft || isNaN(parsed) || parsed <= 0) return;
    onUpdate(entry.id, parsed);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2 text-sm bg-secondary rounded px-3 py-2">
        <span className="text-text-secondary flex-shrink-0">{shortDate(entry.date)}</span>
        <input
          type="number" step="0.1" value={draft} autoFocus
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
          className="flex-1 bg-primary text-text-primary border border-border rounded px-2 py-1 text-sm focus:outline-none focus:border-accent-primary"
          aria-label={`Edit weight for ${shortDate(entry.date)}`}
        />
        <button onClick={save} className="text-accent-success hover:opacity-80" aria-label="Save weight edit"><Check size={14} /></button>
        <button onClick={() => setEditing(false)} className="text-text-secondary hover:opacity-80" aria-label="Cancel weight edit"><X size={14} /></button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between text-sm px-3 py-2 rounded hover:bg-secondary group">
      <span className="text-text-secondary">{shortDate(entry.date)}</span>
      <div className="flex items-center gap-3">
        <span className="text-text-primary font-mono">{entry.weight} kg</span>
        <button
          onClick={() => { setDraft(String(entry.weight)); setEditing(true); }}
          className="text-text-secondary hover:opacity-80"
          aria-label={`Edit weight entry from ${shortDate(entry.date)}`}
        ><Pencil size={13} /></button>
        <button
          onClick={() => onDelete(entry.id)}
          className="text-accent-warning hover:opacity-80"
          aria-label={`Delete weight entry from ${shortDate(entry.date)}`}
        ><X size={13} /></button>
      </div>
    </div>
  );
}

export default function WeightEntryList({ entries, onUpdate, onDelete }: WeightEntryListProps) {
  if (entries.length === 0) return null;
  const recent = [...entries].reverse().slice(0, 10);

  return (
    <div className="space-y-1" role="list" aria-label="Weight entries">
      {recent.map((entry) => (
        <Row key={entry.id} entry={entry} onUpdate={onUpdate} onDelete={onDelete} />
      ))}
    </div>
  );
}
