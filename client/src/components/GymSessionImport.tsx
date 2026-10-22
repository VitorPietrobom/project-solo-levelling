import { useState } from 'react';
import type { GymSession } from './GymSessionLog';

interface GymSessionImportProps {
  onImport: (
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
  /** Pre-fill from a previous submission whose save failed (OE-045). */
  initial?: { date: string; notes: string; exercises: unknown[] };
}

export const MUSCLE_GROUPS = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'quads', 'hamstrings', 'glutes', 'calves', 'abs', 'forearms'];

type ImportBody = Parameters<GymSessionImportProps['onImport']>[1];

function toNumber(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && v.trim() !== '') return Number(v);
  return NaN;
}

/** Validate and coerce pasted Hevy JSON (OE-044). Returns a specific error message on failure. */
export function validateHevyImport(
  data: unknown,
): { ok: true; body: ImportBody } | { ok: false; error: string } {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, error: 'JSON must be an object with "date" and "exercises"' };
  }
  const d = data as Record<string, unknown>;
  if (typeof d.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d.date) || Number.isNaN(Date.parse(d.date))) {
    return { ok: false, error: '"date" must be a valid date in YYYY-MM-DD format' };
  }
  if (d.notes != null && typeof d.notes !== 'string') {
    return { ok: false, error: '"notes" must be a string' };
  }
  if (!Array.isArray(d.exercises) || d.exercises.length === 0) {
    return { ok: false, error: 'JSON must have a non-empty "exercises" array' };
  }
  const exercises: ImportBody['exercises'] = [];
  for (let i = 0; i < d.exercises.length; i++) {
    const raw = d.exercises[i];
    const label = `Exercise ${i + 1}`;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return { ok: false, error: `${label} must be an object` };
    }
    const ex = raw as Record<string, unknown>;
    const name = typeof ex.name === 'string' ? ex.name.trim() : '';
    if (!name) return { ok: false, error: `${label}: "name" is required` };
    const who = `${label} (${name})`;
    const sets = toNumber(ex.sets);
    if (!Number.isInteger(sets) || sets < 1) {
      return { ok: false, error: `${who}: "sets" must be a whole number of at least 1` };
    }
    const reps = toNumber(ex.reps);
    if (!Number.isInteger(reps) || reps < 1) {
      return { ok: false, error: `${who}: "reps" must be a whole number of at least 1` };
    }
    const weight = ex.weight == null ? 0 : toNumber(ex.weight);
    if (!Number.isFinite(weight) || weight < 0) {
      return { ok: false, error: `${who}: "weight" must be a number of 0 or more` };
    }
    let groups: unknown = ex.muscleGroups ?? [];
    if (typeof groups === 'string') groups = [groups];
    if (!Array.isArray(groups)) {
      return { ok: false, error: `${who}: "muscleGroups" must be a list` };
    }
    const muscleGroups: string[] = [];
    for (const g of groups) {
      const mg = typeof g === 'string' ? g.trim().toLowerCase() : '';
      if (!MUSCLE_GROUPS.includes(mg)) {
        return { ok: false, error: `${who}: unknown muscle group "${String(g)}". Valid: ${MUSCLE_GROUPS.join(', ')}` };
      }
      if (!muscleGroups.includes(mg)) muscleGroups.push(mg);
    }
    exercises.push({ name, sets, reps, weight, muscleGroups });
  }
  return { ok: true, body: { date: d.date, notes: (d.notes as string | undefined) ?? '', exercises } };
}

const PROMPT_TEXT = `I need you to convert my Hevy workout screenshot into this exact JSON format. Look at the exercises, sets, reps, and weights in the image and map them to the correct muscle groups.

Output ONLY valid JSON, no explanation:

{
  "date": "YYYY-MM-DD",
  "notes": "workout name from the screenshot",
  "exercises": [
    {
      "name": "Exercise Name",
      "sets": 3,
      "reps": 10,
      "weight": 80,
      "muscleGroups": ["chest", "triceps"]
    }
  ]
}

Valid muscleGroups: chest, back, shoulders, biceps, triceps, quads, hamstrings, glutes, calves, abs, forearms

Rules:
- Use the exact exercise names from the screenshot
- For sets/reps, use the working sets (skip warmup if marked)
- If multiple set counts, use the most common rep count
- Weight in kg. For bodyweight exercises (pull-ups, push-ups, dips, etc.), set weight to 0
- Map each exercise to its PRIMARY muscle groups (1-3 groups per exercise)
- Common mappings: Bench Press → chest, triceps, shoulders | Squat → quads, glutes | Deadlift → back, hamstrings, glutes | Pull-up → back, biceps | OHP → shoulders, triceps | Push-up → chest, triceps | Dip → chest, triceps | Plank → abs | Crunch → abs | Leg Raise → abs`;

export default function GymSessionImport({ onImport, initial }: GymSessionImportProps) {
  const [json, setJson] = useState(() => (initial ? JSON.stringify(initial, null, 2) : ''));
  const [error, setError] = useState<string | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  function handleImport() {
    setError(null);
    let data: unknown;
    try {
      data = JSON.parse(json);
    } catch {
      setError('Invalid JSON. Paste the output from the AI prompt.');
      return;
    }

    const result = validateHevyImport(data);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const body = result.body;

    const optimistic: GymSession = {
      id: `temp-${Date.now()}`,
      date: body.date,
      notes: body.notes || null,
      exercises: body.exercises.map((ex, i) => ({
        id: `temp-ex-${Date.now()}-${i}`,
        name: ex.name,
        sets: ex.sets,
        reps: ex.reps,
        weight: ex.weight,
        muscleGroups: ex.muscleGroups.map((mg) => ({ muscleGroup: mg })),
      })),
    };

    // Keep the textarea content: the parent unmounts this form on submit and
    // re-opens it pre-filled if the save fails (OE-045).
    onImport(optimistic, body);
  }

  return (
    <div className="bg-card rounded-lg p-4 border border-border space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-text-primary font-semibold">Import from Hevy</h3>
        <button
          onClick={() => setShowPrompt(!showPrompt)}
          className="text-accent-info text-xs hover:opacity-80"
        >
          {showPrompt ? 'Hide prompt' : 'Show AI prompt'}
        </button>
      </div>

      {showPrompt && (
        <div className="bg-secondary rounded-lg p-3 border border-border">
          <p className="text-text-secondary text-xs mb-2">
            Copy this prompt, paste it into ChatGPT/Claude along with your Hevy screenshot:
          </p>
          <pre className="text-text-primary text-xs whitespace-pre-wrap bg-primary rounded p-2 max-h-48 overflow-y-auto">
            {PROMPT_TEXT}
          </pre>
          <button
            onClick={() => navigator.clipboard.writeText(PROMPT_TEXT)}
            className="mt-2 text-accent-primary text-xs hover:opacity-80"
          >
            Copy prompt
          </button>
        </div>
      )}

      {error && <p className="text-accent-warning text-sm">{error}</p>}

      <textarea
        value={json}
        onChange={(e) => setJson(e.target.value)}
        placeholder='Paste the JSON output from the AI here...'
        className="w-full bg-secondary text-text-primary border border-border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-accent-primary"
        rows={6}
        aria-label="Hevy JSON import"
      />

      <button
        onClick={handleImport}
        disabled={!json.trim()}
        className="w-full bg-accent-primary text-primary font-semibold py-2 rounded hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        Import Session
      </button>
    </div>
  );
}
