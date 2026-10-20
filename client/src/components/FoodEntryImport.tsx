import { useState } from 'react';
import type { FoodEntry } from './CalorieTracker';
import { localISODate } from '../lib/localDate';

interface FoodEntryImportProps {
  onImport: (entries: { optimistic: FoodEntry; body: any }[]) => void;
  defaultDate?: string;
}

const PROMPT_TEXT = `You are my food-logging assistant for today. I'll send you photos of meals, nutrition labels, or short descriptions of what I ate throughout the day, one message at a time.

Your job: keep a RUNNING log of everything I eat today and, after EACH message I send, reply with:
1. One short line confirming what you added (e.g. "Added: chicken bowl ~620 kcal").
2. The FULL updated JSON for the whole day so far, in a code block.

Be very brief. No extra commentary, no coaching, no disclaimers — just the confirmation line and the JSON.

JSON format (this exact shape):

{
  "date": "YYYY-MM-DD",
  "entries": [
    { "foodName": "Food Name", "calories": 300, "protein": 25, "carbs": 30, "fat": 10, "mealType": "lunch" }
  ]
}

Rules:
- Set "date" to today's date and keep it the same all day.
- Valid mealTypes: breakfast, lunch, dinner, snack.
- protein, carbs, fat are in grams. Round calories to whole numbers, macros to one decimal.
- Break a full meal into individual food items when it makes sense.
- Estimate from the photo / label / description using common food-database values.
- Each new message ADDS to the list — always return the complete day's entries, never just the newest item.

Start by replying "Ready — send your first meal." and nothing else.`;

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
type MealType = (typeof MEAL_TYPES)[number];

function toMealType(value: unknown): MealType | null {
  if (value === undefined || value === null || value === '') return 'snack';
  if (typeof value !== 'string') return null;
  const v = value.trim().toLowerCase();
  if ((MEAL_TYPES as readonly string[]).includes(v)) return v as MealType;
  if (v === 'brunch') return 'lunch';
  if (v === 'supper') return 'dinner';
  if (v === 'snacks' || v === 'dessert') return 'snack';
  return null;
}

function toNonNegative(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return 0;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * Coerce one AI-produced entry into the shape the server accepts
 * (integer calories, numeric macros, lowercase mealType, non-empty name).
 * Returns an error string when the entry can't be salvaged.
 */
export function normalizeFoodEntry(e: any): { fields: { foodName: string; calories: number; protein: number; carbs: number; fat: number; mealType: MealType; date?: string } } | { error: string } {
  if (!e || typeof e !== 'object') return { error: 'not an object' };
  const foodName = typeof e.foodName === 'string' ? e.foodName.trim() : '';
  if (!foodName) return { error: 'missing foodName' };
  const cal = toNonNegative(e.calories);
  if (cal === null) return { error: `${foodName}: invalid calories` };
  const protein = toNonNegative(e.protein);
  const carbs = toNonNegative(e.carbs);
  const fat = toNonNegative(e.fat);
  if (protein === null || carbs === null || fat === null) return { error: `${foodName}: invalid macros` };
  const mealType = toMealType(e.mealType);
  if (!mealType) return { error: `${foodName}: invalid mealType "${e.mealType}"` };
  return { fields: { foodName, calories: Math.round(cal), protein, carbs, fat, mealType, ...(typeof e.date === 'string' && e.date ? { date: e.date } : {}) } };
}

export default function FoodEntryImport({ onImport, defaultDate }: FoodEntryImportProps) {
  const [json, setJson] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  function handleImport() {
    setError(null);
    try {
      const data = JSON.parse(json);
      const entries = Array.isArray(data) ? data : data?.entries || [data];

      if (!Array.isArray(entries) || entries.length === 0) {
        setError('JSON must have an "entries" array with at least one food item');
        return;
      }

      // Date precedence: per-entry date → top-level "date" → the day you're viewing → today.
      const fallbackDate = defaultDate || localISODate();
      const dayDate = typeof data.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.date) ? data.date : fallbackDate;
      const normalized = entries.map((e: any) => normalizeFoodEntry(e));
      const errors = normalized.flatMap((n: any, i: number) => ('error' in n ? [`Entry ${i + 1}: ${n.error}`] : []));
      if (errors.length > 0) {
        setError(`Nothing imported. Fix these entries: ${errors.join('; ')}`);
        return;
      }
      const result = normalized.map((n: any, i: number) => {
        const fields = { ...n.fields, date: n.fields.date || dayDate };
        return { optimistic: { id: `temp-${Date.now()}-${i}`, ...fields } as FoodEntry, body: fields };
      });

      onImport(result);
      setJson('');
    } catch {
      setError('Invalid JSON. Paste the output from the AI prompt.');
    }
  }

  return (
    <div className="bg-card rounded-lg p-4 border border-border space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-text-primary font-semibold">Import Food Log</h3>
        <button onClick={() => setShowPrompt(!showPrompt)} className="text-accent-info text-xs hover:opacity-80">
          {showPrompt ? 'Hide prompt' : 'Show AI prompt'}
        </button>
      </div>

      {showPrompt && (
        <div className="bg-secondary rounded-lg p-3 border border-border">
          <p className="text-text-secondary text-xs mb-2">Copy this prompt into ChatGPT/Claude with a description or photo of your meal:</p>
          <pre className="text-text-primary text-xs whitespace-pre-wrap bg-primary rounded p-2 max-h-48 overflow-y-auto">{PROMPT_TEXT}</pre>
          <button onClick={() => navigator.clipboard.writeText(PROMPT_TEXT)} className="mt-2 text-accent-primary text-xs hover:opacity-80">Copy prompt</button>
        </div>
      )}

      {error && <p className="text-accent-warning text-sm">{error}</p>}

      <textarea
        value={json}
        onChange={(e) => setJson(e.target.value)}
        placeholder='Paste the JSON output from the AI here...'
        className="w-full bg-secondary text-text-primary border border-border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-accent-primary"
        rows={5}
        aria-label="Food JSON import"
      />

      <button onClick={handleImport} disabled={!json.trim()} className="w-full bg-accent-primary text-primary font-semibold py-2 rounded hover:opacity-90 transition-opacity disabled:opacity-50">
        Import Food Entries
      </button>
    </div>
  );
}
