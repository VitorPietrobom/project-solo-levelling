import { useState } from 'react';
import type { WeightEntry } from './WeightChart';

interface WeightFormProps {
  onCreated: (optimistic: WeightEntry, body: { weight: number; date: string }) => void;
}

export default function WeightForm({ onCreated }: WeightFormProps) {
  const [weight, setWeight] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = parseFloat(weight);
    if (!weight || isNaN(parsed) || parsed <= 0) {
      setError('Weight must be a positive number');
      return;
    }

    if (!date) {
      setError('Date is required');
      return;
    }

    const optimistic: WeightEntry = {
      id: `temp-${Date.now()}`,
      weight: parsed,
      date,
    };

    onCreated(optimistic, { weight: parsed, date });
    setWeight('');
  }

  return (
    <form onSubmit={handleSubmit} className="bg-card rounded-lg p-4 border border-border space-y-3">
      <h3 className="text-text-primary font-semibold">Log Weight</h3>
      {error && <p className="text-accent-warning text-sm">{error}</p>}
      <div className="flex gap-2">
        <input
          type="number"
          step="0.1"
          placeholder="Weight (kg)"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          className="flex-1 bg-secondary text-text-primary border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-accent-primary"
          aria-label="Weight in kg"
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="bg-secondary text-text-primary border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-accent-primary"
          aria-label="Entry date"
        />
      </div>
      <button
        type="submit"
        className="w-full bg-accent-primary text-primary font-semibold py-2 rounded hover:opacity-90 transition-opacity"
      >
        Log Entry
      </button>
    </form>
  );
}
