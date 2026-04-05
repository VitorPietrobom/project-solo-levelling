import { useMemo } from 'react';

export interface FoodEntry {
  id: string;
  foodName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  date: string;
}

interface CalorieTrackerProps {
  entries: FoodEntry[];
  calorieGoal: number;
  onGoalChange: (goal: number) => void;
}

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

const MEAL_LABELS: Record<string, string> = {
  breakfast: '🌅 Breakfast',
  lunch: '☀️ Lunch',
  dinner: '🌙 Dinner',
  snack: '🍎 Snack',
};

export default function CalorieTracker({ entries, calorieGoal, onGoalChange }: CalorieTrackerProps) {
  const { total, breakdown, macros } = useMemo(() => {
    const bk: Record<string, number> = { breakfast: 0, lunch: 0, dinner: 0, snack: 0 };
    let sum = 0;
    let p = 0, c = 0, f = 0;
    for (const e of entries) {
      sum += e.calories;
      bk[e.mealType] = (bk[e.mealType] || 0) + e.calories;
      p += e.protein || 0;
      c += e.carbs || 0;
      f += e.fat || 0;
    }
    return { total: sum, breakdown: bk, macros: { protein: Math.round(p), carbs: Math.round(c), fat: Math.round(f) } };
  }, [entries]);

  const remaining = calorieGoal - total;
  const pct = calorieGoal > 0 ? Math.min((total / calorieGoal) * 100, 100) : 0;

  return (
    <div className="bg-card rounded-lg p-4 border border-border space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-text-primary font-semibold">Calories Today</h3>
        <div className="flex items-center gap-2">
          <label htmlFor="calorie-goal" className="text-text-secondary text-xs">Goal:</label>
          <input
            id="calorie-goal"
            type="number"
            min="1"
            value={calorieGoal}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (v > 0) onGoalChange(v);
            }}
            className="w-20 bg-secondary text-text-primary border border-border rounded px-2 py-1 text-sm focus:outline-none focus:border-accent-primary text-center"
            aria-label="Daily calorie goal"
          />
        </div>
      </div>

      {/* Summary numbers */}
      <div className="flex items-baseline gap-3">
        <span className="text-2xl font-bold text-text-primary" data-testid="total-calories">{total}</span>
        <span className="text-text-secondary text-sm">/ {calorieGoal} kcal</span>
        <span
          className={`text-sm font-semibold ml-auto ${
            remaining >= 0 ? 'text-accent-success' : 'text-accent-warning'
          }`}
          data-testid="remaining-calories"
        >
          {remaining >= 0 ? `${remaining} left` : `${Math.abs(remaining)} over`}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-secondary rounded-full h-3" role="progressbar" aria-valuenow={total} aria-valuemin={0} aria-valuemax={calorieGoal} aria-label="Calorie progress">
        <div
          className="h-3 rounded-full transition-all duration-300"
          style={{
            width: `${pct}%`,
            backgroundColor: remaining >= 0 ? 'var(--accent-primary)' : 'var(--accent-warning)',
          }}
        />
      </div>

      {/* Meal breakdown */}
      <div className="grid grid-cols-2 gap-2">
        {MEAL_TYPES.map((mt) => (
          <div key={mt} className="flex items-center justify-between bg-secondary rounded px-3 py-2">
            <span className="text-text-secondary text-sm">{MEAL_LABELS[mt]}</span>
            <span className="text-text-primary text-sm font-semibold" data-testid={`${mt}-calories`}>
              {breakdown[mt]} kcal
            </span>
          </div>
        ))}
      </div>

      {/* Macros */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-secondary rounded px-3 py-2 text-center">
          <p className="text-accent-info text-lg font-bold">{macros.protein}g</p>
          <p className="text-text-secondary text-xs">Protein</p>
        </div>
        <div className="bg-secondary rounded px-3 py-2 text-center">
          <p className="text-accent-primary text-lg font-bold">{macros.carbs}g</p>
          <p className="text-text-secondary text-xs">Carbs</p>
        </div>
        <div className="bg-secondary rounded px-3 py-2 text-center">
          <p className="text-accent-warning text-lg font-bold">{macros.fat}g</p>
          <p className="text-text-secondary text-xs">Fat</p>
        </div>
      </div>
    </div>
  );
}
