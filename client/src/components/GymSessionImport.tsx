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

export default function GymSessionImport({ onImport }: GymSessionImportProps) {
  const [json, setJson] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  function handleImport() {
    setError(null);
    try {
      const data = JSON.parse(json);

      if (!data.date || !Array.isArray(data.exercises) || data.exercises.length === 0) {
        setError('JSON must have "date" and non-empty "exercises" array');
        return;
      }

      const optimistic: GymSession = {
        id: `temp-${Date.now()}`,
        date: data.date,
        notes: data.notes || null,
        exercises: data.exercises.map((ex: any, i: number) => ({
          id: `temp-ex-${Date.now()}-${i}`,
          name: ex.name,
          sets: ex.sets,
          reps: ex.reps,
          weight: ex.weight,
          muscleGroups: (ex.muscleGroups || []).map((mg: string) => ({ muscleGroup: mg })),
        })),
      };

      onImport(optimistic, {
        date: data.date,
        notes: data.notes || '',
        exercises: data.exercises,
      });

      setJson('');
    } catch {
      setError('Invalid JSON. Paste the output from the AI prompt.');
    }
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
