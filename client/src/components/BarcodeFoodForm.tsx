import { useState, useEffect } from 'react';
import { apiClient } from '../lib/apiClient';
import type { FoodEntry } from './CalorieTracker';

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

interface BarcodeProduct {
  found: boolean;
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

  return (
    <div className="bg-card rounded-lg p-4 border border-border space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-text-primary font-semibold">Barcode {code}</h3>
        <button onClick={onCancel} className="text-text-secondary text-sm hover:opacity-80" aria-label="Cancel barcode entry">Cancel</button>
      </div>

      {loading && <p className="text-text-secondary text-sm">Looking up product…</p>}

      {!loading && product && !product.found && (
        <p className="text-accent-warning text-sm">
          Product not found in Open Food Facts. You can log it manually via "+ Log Food" instead.
        </p>
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
