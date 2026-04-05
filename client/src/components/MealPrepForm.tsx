import { useState, useMemo } from 'react';
import type { Recipe } from './RecipeList';

interface MealPrepFormProps {
  recipes: Recipe[];
  onCreated: (body: {
    weekStartDate: string;
    entries: { dayOfWeek: string; mealType: string; recipeId: string }[];
  }) => void;
}

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
const DAY_LABELS: Record<string, string> = {
  mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun',
};
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack',
};

function getCurrentMonday(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().split('T')[0];
}

export default function MealPrepForm({ recipes, onCreated }: MealPrepFormProps) {
  const [weekStartDate, setWeekStartDate] = useState(getCurrentMonday);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const sortedRecipes = useMemo(
    () => [...recipes].sort((a, b) => a.name.localeCompare(b.name)),
    [recipes],
  );

  function handleSelect(day: string, meal: string, recipeId: string) {
    setSelections((prev) => {
      const key = `${day}-${meal}`;
      if (!recipeId) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: recipeId };
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!weekStartDate) {
      setError('Week start date is required');
      return;
    }

    const entries = Object.entries(selections).map(([key, recipeId]) => {
      const [dayOfWeek, mealType] = key.split('-');
      return { dayOfWeek, mealType, recipeId };
    });

    if (entries.length === 0) {
      setError('Assign at least one recipe to a meal slot');
      return;
    }

    onCreated({ weekStartDate, entries });
    setSelections({});
  }

  return (
    <form onSubmit={handleSubmit} className="bg-card rounded-lg p-4 border border-border space-y-4">
      <h3 className="text-text-primary font-semibold">New Meal Prep Plan</h3>
      {error && <p className="text-accent-warning text-sm">{error}</p>}

      <div>
        <label htmlFor="week-start" className="text-text-secondary text-xs block mb-1">
          Week starting (Monday)
        </label>
        <input
          id="week-start"
          type="date"
          value={weekStartDate}
          onChange={(e) => setWeekStartDate(e.target.value)}
          className="bg-secondary text-text-primary border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-accent-primary"
          aria-label="Week start date"
        />
      </div>

      {recipes.length === 0 ? (
        <p className="text-text-secondary text-sm">Create some recipes first to build a meal plan.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr>
                <th className="text-text-secondary text-xs font-medium px-2 py-1 text-left" />
                {DAYS.map((day) => (
                  <th key={day} className="text-text-primary text-xs font-medium px-2 py-1 text-center">
                    {DAY_LABELS[day]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MEAL_TYPES.map((meal) => (
                <tr key={meal}>
                  <td className="text-text-secondary text-xs px-2 py-1 whitespace-nowrap">
                    {MEAL_LABELS[meal]}
                  </td>
                  {DAYS.map((day) => (
                    <td key={`${day}-${meal}`} className="px-1 py-1">
                      <select
                        value={selections[`${day}-${meal}`] || ''}
                        onChange={(e) => handleSelect(day, meal, e.target.value)}
                        className="w-full bg-secondary text-text-primary border border-border rounded px-1 py-1 text-xs focus:outline-none focus:border-accent-primary"
                        aria-label={`${DAY_LABELS[day]} ${MEAL_LABELS[meal]} recipe`}
                      >
                        <option value="">—</option>
                        {sortedRecipes.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button
        type="submit"
        className="w-full bg-accent-primary text-primary font-semibold py-2 rounded hover:opacity-90 transition-opacity"
      >
        Create Plan
      </button>
    </form>
  );
}
