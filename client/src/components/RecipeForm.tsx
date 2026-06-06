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
    body: {
      name: string;
      steps: string;
      caloriesPerServing: number;
      protein: number;
      carbs: number;
      fat: number;
      servings: number;
      ingredients: IngredientInput[];
    },
  ) => void;
}

export default function RecipeForm({ onCreated }: RecipeFormProps) {
  const [name, setName] = useState('');
  const [steps, setSteps] = useState('');
  const [caloriesPerServing, setCaloriesPerServing] = useState('');
  const [servings, setServings] = useState('1');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
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

    const parseMacro = (v: string): number => {
      const n = parseInt(v, 10);
      return !v || isNaN(n) || n < 0 ? 0 : n;
    };
    const parsedProtein = parseMacro(protein);
    const parsedCarbs = parseMacro(carbs);
    const parsedFat = parseMacro(fat);

    const parsedServings = (() => {
      const n = parseInt(servings, 10);
      return !servings || isNaN(n) || n < 1 ? 1 : n;
    })();

    const validIngredients = ingredients
      .filter((ing) => ing.name.trim())
      .map((ing) => ({ name: ing.name.trim(), quantity: ing.quantity.trim(), unit: ing.unit.trim() }));

    const now = Date.now();
    const optimistic: Recipe = {
      id: `temp-${now}`,
      name: trimmedName,
      steps: trimmedSteps,
      caloriesPerServing: parsedCal,
      protein: parsedProtein,
      carbs: parsedCarbs,
      fat: parsedFat,
      servings: parsedServings,
      ingredients: validIngredients.map((ing, i) => ({ id: `temp-ing-${now}-${i}`, ...ing })),
    };

    onCreated(optimistic, {
      name: trimmedName,
      steps: trimmedSteps,
      caloriesPerServing: parsedCal,
      protein: parsedProtein,
      carbs: parsedCarbs,
      fat: parsedFat,
      servings: parsedServings,
      ingredients: validIngredients,
    });

    setName('');
    setSteps('');
    setCaloriesPerServing('');
    setServings('1');
    setProtein('');
    setCarbs('');
    setFat('');
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

      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          min="0"
          placeholder="Calories per serving"
          value={caloriesPerServing}
          onChange={(e) => setCaloriesPerServing(e.target.value)}
          className="w-full bg-secondary text-text-primary border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-accent-primary"
          aria-label="Calories per serving"
        />
        <input
          type="number"
          min="1"
          placeholder="Servings"
          value={servings}
          onChange={(e) => setServings(e.target.value)}
          className="w-full bg-secondary text-text-primary border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-accent-primary"
          aria-label="Servings"
        />
      </div>

      {/* Macros */}
      <div>
        <h4 className="text-text-primary text-sm font-semibold mb-2">Macros (grams per serving)</h4>
        <div className="grid grid-cols-3 gap-2">
          <input
            type="number"
            min="0"
            placeholder="Protein"
            value={protein}
            onChange={(e) => setProtein(e.target.value)}
            className="bg-secondary text-text-primary border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-accent-primary"
            aria-label="Protein (g)"
          />
          <input
            type="number"
            min="0"
            placeholder="Carbs"
            value={carbs}
            onChange={(e) => setCarbs(e.target.value)}
            className="bg-secondary text-text-primary border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-accent-primary"
            aria-label="Carbs (g)"
          />
          <input
            type="number"
            min="0"
            placeholder="Fat"
            value={fat}
            onChange={(e) => setFat(e.target.value)}
            className="bg-secondary text-text-primary border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-accent-primary"
            aria-label="Fat (g)"
          />
        </div>
      </div>

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
