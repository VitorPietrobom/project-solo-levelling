import { useState } from 'react';
import type { FoodEntry } from './CalorieTracker';

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

export default function FoodEntryImport({ onImport, defaultDate }: FoodEntryImportProps) {
  const [json, setJson] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  function handleImport() {
    setError(null);
    try {
      const data = JSON.parse(json);
      const entries = data.entries || [data];

      if (!Array.isArray(entries) || entries.length === 0) {
        setError('JSON must have an "entries" array with at least one food item');
        return;
      }

      // Date precedence: per-entry date → top-level "date" → the day you're viewing → today.
      const fallbackDate = defaultDate || new Date().toISOString().split('T')[0];
      const dayDate = typeof data.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.date) ? data.date : fallbackDate;
      const result = entries.map((e: any, i: number) => {
        const date = e.date || dayDate;
        const fields = {
          foodName: e.foodName,
          calories: e.calories || 0,
          protein: e.protein || 0,
          carbs: e.carbs || 0,
          fat: e.fat || 0,
          mealType: e.mealType || 'snack',
          date,
        };
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
