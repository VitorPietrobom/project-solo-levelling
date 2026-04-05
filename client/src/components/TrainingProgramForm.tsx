import { useState } from 'react';
import type { TrainingProgram } from './TrainingProgramView';

interface TrainingProgramFormProps {
  onCreated: (
    optimistic: TrainingProgram,
    body: {
      name: string;
      days: {
        dayOfWeek: string;
        exercises: { name: string; sets: number; reps: number; targetWeight: number }[];
      }[];
    },
  ) => void;
}

interface FormExercise {
  name: string;
  sets: string;
  reps: string;
  targetWeight: string;
}

interface FormDay {
  dayOfWeek: string;
  exercises: FormExercise[];
}

const DAY_OPTIONS = [
  { value: 'mon', label: 'Mon' },
  { value: 'tue', label: 'Tue' },
  { value: 'wed', label: 'Wed' },
  { value: 'thu', label: 'Thu' },
  { value: 'fri', label: 'Fri' },
  { value: 'sat', label: 'Sat' },
  { value: 'sun', label: 'Sun' },
];

const emptyExercise = (): FormExercise => ({ name: '', sets: '3', reps: '10', targetWeight: '0' });
const emptyDay = (): FormDay => ({ dayOfWeek: 'mon', exercises: [emptyExercise()] });

