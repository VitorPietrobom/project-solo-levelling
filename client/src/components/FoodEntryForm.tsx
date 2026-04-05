import { useState } from 'react';
import type { FoodEntry } from './CalorieTracker';

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

interface FoodEntryFormProps {
  onCreated: (
    optimistic: FoodEntry,
    body: { foodName: string; calories: number; protein: number; carbs: number; fat: number; mealType: string; date: string },
  ) => void;
}

const MEAL_OPTIONS: { label: string; value: MealType }[] = [
  { label: 'Breakfast', value: 'breakfast' },
  { label: 'Lunch', value: 'lunch' },
  { label: 'Dinner', value: 'dinner' },
  { label: 'Snack', value: 'snack' },
];

export default function FoodEntryForm({ onCreated }: FoodEntryFormProps) {
  const [foodName, setFoodName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [mealType, setMealType] = useState<MealType>('breakfast');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmed = foodName.trim();
    if (!trimmed) { setError('Food name is required'); return; }

    const parsedCal = parseInt(calories, 10);
    if (!calories || isNaN(parsedCal) || parsedCal < 0) { setError('Calories must be a non-negative number'); return; }

    if (!date) { setError('Date is required'); return; }

    const p = parseFloat(protein) || 0;
    const c = parseFloat(carbs) || 0;
    const f = parseFloat(fat) || 0;

    const optimistic: FoodEntry = {
      id: `temp-${Date.now()}`,
      foodName: trimmed, calories: parsedCal, protein: p, carbs: c, fat: f, mealType, date,
    };

    onCreated(optimistic, { foodName: trimmed, calories: parsedCal, protein: p, carbs: c, fat: f, mealType, date });
    setFoodName(''); setCalories(''); setProtein(''); setCarbs(''); setFat('');
  }

  return (
    <form onSubmit={handleSubmit} className="bg-card rounded-lg p-4 border border-border space-y-3">
      <h3 className="text-text-primary font-semibold">Log Food</h3>
      {error && <p className="text-accent-warning text-sm">{error}</p>}

      <div className="grid grid-cols-2 gap-2">
        <input type="text" placeholder="Food name" value={foodName} onChange={(e) => setFoodName(e.target.value)}
          className="bg-secondary text-text-primary border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-accent-primary" aria-label="Food name" />
        <input type="number" min="0" placeholder="Calories" value={calories} onChange={(e) => setCalories(e.target.value)}
          className="bg-secondary text-text-primary border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-accent-primary" aria-label="Calories" />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <input type="number" min="0" step="0.1" placeholder="Protein (g)" value={protein} onChange={(e) => setProtein(e.target.value)}
          className="bg-secondary text-text-primary border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-accent-primary" aria-label="Protein" />
        <input type="number" min="0" step="0.1" placeholder="Carbs (g)" value={carbs} onChange={(e) => setCarbs(e.target.value)}
          className="bg-secondary text-text-primary border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-accent-primary" aria-label="Carbs" />
        <input type="number" min="0" step="0.1" placeholder="Fat (g)" value={fat} onChange={(e) => setFat(e.target.value)}
          className="bg-secondary text-text-primary border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-accent-primary" aria-label="Fat" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <select value={mealType} onChange={(e) => setMealType(e.target.value as MealType)}
          className="bg-secondary text-text-primary border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-accent-primary" aria-label="Meal type">
          {MEAL_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
        </select>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
          className="bg-secondary text-text-primary border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-accent-primary" aria-label="Entry date" />
      </div>

      <button type="submit" className="w-full bg-accent-primary text-primary font-semibold py-2 rounded hover:opacity-90 transition-opacity">
        Log Food
      </button>
    </form>
  );
}
