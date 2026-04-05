import { useState } from 'react';
import type { GymSession } from './GymSessionLog';

const MUSCLE_GROUPS = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps',
  'quads', 'hamstrings', 'glutes', 'calves', 'abs', 'forearms',
] as const;

interface ExerciseRow {
  name: string;
  sets: string;
  reps: string;
  weight: string;
  muscleGroups: string[];
}

interface GymSessionFormProps {
  onCreated: (
    optimistic: GymSession,
    body: {
      date: string;
      notes: string;
      exercises: {
        name: string;
        sets: number;
        reps: number;
        weight: number;
        muscleGroups: string[];
      }[];
    },
  ) => void;
}

function emptyExercise(): ExerciseRow {
  return { name: '', sets: '', reps: '', weight: '', muscleGroups: [] };
}

export default function GymSessionForm({ onCreated }: GymSessionFormProps) {
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [exercises, setExercises] = useState<ExerciseRow[]>([emptyExercise()]);
  const [error, setError] = useState<string | null>(null);

  function updateExercise(index: number, field: keyof ExerciseRow, value: string | string[]) {
    setExercises((prev) =>
      prev.map((ex, i) => (i === index ? { ...ex, [field]: value } : ex)),
    );
  }

  function toggleMuscleGroup(index: number, group: string) {
    setExercises((prev) =>
      prev.map((ex, i) => {
        if (i !== index) return ex;
        const has = ex.muscleGroups.includes(group);
        return {
          ...ex,
          muscleGroups: has
            ? ex.muscleGroups.filter((g) => g !== group)
            : [...ex.muscleGroups, group],
        };
      }),
    );
  }

  function addExercise() {
    setExercises((prev) => [...prev, emptyExercise()]);
  }

  function removeExercise(index: number) {
    setExercises((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!date) {
      setError('Date is required');
      return;
    }

    const parsed = exercises.map((ex) => ({
      name: ex.name.trim(),
      sets: parseInt(ex.sets, 10),
      reps: parseInt(ex.reps, 10),
      weight: parseFloat(ex.weight),
      muscleGroups: ex.muscleGroups,
    }));

    if (parsed.some((ex) => !ex.name)) {
      setError('All exercises must have a name');
      return;
    }

    if (parsed.some((ex) => isNaN(ex.sets) || ex.sets <= 0)) {
      setError('Sets must be a positive number');
      return;
    }

    if (parsed.some((ex) => isNaN(ex.reps) || ex.reps <= 0)) {
      setError('Reps must be a positive number');
      return;
    }

    if (parsed.some((ex) => isNaN(ex.weight) || ex.weight < 0)) {
      setError('Weight must be a non-negative number');
      return;
    }

    const optimistic: GymSession = {
      id: `temp-${Date.now()}`,
      date,
      notes: notes.trim() || null,
      exercises: parsed.map((ex, i) => ({
        id: `temp-ex-${Date.now()}-${i}`,
        name: ex.name,
        sets: ex.sets,
        reps: ex.reps,
        weight: ex.weight,
        muscleGroups: ex.muscleGroups.map((mg) => ({ muscleGroup: mg })),
      })),
    };

    onCreated(optimistic, {
      date,
      notes: notes.trim(),
      exercises: parsed,
    });

    setNotes('');
    setExercises([emptyExercise()]);
  }

  return (
    <form onSubmit={handleSubmit} className="bg-card rounded-lg p-4 border border-border space-y-4">
      <h3 className="text-text-primary font-semibold">Log Gym Session</h3>
      {error && <p className="text-accent-warning text-sm">{error}</p>}

      <div className="flex gap-2">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="bg-secondary text-text-primary border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-accent-primary"
          aria-label="Session date"
        />
        <input
          type="text"
          placeholder="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="flex-1 bg-secondary text-text-primary border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-accent-primary"
          aria-label="Session notes"
        />
      </div>

      {exercises.map((ex, idx) => (
        <div key={idx} className="bg-secondary rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-text-primary text-sm font-medium">Exercise {idx + 1}</span>
            {exercises.length > 1 && (
              <button
                type="button"
                onClick={() => removeExercise(idx)}
                className="text-accent-warning text-xs hover:opacity-80"
                aria-label={`Remove exercise ${idx + 1}`}
              >
                Remove
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <input
              type="text"
              placeholder="Name"
              value={ex.name}
              onChange={(e) => updateExercise(idx, 'name', e.target.value)}
              className="bg-primary text-text-primary border border-border rounded px-2 py-1.5 text-sm focus:outline-none focus:border-accent-primary col-span-2 sm:col-span-1"
              aria-label={`Exercise ${idx + 1} name`}
            />
            <input
              type="number"
              placeholder="Sets"
              value={ex.sets}
              onChange={(e) => updateExercise(idx, 'sets', e.target.value)}
              className="bg-primary text-text-primary border border-border rounded px-2 py-1.5 text-sm focus:outline-none focus:border-accent-primary"
              aria-label={`Exercise ${idx + 1} sets`}
            />
            <input
              type="number"
              placeholder="Reps"
              value={ex.reps}
              onChange={(e) => updateExercise(idx, 'reps', e.target.value)}
              className="bg-primary text-text-primary border border-border rounded px-2 py-1.5 text-sm focus:outline-none focus:border-accent-primary"
              aria-label={`Exercise ${idx + 1} reps`}
            />
            <input
              type="number"
              step="0.5"
              placeholder="Weight (kg)"
              value={ex.weight}
              onChange={(e) => updateExercise(idx, 'weight', e.target.value)}
              className="bg-primary text-text-primary border border-border rounded px-2 py-1.5 text-sm focus:outline-none focus:border-accent-primary"
              aria-label={`Exercise ${idx + 1} weight`}
            />
          </div>
          <div>
            <p className="text-text-secondary text-xs mb-1">Muscle groups:</p>
            <div className="flex flex-wrap gap-1">
              {MUSCLE_GROUPS.map((mg) => (
                <button
                  key={mg}
                  type="button"
                  onClick={() => toggleMuscleGroup(idx, mg)}
                  className={`px-2 py-0.5 text-xs rounded ${
                    ex.muscleGroups.includes(mg)
                      ? 'bg-accent-primary text-primary font-semibold'
                      : 'bg-primary text-text-secondary hover:text-text-primary'
                  }`}
                  aria-label={`Toggle ${mg} for exercise ${idx + 1}`}
                  aria-pressed={ex.muscleGroups.includes(mg)}
                >
                  {mg}
                </button>
              ))}
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addExercise}
        className="text-accent-info text-sm hover:opacity-80"
      >
        + Add Exercise
      </button>

      <button
        type="submit"
        className="w-full bg-accent-primary text-primary font-semibold py-2 rounded hover:opacity-90 transition-opacity"
      >
        Log Session
      </button>
    </form>
  );
}
