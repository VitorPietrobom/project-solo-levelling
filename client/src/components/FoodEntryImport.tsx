import { useState } from 'react';
import type { FoodEntry } from './CalorieTracker';

interface FoodEntryImportProps {
  onImport: (entries: { optimistic: FoodEntry; body: any }[]) => void;
}

const PROMPT_TEXT = `I need you to convert my meal/food into JSON format for calorie and macro tracking. I'll describe what I ate or send a photo of my meal.

Output ONLY valid JSON, no explanation:

{
  "entries": [
    {
      "foodName": "Food Name",
      "calories": 300,
      "protein": 25,
      "carbs": 30,
      "fat": 10,
      "mealType": "lunch"
    }
  ]
}

Valid mealTypes: breakfast, lunch, dinner, snack

Rules:
- Estimate calories and macros as accurately as possible based on typical serving sizes
- protein, carbs, fat in grams
- If I describe a full meal, break it into individual food items
- Use common food database values for estimates
- Round to nearest whole number for calories, one decimal for macros`;

export default function FoodEntryImport({ onImport }: FoodEntryImportProps) {
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

      const today = new Date().toISOString().split('T')[0];
      const result = entries.map((e: any, i: number) => ({
        optimistic: {
          id: `temp-${Date.now()}-${i}`,
          foodName: e.foodName,
          calories: e.calories || 0,
          protein: e.protein || 0,
          carbs: e.carbs || 0,
          fat: e.fat || 0,
          mealType: e.mealType || 'snack',
          date: e.date || today,
        } as FoodEntry,
        body: {
          foodName: e.foodName,
          calories: e.calories || 0,
          protein: e.protein || 0,
          carbs: e.carbs || 0,
          fat: e.fat || 0,
          mealType: e.mealType || 'snack',
          date: e.date || today,
        },
      }));

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
