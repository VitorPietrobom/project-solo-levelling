import { useState } from 'react';
import { Pencil, X, Check } from 'lucide-react';
import type { Measurement } from './MeasurementList';

interface MeasurementEntryListProps {
  measurements: Measurement[];
  onUpdate: (id: string, value: number) => void;
  onDelete: (id: string) => void;
}

const TYPE_LABELS: Record<Measurement['type'], string> = {
  chest: 'Chest', waist: 'Waist', hips: 'Hips', arms: 'Arms', thighs: 'Thighs',
};

function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function Row({ entry, onUpdate, onDelete }: { entry: Measurement; onUpdate: (id: string, value: number) => void; onDelete: (id: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(entry.value));

  function save() {
    const parsed = parseFloat(draft);
    if (!draft || isNaN(parsed) || parsed <= 0) return;
    onUpdate(entry.id, parsed);
    setEditing(false);
  }

  const label = `${TYPE_LABELS[entry.type]} · ${shortDate(entry.date)}`;

  if (editing) {
    return (
      <div className="flex items-center gap-2 text-sm bg-secondary rounded px-3 py-2">
        <span className="text-text-secondary flex-shrink-0">{label}</span>
        <input
          type="number" step="0.1" value={draft} autoFocus
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
          className="flex-1 bg-primary text-text-primary border border-border rounded px-2 py-1 text-sm focus:outline-none focus:border-accent-primary"
          aria-label={`Edit value for ${label}`}
        />
        <button onClick={save} className="text-accent-success hover:opacity-80" aria-label="Save measurement edit"><Check size={14} /></button>
        <button onClick={() => setEditing(false)} className="text-text-secondary hover:opacity-80" aria-label="Cancel measurement edit"><X size={14} /></button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between text-sm px-3 py-2 rounded hover:bg-secondary">
      <span className="text-text-secondary">{label}</span>
      <div className="flex items-center gap-3">
        <span className="text-text-primary font-mono">{entry.value} cm</span>
        <button
          onClick={() => { setDraft(String(entry.value)); setEditing(true); }}
          className="text-text-secondary hover:opacity-80"
          aria-label={`Edit ${label}`}
        ><Pencil size={13} /></button>
        <button
          onClick={() => onDelete(entry.id)}
          className="text-accent-warning hover:opacity-80"
          aria-label={`Delete ${label}`}
        ><X size={13} /></button>
      </div>
    </div>
  );
}

export default function MeasurementEntryList({ measurements, onUpdate, onDelete }: MeasurementEntryListProps) {
  if (measurements.length === 0) return null;
  const recent = [...measurements].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);

  return (
    <div className="space-y-1" role="list" aria-label="Measurement entries">
      {recent.map((entry) => (
        <Row key={entry.id} entry={entry} onUpdate={onUpdate} onDelete={onDelete} />
      ))}
    </div>
  );
}
