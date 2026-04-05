import { useState } from 'react';
import type { Measurement } from './MeasurementList';

interface MeasurementFormProps {
  onCreated: (
    optimistic: Measurement,
    body: { type: string; value: number; date: string },
  ) => void;
}

const TYPES: Measurement['type'][] = ['chest', 'waist', 'hips', 'arms', 'thighs'];

export default function MeasurementForm({ onCreated }: MeasurementFormProps) {
  const [type, setType] = useState<Measurement['type']>('chest');
  const [value, setValue] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = parseFloat(value);
    if (!value || isNaN(parsed) || parsed <= 0) {
      setError('Value must be a positive number');
      return;
    }

    if (!date) {
      setError('Date is required');
      return;
    }

    const optimistic: Measurement = {
      id: `temp-${Date.now()}`,
      type,
      value: parsed,
      date,
    };

    onCreated(optimistic, { type, value: parsed, date });
    setValue('');
  }

  return (
    <form onSubmit={handleSubmit} className="bg-card rounded-lg p-4 border border-border space-y-3">
      <h3 className="text-text-primary font-semibold">Log Measurement</h3>
      {error && <p className="text-accent-warning text-sm">{error}</p>}
      <div className="flex gap-2">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as Measurement['type'])}
          className="bg-secondary text-text-primary border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-accent-primary"
          aria-label="Measurement type"
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </option>
          ))}
        </select>
        <input
          type="number"
          step="0.1"
          placeholder="Value (cm)"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="flex-1 bg-secondary text-text-primary border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-accent-primary"
          aria-label="Measurement value"
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="bg-secondary text-text-primary border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-accent-primary"
          aria-label="Measurement date"
        />
      </div>
      <button
        type="submit"
        className="w-full bg-accent-primary text-primary font-semibold py-2 rounded hover:opacity-90 transition-opacity"
      >
        Log Measurement
      </button>
    </form>
  );
}
