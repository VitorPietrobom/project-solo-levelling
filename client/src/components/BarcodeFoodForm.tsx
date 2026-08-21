import { useState, useEffect } from 'react';
import { apiClient, errorMessage } from '../lib/apiClient';
import type { FoodEntry } from './CalorieTracker';

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

interface BarcodeProduct {
  found: boolean;
  source?: 'openfoodfacts' | 'custom';
  foodName?: string;
  caloriesPer100g?: number;
  proteinPer100g?: number;
  carbsPer100g?: number;
  fatPer100g?: number;
  servingGrams?: number | null;
}

interface Props {
  code: string;
  defaultDate?: string;
  onCreated: (
    optimistic: FoodEntry,
    body: { foodName: string; calories: number; protein: number; carbs: number; fat: number; mealType: string; date: string },
  ) => void;
  onCancel: () => void;
}

const MEAL_OPTIONS: { label: string; value: MealType }[] = [
  { label: 'Breakfast', value: 'breakfast' },
  { label: 'Lunch', value: 'lunch' },
  { label: 'Dinner', value: 'dinner' },
  { label: 'Snack', value: 'snack' },
];

const round1 = (n: number) => Math.round(n * 10) / 10;

export default function BarcodeFoodForm({ code, defaultDate, onCreated, onCancel }: Props) {
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<BarcodeProduct | null>(null);
  const [foodName, setFoodName] = useState('');
  const [grams, setGrams] = useState(100);
  const [mealType, setMealType] = useState<MealType>('breakfast');
  const [date, setDate] = useState(defaultDate ?? new Date().toISOString().split('T')[0]);
  const [error, setError] = useState<string | null>(null);

  // Shown when the barcode isn't in Open Food Facts or our own fallback
  // table yet — the user fills these in once, we save it keyed to the
  // barcode, and every future scan (by anyone) resolves it from here on.
  const [addingCustom, setAddingCustom] = useState(false);
  const [customCalories, setCustomCalories] = useState('');
  const [customProtein, setCustomProtein] = useState('');
  const [customCarbs, setCustomCarbs] = useState('');
  const [customFat, setCustomFat] = useState('');
  const [savingCustom, setSavingCustom] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiClient.get(`/api/food-entries/barcode/${encodeURIComponent(code)}`)
      .then((res) => {
        if (cancelled) return;
        const p = res as BarcodeProduct;
        setProduct(p);
        if (p.found) {
          setFoodName(p.foodName ?? '');
          setGrams(p.servingGrams && p.servingGrams > 0 ? Math.round(p.servingGrams) : 100);
        }
      })
      .catch(() => { if (!cancelled) setProduct({ found: false }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [code]);

  const scale = grams / 100;
  const calories = product?.found ? Math.round((product.caloriesPer100g ?? 0) * scale) : 0;
  const protein = product?.found ? round1((product.proteinPer100g ?? 0) * scale) : 0;
  const carbs = product?.found ? round1((product.carbsPer100g ?? 0) * scale) : 0;
  const fat = product?.found ? round1((product.fatPer100g ?? 0) * scale) : 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmed = foodName.trim();
    if (!trimmed) { setError('Food name is required'); return; }
    if (!grams || grams <= 0) { setError('Grams must be a positive number'); return; }

    const optimistic: FoodEntry = {
      id: `temp-${Date.now()}`,
      foodName: trimmed, calories, protein, carbs, fat, mealType, date,
    };
    onCreated(optimistic, { foodName: trimmed, calories, protein, carbs, fat, mealType, date });
  }

  async function handleSaveCustomProduct(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmed = foodName.trim();
    if (!trimmed) { setError('Food name is required'); return; }
    const cal = parseFloat(customCalories);
    if (!customCalories || isNaN(cal) || cal < 0) { setError('Calories (per 100g) must be a non-negative number'); return; }

    setSavingCustom(true);
    try {
      const saved = await apiClient.post(`/api/food-entries/barcode/${encodeURIComponent(code)}`, {
        body: {
          foodName: trimmed,
          caloriesPer100g: cal,
          proteinPer100g: parseFloat(customProtein) || 0,
          carbsPer100g: parseFloat(customCarbs) || 0,
          fatPer100g: parseFloat(customFat) || 0,
        },
      }) as BarcodeProduct;
      // Falls through to the normal "found" flow below — same grams/meal/date step.
      setProduct(saved);
      setAddingCustom(false);
    } catch (err) {
      setError(errorMessage(err, 'Failed to save product'));
    } finally {
      setSavingCustom(false);
    }
  }

  return (
    <div className="bg-card rounded-lg p-4 border border-border space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-text-primary font-semibold">Barcode {code}</h3>
        <button onClick={onCancel} className="text-text-secondary text-sm hover:opacity-80" aria-label="Cancel barcode entry">Cancel</button>
      </div>

      {loading && <p className="text-text-secondary text-sm">Looking up product…</p>}

      {!loading && product && !product.found && !addingCustom && (
        <div className="space-y-2">
          <p className="text-accent-warning text-sm">
            Product not found. Add it once and it'll be recognized every time this barcode is scanned again.
          </p>
          <button
            type="button"
            onClick={() => setAddingCustom(true)}
            className="w-full bg-accent-primary text-primary font-semibold py-2 rounded hover:opacity-90 transition-opacity"
          >
            + Add this product
          </button>
        </div>
      )}

      {!loading && addingCustom && (
        <form onSubmit={handleSaveCustomProduct} className="space-y-3">
          {error && <p className="text-accent-warning text-sm">{error}</p>}

          <input
            type="text" placeholder="Product name" value={foodName} onChange={(e) => setFoodName(e.target.value)}
            className="w-full bg-secondary text-text-primary border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-accent-primary"
            aria-label="Product name"
          />

          <p className="text-text-secondary text-xs">Nutrition per 100g (check the label)</p>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number" min={0} placeholder="Calories" value={customCalories} onChange={(e) => setCustomCalories(e.target.value)}
              className="bg-secondary text-text-primary border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-accent-primary" aria-label="Calories per 100g"
            />
            <input
              type="number" min={0} step={0.1} placeholder="Protein (g)" value={customProtein} onChange={(e) => setCustomProtein(e.target.value)}
              className="bg-secondary text-text-primary border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-accent-primary" aria-label="Protein per 100g"
            />
            <input
              type="number" min={0} step={0.1} placeholder="Carbs (g)" value={customCarbs} onChange={(e) => setCustomCarbs(e.target.value)}
              className="bg-secondary text-text-primary border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-accent-primary" aria-label="Carbs per 100g"
            />
            <input
              type="number" min={0} step={0.1} placeholder="Fat (g)" value={customFat} onChange={(e) => setCustomFat(e.target.value)}
              className="bg-secondary text-text-primary border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-accent-primary" aria-label="Fat per 100g"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit" disabled={savingCustom}
              className="flex-1 bg-accent-primary text-primary font-semibold py-2 rounded hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {savingCustom ? 'Saving…' : 'Save & Continue'}
            </button>
            <button type="button" onClick={() => setAddingCustom(false)} className="text-text-secondary text-sm px-3">Cancel</button>
          </div>
        </form>
      )}

      {!loading && product?.found && (
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <p className="text-accent-warning text-sm">{error}</p>}

          <input
            type="text" value={foodName} onChange={(e) => setFoodName(e.target.value)}
            className="w-full bg-secondary text-text-primary border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-accent-primary"
            aria-label="Food name"
          />

          <div className="grid grid-cols-2 gap-2">
            <label className="text-text-secondary text-xs">
              Amount eaten (g)
              <input
                type="number" min={1} value={grams} onChange={(e) => setGrams(Number(e.target.value))}
                className="w-full mt-1 bg-secondary text-text-primary border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-accent-primary"
                aria-label="Grams eaten"
              />
            </label>
            <label className="text-text-secondary text-xs">
              Meal
              <select
                value={mealType} onChange={(e) => setMealType(e.target.value as MealType)}
                className="w-full mt-1 bg-secondary text-text-primary border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-accent-primary"
                aria-label="Meal type"
              >
                {MEAL_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
              </select>
            </label>
          </div>

          <div className="text-text-secondary text-xs font-mono">
            {calories} kcal · P {protein}g · C {carbs}g · F {fat}g
          </div>

          <input
            type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="w-full bg-secondary text-text-primary border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-accent-primary"
            aria-label="Entry date"
          />

          <button type="submit" className="w-full bg-accent-primary text-primary font-semibold py-2 rounded hover:opacity-90 transition-opacity">
            Log Food
          </button>
        </form>
      )}
    </div>
  );
}
