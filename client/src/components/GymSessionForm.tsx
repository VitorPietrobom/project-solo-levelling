import { useState } from 'react';
import type { GymSession } from './GymSessionLog';

interface GymSessionFormProps {
  onCreated: (
    optimistic: GymSession,
    body: {
      date: string;
      notes: string;
      exercises: { name: string; sets: number; reps: number; weight: number; muscleGroups: string[] }[];
    },
  ) => void;
}

interface FormExercise {
  name: string;
  sets: string;
  reps: string;
  weight: string;
  muscleGroups: string[];
}

const MUSCLE_GROUPS = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'quads', 'hamstrings', 'glutes', 'calves', 'abs', 'forearms'];

const emptyExercise = (): FormExercise => ({ name: '', sets: '3', reps: '10', weight: '0', muscleGroups: [] });

export default function GymSessionForm({ onCreated }: GymSessionFormProps) {
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [exercises, setExercises] = useState<FormExercise[]>([emptyExercise()]);
  const [error, setError] = useState<string | null>(null);

  function updateExercise(index: number, field: keyof FormExercise, value: string) {
    setExercises((prev) => prev.map((ex, i) => (i === index ? { ...ex, [field]: value } : ex)));
  }

  function toggleMuscleGroup(index: number, group: string) {
    setExercises((prev) => prev.map((ex, i) => {
      if (i !== index) return ex;
      const has = ex.muscleGroups.includes(group);
      return { ...ex, muscleGroups: has ? ex.muscleGroups.filter((g) => g !== group) : [...ex.muscleGroups, group] };
    }));
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
    const validExercises = exercises.filter((ex) => ex.name.trim());
    if (validExercises.length === 0) {
      setError('At least one exercise with a name is required');
      return;
    }

    const now = Date.now();
    const body = {
      date,
      notes: notes.trim(),
      exercises: validExercises.map((ex) => ({
        name: ex.name.trim(),
        sets: parseInt(ex.sets) || 1,
        reps: parseInt(ex.reps) || 1,
        weight: parseFloat(ex.weight) || 0,
        muscleGroups: ex.muscleGroups,
      })),
    };

    const optimistic: GymSession = {
      id: `temp-${now}`,
      date: body.date,
      notes: body.notes || null,
      exercises: body.exercises.map((ex, i) => ({
        id: `temp-ex-${now}-${i}`,
        name: ex.name,
        sets: ex.sets,
        reps: ex.reps,
        weight: ex.weight,
        muscleGroups: ex.muscleGroups.map((mg) => ({ muscleGroup: mg })),
      })),
    };

    onCreated(optimistic, body);
    setNotes('');
    setExercises([emptyExercise()]);
  }

  return (
    <form onSubmit={handleSubmit} className="bg-card rounded-lg p-4 border border-border space-y-3">
      <h3 className="text-text-primary font-semibold">Log Gym Session</h3>
      {error && <p className="text-accent-warning text-sm">{error}</p>}

      <div className="flex gap-2">
        <input
          type="date" value={date} onChange={(e) => setDate(e.target.value)}
          className="bg-secondary text-text-primary border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-accent-primary"
          aria-label="Session date"
        />
        <input
          type="text" placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)}
          className="flex-1 bg-secondary text-text-primary border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-accent-primary"
          aria-label="Session notes"
        />
      </div>

      {exercises.map((ex, index) => (
        <div key={index} className="bg-secondary rounded-lg p-3 border border-border space-y-2">
          <div className="flex gap-2 items-center">
            <input
              type="text" placeholder="Exercise" value={ex.name}
              onChange={(e) => updateExercise(index, 'name', e.target.value)}
              className="flex-1 bg-primary text-text-primary border border-border rounded px-2 py-1 text-sm focus:outline-none focus:border-accent-primary"
              aria-label={`Exercise ${index + 1} name`}
            />
            <input
              type="number" placeholder="Sets" value={ex.sets}
              onChange={(e) => updateExercise(index, 'sets', e.target.value)}
              className="w-14 bg-primary text-text-primary border border-border rounded px-2 py-1 text-sm text-center focus:outline-none focus:border-accent-primary"
              aria-label={`Exercise ${index + 1} sets`}
            />
            <input
              type="number" placeholder="Reps" value={ex.reps}
              onChange={(e) => updateExercise(index, 'reps', e.target.value)}
              className="w-14 bg-primary text-text-primary border border-border rounded px-2 py-1 text-sm text-center focus:outline-none focus:border-accent-primary"
              aria-label={`Exercise ${index + 1} reps`}
            />
            <input
              type="number" step="0.5" placeholder="kg" value={ex.weight}
              onChange={(e) => updateExercise(index, 'weight', e.target.value)}
              className="w-16 bg-primary text-text-primary border border-border rounded px-2 py-1 text-sm text-center focus:outline-none focus:border-accent-primary"
              aria-label={`Exercise ${index + 1} weight in kg — 0 for bodyweight`}
            />
            {exercises.length > 1 && (
              <button
                type="button" onClick={() => removeExercise(index)}
                className="text-accent-warning text-xs hover:opacity-80"
                aria-label={`Remove exercise ${index + 1}`}
              >✕</button>
            )}
          </div>
          <div className="flex flex-wrap gap-1">
            {MUSCLE_GROUPS.map((group) => {
              const on = ex.muscleGroups.includes(group);
              return (
                <button
                  key={group} type="button"
                  onClick={() => toggleMuscleGroup(index, group)}
                  aria-pressed={on}
                  className={`text-xs px-2 py-0.5 rounded-full border ${on ? 'bg-accent-primary text-primary border-transparent' : 'bg-primary text-text-secondary border-border'}`}
                >{group}</button>
              );
            })}
          </div>
        </div>
      ))}

      <button type="button" onClick={addExercise} className="text-accent-info text-sm hover:opacity-80">
        + Add exercise
      </button>

      <button type="submit" className="w-full bg-accent-primary text-primary font-semibold py-2 rounded hover:opacity-90 transition-opacity">
        Save Session
      </button>
    </form>
  );
}
