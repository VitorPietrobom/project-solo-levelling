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

  const inputStyle: React.CSSProperties = {
    background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--line-soft)',
    borderRadius: 'var(--r-sm)', padding: '7px 10px', fontSize: 13, outline: 'none',
  };
  const cellSelect: React.CSSProperties = {
    width: '100%', background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--line-soft)',
    borderRadius: 'var(--r-sm)', padding: '5px 6px', fontSize: 11.5, outline: 'none',
  };

  return (
    <form onSubmit={handleSubmit} style={{ background: 'var(--surface-inset)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r)', padding: 16, display: 'grid', gap: 14 }}>
      <span className="eyebrow">New meal prep plan</span>
      {error && <p style={{ fontSize: 12.5, color: 'var(--bad)' }}>{error}</p>}

      <div>
        <label htmlFor="week-start" style={{ display: 'block', fontSize: 12, color: 'var(--text-3)', marginBottom: 5 }}>
          Week starting (Monday)
        </label>
        <input
          id="week-start"
          type="date"
          value={weekStartDate}
          onChange={(e) => setWeekStartDate(e.target.value)}
          style={inputStyle}
          aria-label="Week start date"
        />
      </div>

      {recipes.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--text-faint)' }}>Create some recipes first to build a meal plan by hand — or use “Build with AI” above.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 640, borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ padding: '4px 6px', textAlign: 'left' }} />
                {DAYS.map((day) => (
                  <th key={day} style={{ padding: '4px 6px', textAlign: 'center', fontSize: 11.5, fontWeight: 600, color: 'var(--text-3)' }}>
                    {DAY_LABELS[day]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MEAL_TYPES.map((meal) => (
                <tr key={meal}>
                  <td style={{ padding: '4px 8px 4px 0', fontSize: 11.5, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                    {MEAL_LABELS[meal]}
                  </td>
                  {DAYS.map((day) => (
                    <td key={`${day}-${meal}`} style={{ padding: 3 }}>
                      <select
                        value={selections[`${day}-${meal}`] || ''}
                        onChange={(e) => handleSelect(day, meal, e.target.value)}
                        style={cellSelect}
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

      <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center' }}>
        Create Plan
      </button>
    </form>
  );
}
