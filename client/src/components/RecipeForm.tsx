import { useState } from 'react';
import type { Recipe } from './RecipeList';

interface IngredientInput {
  name: string;
  quantity: string;
  unit: string;
}

interface RecipeFormProps {
  onCreated: (
    optimistic: Recipe,
    body: { name: string; steps: string; caloriesPerServing: number; ingredients: IngredientInput[] },
  ) => void;
}

export default function RecipeForm({ onCreated }: RecipeFormProps) {
  const [name, setName] = useState('');
  const [steps, setSteps] = useState('');
  const [caloriesPerServing, setCaloriesPerServing] = useState('');
  const [ingredients, setIngredients] = useState<IngredientInput[]>([{ name: '', quantity: '', unit: '' }]);
  const [error, setError] = useState<string | null>(null);

  function addIngredient() {
    setIngredients((prev) => [...prev, { name: '', quantity: '', unit: '' }]);
  }

  function removeIngredient(index: number) {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  }

  function updateIngredient(index: number, field: keyof IngredientInput, value: string) {
    setIngredients((prev) => prev.map((ing, i) => (i === index ? { ...ing, [field]: value } : ing)));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) { setError('Recipe name is required'); return; }

    const trimmedSteps = steps.trim();
    if (!trimmedSteps) { setError('Steps are required'); return; }

    const parsedCal = parseInt(caloriesPerServing, 10);
    if (!caloriesPerServing || isNaN(parsedCal) || parsedCal < 0) {
      setError('Calories per serving must be a non-negative number');
      return;
    }

    const validIngredients = ingredients
      .filter((ing) => ing.name.trim())
      .map((ing) => ({ name: ing.name.trim(), quantity: ing.quantity.trim(), unit: ing.unit.trim() }));

    const now = Date.now();
    const optimistic: Recipe = {
      id: `temp-${now}`,
      name: trimmedName,
      steps: trimmedSteps,
      caloriesPerServing: parsedCal,
      ingredients: validIngredients.map((ing, i) => ({ id: `temp-ing-${now}-${i}`, ...ing })),
    };

    onCreated(optimistic, {
      name: trimmedName,
      steps: trimmedSteps,
      caloriesPerServing: parsedCal,
      ingredients: validIngredients,
    });

    setName('');
    setSteps('');
    setCaloriesPerServing('');
    setIngredients([{ name: '', quantity: '', unit: '' }]);
  }

  return (
    <form onSubmit={handleSubmit} className="bg-card rounded-lg p-4 border border-border space-y-3">
      <h3 className="text-text-primary font-semibold">New Recipe</h3>
      {error && <p className="text-accent-warning text-sm">{error}</p>}

      <input
        type="text"
        placeholder="Recipe name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full bg-secondary text-text-primary border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-accent-primary"
        aria-label="Recipe name"
      />

      <textarea
        placeholder="Preparation steps"
        value={steps}
        onChange={(e) => setSteps(e.target.value)}
        rows={3}
        className="w-full bg-secondary text-text-primary border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-accent-primary resize-y"
        aria-label="Preparation steps"
      />

      <input
        type="number"
        min="0"
        placeholder="Calories per serving"
        value={caloriesPerServing}
        onChange={(e) => setCaloriesPerServing(e.target.value)}
        className="w-full bg-secondary text-text-primary border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-accent-primary"
        aria-label="Calories per serving"
      />

      {/* Ingredients */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-text-primary text-sm font-semibold">Ingredients</h4>
          <button type="button" onClick={addIngredient} className="text-accent-info text-xs hover:opacity-80">
            + Add ingredient
          </button>
        </div>
        {ingredients.map((ing, i) => (
          <div key={i} className="grid grid-cols-[1fr_0.5fr_0.5fr_auto] gap-2 items-center">
            <input
              type="text"
              placeholder="Name"
              value={ing.name}
              onChange={(e) => updateIngredient(i, 'name', e.target.value)}
              className="bg-secondary text-text-primary border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-accent-primary"
              aria-label={`Ingredient ${i + 1} name`}
            />
            <input
              type="text"
              placeholder="Qty"
              value={ing.quantity}
              onChange={(e) => updateIngredient(i, 'quantity', e.target.value)}
              className="bg-secondary text-text-primary border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-accent-primary"
              aria-label={`Ingredient ${i + 1} quantity`}
            />
            <input
              type="text"
              placeholder="Unit"
              value={ing.unit}
              onChange={(e) => updateIngredient(i, 'unit', e.target.value)}
              className="bg-secondary text-text-primary border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-accent-primary"
              aria-label={`Ingredient ${i + 1} unit`}
            />
            {ingredients.length > 1 && (
              <button
                type="button"
                onClick={() => removeIngredient(i)}
                className="text-accent-warning text-xs hover:opacity-80"
                aria-label={`Remove ingredient ${i + 1}`}
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      <button
        type="submit"
        className="w-full bg-accent-primary text-primary font-semibold py-2 rounded hover:opacity-90 transition-opacity"
      >
        Create Recipe
      </button>
    </form>
  );
}
