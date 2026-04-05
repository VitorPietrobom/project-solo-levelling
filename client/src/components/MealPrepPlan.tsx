import { useMemo } from 'react';

export interface MealPrepEntry {
  id: string;
  dayOfWeek: string;
  mealType: string;
  recipeId: string;
  recipe: {
    id: string;
    name: string;
    caloriesPerServing: number;
    ingredients: { id: string; name: string; quantity: string; unit: string }[];
  };
}

export interface MealPrepPlanData {
  id: string;
  weekStartDate: string;
  entries: MealPrepEntry[];
}

interface MealPrepPlanProps {
  plan: MealPrepPlanData | null;
  onSelectDay: (day: string) => void;
  selectedDay: string | null;
}

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
const DAY_LABELS: Record<string, string> = {
  mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun',
};
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
const MEAL_LABELS: Record<string, string> = {
  breakfast: '🌅 Breakfast', lunch: '☀️ Lunch', dinner: '🌙 Dinner', snack: '🍎 Snack',
};

export default function MealPrepPlan({ plan, onSelectDay, selectedDay }: MealPrepPlanProps) {
  const entryMap = useMemo(() => {
    const map = new Map<string, MealPrepEntry>();
    if (plan) {
      for (const entry of plan.entries) {
        map.set(`${entry.dayOfWeek}-${entry.mealType}`, entry);
      }
    }
    return map;
  }, [plan]);

  const dailyCalories = useMemo(() => {
    const cals: Record<string, number> = {};
    for (const day of DAYS) {
      let total = 0;
      for (const meal of MEAL_TYPES) {
        const entry = entryMap.get(`${day}-${meal}`);
        if (entry) total += entry.recipe.caloriesPerServing;
      }
      cals[day] = total;
    }
    return cals;
  }, [entryMap]);

  if (!plan) {
    return (
      <div className="bg-card rounded-lg p-6 border border-border text-center">
        <p className="text-text-secondary text-sm">No meal prep plan for this week. Create one below.</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm" role="grid" aria-label="Weekly meal prep plan">
        <thead>
          <tr>
            <th className="text-text-secondary text-xs font-medium px-3 py-2 text-left border-b border-border" />
            {DAYS.map((day) => (
              <th
                key={day}
                className={`px-3 py-2 text-center border-b border-border cursor-pointer transition-colors ${
                  selectedDay === day
                    ? 'bg-accent-primary/10 text-accent-primary'
                    : 'text-text-primary hover:bg-secondary'
                }`}
                onClick={() => onSelectDay(day)}
                role="columnheader"
                aria-label={`Select ${DAY_LABELS[day]}`}
              >
                {DAY_LABELS[day]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MEAL_TYPES.map((meal) => (
            <tr key={meal}>
              <td className="text-text-secondary text-xs font-medium px-3 py-2 border-b border-border whitespace-nowrap">
                {MEAL_LABELS[meal]}
              </td>
              {DAYS.map((day) => {
                const entry = entryMap.get(`${day}-${meal}`);
                return (
                  <td
                    key={`${day}-${meal}`}
                    className={`px-3 py-2 border-b border-border text-center ${
                      selectedDay === day ? 'bg-accent-primary/5' : ''
                    }`}
                    data-testid={`cell-${day}-${meal}`}
                  >
                    {entry ? (
                      <span className="text-text-primary text-xs">{entry.recipe.name}</span>
                    ) : (
                      <span className="text-text-secondary text-xs opacity-40">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
          {/* Daily calorie totals */}
          <tr>
            <td className="text-text-secondary text-xs font-medium px-3 py-2 whitespace-nowrap">
              Total kcal
            </td>
            {DAYS.map((day) => (
              <td
                key={`cal-${day}`}
                className={`px-3 py-2 text-center ${selectedDay === day ? 'bg-accent-primary/5' : ''}`}
                data-testid={`calories-${day}`}
              >
                <span className="text-accent-info text-xs font-semibold">{dailyCalories[day]}</span>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