export default function TrainingProgramForm({ onCreated }: TrainingProgramFormProps) {
  const [name, setName] = useState('');
  const [days, setDays] = useState<FormDay[]>([emptyDay()]);
  const [error, setError] = useState<string | null>(null);

  function updateDay(dayIndex: number, field: keyof FormDay, value: string) {
    setDays((prev) =>
      prev.map((d, i) => (i === dayIndex ? { ...d, [field]: value } : d)),
    );
  }

  function addDay() {
    setDays((prev) => [...prev, emptyDay()]);
  }

  function removeDay(dayIndex: number) {
    setDays((prev) => prev.filter((_, i) => i !== dayIndex));
  }

  function updateExercise(dayIndex: number, exIndex: number, field: keyof FormExercise, value: string) {
    setDays((prev) =>
      prev.map((d, di) =>
        di === dayIndex
          ? {
              ...d,
              exercises: d.exercises.map((ex, ei) =>
                ei === exIndex ? { ...ex, [field]: value } : ex,
              ),
            }
          : d,
      ),
    );
  }

  function addExercise(dayIndex: number) {
    setDays((prev) =>
      prev.map((d, i) =>
        i === dayIndex ? { ...d, exercises: [...d.exercises, emptyExercise()] } : d,
      ),
    );
  }

  function removeExercise(dayIndex: number, exIndex: number) {
    setDays((prev) =>
      prev.map((d, di) =>
        di === dayIndex
          ? { ...d, exercises: d.exercises.filter((_, ei) => ei !== exIndex) }
          : d,
      ),
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Program name is required');
      return;
    }

    // Validate: at least one day with at least one exercise with a name
    const validDays = days.filter(
      (d) => d.exercises.some((ex) => ex.name.trim()),
    );

    if (validDays.length === 0) {
      setError('At least one day with at least one exercise is required');
      return;
    }

    const now = Date.now();
    const body = {
      name: name.trim(),
      days: validDays.map((d) => ({
        dayOfWeek: d.dayOfWeek,
        exercises: d.exercises
          .filter((ex) => ex.name.trim())
          .map((ex) => ({
            name: ex.name.trim(),
            sets: parseInt(ex.sets) || 3,
            reps: parseInt(ex.reps) || 10,
            targetWeight: parseFloat(ex.targetWeight) || 0,
          })),
      })),
    };

    const optimistic: TrainingProgram = {
      id: `temp-${now}`,
      name: body.name,
      active: false,
      days: body.days.map((d, di) => ({
        id: `temp-day-${now}-${di}`,
        dayOfWeek: d.dayOfWeek,
        exercises: d.exercises.map((ex, ei) => ({
          id: `temp-ex-${now}-${di}-${ei}`,
          name: ex.name,
          sets: ex.sets,
          reps: ex.reps,
          targetWeight: ex.targetWeight,
          sortOrder: ei,
        })),
      })),
    };

    onCreated(optimistic, body);
    setName('');
    setDays([emptyDay()]);
  }

  return (
    <form onSubmit={handleSubmit} className="bg-card rounded-lg p-4 border border-border space-y-4">
      <h3 className="text-text-primary font-semibold">New Training Program</h3>
      {error && <p className="text-accent-warning text-sm">{error}</p>}

      <input
        type="text"
        placeholder="Program name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full bg-secondary text-text-primary border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-accent-primary"
        aria-label="Program name"
      />

      {days.map((day, dayIndex) => (
        <div key={dayIndex} className="bg-secondary rounded-lg p-3 border border-border space-y-2">
          <div className="flex items-center justify-between">
            <select
              value={day.dayOfWeek}
              onChange={(e) => updateDay(dayIndex, 'dayOfWeek', e.target.value)}
              className="bg-primary text-text-primary border border-border rounded px-2 py-1 text-sm focus:outline-none focus:border-accent-primary"
              aria-label={`Day ${dayIndex + 1} of week`}
            >
              {DAY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {days.length > 1 && (
              <button
                type="button"
                onClick={() => removeDay(dayIndex)}
                className="text-accent-warning text-xs hover:opacity-80"
                aria-label={`Remove day ${dayIndex + 1}`}
              >
                Remove day
              </button>
            )}
          </div>

          {day.exercises.map((ex, exIndex) => (
            <div key={exIndex} className="flex gap-2 items-center">
              <input
                type="text"
                placeholder="Exercise"
                value={ex.name}
                onChange={(e) => updateExercise(dayIndex, exIndex, 'name', e.target.value)}
                className="flex-1 bg-primary text-text-primary border border-border rounded px-2 py-1 text-sm focus:outline-none focus:border-accent-primary"
                aria-label={`Exercise ${exIndex + 1} name`}
              />
              <input
                type="number"
                placeholder="Sets"
                value={ex.sets}
                onChange={(e) => updateExercise(dayIndex, exIndex, 'sets', e.target.value)}
                className="w-14 bg-primary text-text-primary border border-border rounded px-2 py-1 text-sm text-center focus:outline-none focus:border-accent-primary"
                aria-label={`Exercise ${exIndex + 1} sets`}
              />
              <input
                type="number"
                placeholder="Reps"
                value={ex.reps}
                onChange={(e) => updateExercise(dayIndex, exIndex, 'reps', e.target.value)}
                className="w-14 bg-primary text-text-primary border border-border rounded px-2 py-1 text-sm text-center focus:outline-none focus:border-accent-primary"
                aria-label={`Exercise ${exIndex + 1} reps`}
              />
              <input
                type="number"
                step="0.5"
                placeholder="kg"
                value={ex.targetWeight}
                onChange={(e) => updateExercise(dayIndex, exIndex, 'targetWeight', e.target.value)}
                className="w-16 bg-primary text-text-primary border border-border rounded px-2 py-1 text-sm text-center focus:outline-none focus:border-accent-primary"
                aria-label={`Exercise ${exIndex + 1} target weight`}
              />
              {day.exercises.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeExercise(dayIndex, exIndex)}
                  className="text-accent-warning text-xs hover:opacity-80"
                  aria-label={`Remove exercise ${exIndex + 1}`}
                >
                  ✕
                </button>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={() => addExercise(dayIndex)}
            className="text-accent-info text-xs hover:opacity-80"
          >
            + Add exercise
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addDay}
        className="text-accent-info text-sm hover:opacity-80"
      >
        + Add day
      </button>

      <button
        type="submit"
        className="w-full bg-accent-primary text-primary font-semibold py-2 rounded hover:opacity-90 transition-opacity"
      >
        Create Program
      </button>
    </form>
  );
}
