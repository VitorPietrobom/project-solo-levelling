import { useMemo } from 'react';
import { CalendarDays } from 'lucide-react';

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
      <div style={{ background: 'var(--surface-inset)', borderRadius: 'var(--r)', padding: '32px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: 'var(--text-faint)' }}>
        <CalendarDays size={24} />
        <p style={{ fontSize: 13 }}>No meal prep plan for this week. Build one above.</p>
      </div>
    );
  }

  const cellBase: React.CSSProperties = {
    padding: '9px 10px', borderBottom: '1px solid var(--line-soft)', textAlign: 'center', fontSize: 12,
  };

  return (
    <div style={{ background: 'var(--surface-inset)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r)', overflowX: 'auto' }}>
      <table style={{ width: '100%', minWidth: 640, borderCollapse: 'collapse' }} role="grid" aria-label="Weekly meal prep plan">
        <thead>
          <tr>
            <th style={{ ...cellBase, textAlign: 'left', background: 'transparent' }} />
            {DAYS.map((day) => {
              const on = selectedDay === day;
              return (
                <th
                  key={day}
                  onClick={() => onSelectDay(day)}
                  role="columnheader"
                  aria-label={`Select ${DAY_LABELS[day]}`}
                  data-selected={on ? 'true' : 'false'}
                  style={{
                    ...cellBase, cursor: 'pointer', fontWeight: 600,
                    color: on ? 'var(--accent)' : 'var(--text-2)',
                    background: on ? 'var(--accent-soft)' : 'transparent',
                    borderTopLeftRadius: 0, transition: 'background .15s, color .15s',
                  }}
                >
                  {DAY_LABELS[day]}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {MEAL_TYPES.map((meal) => (
            <tr key={meal}>
              <td style={{ ...cellBase, textAlign: 'left', color: 'var(--text-3)', fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap' }}>
                {MEAL_LABELS[meal]}
              </td>
              {DAYS.map((day) => {
                const entry = entryMap.get(`${day}-${meal}`);
                const on = selectedDay === day;
                return (
                  <td
                    key={`${day}-${meal}`}
                    data-testid={`cell-${day}-${meal}`}
                    style={{ ...cellBase, background: on ? 'var(--accent-soft)' : 'transparent' }}
                  >
                    {entry ? (
                      <span style={{ color: 'var(--text)', fontSize: 11.5 }}>{entry.recipe.name}</span>
                    ) : (
                      <span style={{ color: 'var(--text-faint)', opacity: 0.5 }}>—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
          <tr>
            <td style={{ padding: '9px 10px', textAlign: 'left', color: 'var(--text-3)', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
              Total kcal
            </td>
            {DAYS.map((day) => {
              const on = selectedDay === day;
              return (
                <td
                  key={`cal-${day}`}
                  data-testid={`calories-${day}`}
                  style={{ padding: '9px 10px', textAlign: 'center', background: on ? 'var(--accent-soft)' : 'transparent' }}
                >
                  <span className="mono" style={{ color: 'var(--info)', fontSize: 11.5, fontWeight: 700 }}>{dailyCalories[day]}</span>
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
