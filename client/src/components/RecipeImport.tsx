import { useState } from 'react';
import type { Recipe } from './RecipeList';

interface RecipeImportProps {
  onImport: (optimistic: Recipe, body: any) => void;
}

const PROMPT_TEXT = `I need you to convert a recipe into JSON format. I'll describe the recipe or send a photo/screenshot.

Output ONLY valid JSON, no explanation:

{
  "name": "Recipe Name",
  "steps": "1. Step one\\n2. Step two\\n3. Step three",
  "caloriesPerServing": 400,
  "ingredients": [
    { "name": "Ingredient Name", "quantity": "200", "unit": "g" },
    { "name": "Another Ingredient", "quantity": "2", "unit": "tbsp" }
  ]
}

Rules:
- Estimate calories per serving based on the ingredients and typical portion sizes
- Use metric units (g, ml, tbsp, tsp, cups) for quantities
- Steps should be numbered and separated by newlines
- Include ALL ingredients mentioned
- If quantities aren't specified, estimate reasonable amounts`;

export default function RecipeImport({ onImport }: RecipeImportProps) {
  const [json, setJson] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  function handleImport() {
    setError(null);
    try {
      const data = JSON.parse(json);

      if (!data.name || !data.steps) {
        setError('JSON must have "name" and "steps" fields');
        return;
      }

      const now = Date.now();
      const optimistic: Recipe = {
        id: `temp-${now}`,
        name: data.name,
        steps: data.steps,
        caloriesPerServing: data.caloriesPerServing || 0,
        ingredients: (data.ingredients || []).map((ing: any, i: number) => ({
          id: `temp-ing-${now}-${i}`,
          name: ing.name,
          quantity: ing.quantity || '',
          unit: ing.unit || '',
        })),
      };

      onImport(optimistic, {
        name: data.name,
        steps: data.steps,
        caloriesPerServing: data.caloriesPerServing || 0,
        ingredients: data.ingredients || [],
      });

      setJson('');
    } catch {
      setError('Invalid JSON. Paste the output from the AI prompt.');
    }
  }

  return (
    <div className="bg-card rounded-lg p-4 border border-border space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-text-primary font-semibold">Import Recipe</h3>
        <button onClick={() => setShowPrompt(!showPrompt)} className="text-accent-info text-xs hover:opacity-80">
          {showPrompt ? 'Hide prompt' : 'Show AI prompt'}
        </button>
      </div>

      {showPrompt && (
        <div className="bg-secondary rounded-lg p-3 border border-border">
          <p className="text-text-secondary text-xs mb-2">Copy this prompt into ChatGPT/Claude with your recipe description or photo:</p>
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
        aria-label="Recipe JSON import"
      />

      <button onClick={handleImport} disabled={!json.trim()} className="w-full bg-accent-primary text-primary font-semibold py-2 rounded hover:opacity-90 transition-opacity disabled:opacity-50">
        Import Recipe
      </button>
    </div>
  );
}
