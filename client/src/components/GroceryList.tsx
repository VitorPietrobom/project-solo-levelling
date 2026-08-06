import { ShoppingCart } from 'lucide-react';

export interface GroceryListData {
  ingredients: { name: string; quantity: string; unit: string }[];
  totalCalories: number;
}

interface GroceryListProps {
  data: GroceryListData | null;
  day: string;
}

const DAY_LABELS: Record<string, string> = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday',
  fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
};

export default function GroceryList({ data, day }: GroceryListProps) {
  if (!data) {
    return (
      <div style={{ background: 'var(--surface-inset)', borderRadius: 'var(--r)', padding: 16, textAlign: 'center' }}>
        <p style={{ fontSize: 13, color: 'var(--text-faint)' }}>
          Select a day from the meal plan to see its grocery list.
        </p>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--surface-inset)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r)', padding: 16, display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShoppingCart size={15} style={{ color: 'var(--accent)' }} />
          <h4 style={{ fontSize: 14, fontWeight: 600 }}>Grocery List — {DAY_LABELS[day] || day}</h4>
        </div>
        <span className="mono" data-testid="grocery-total-calories" style={{ fontSize: 12, fontWeight: 700, color: 'var(--info)' }}>
          {data.totalCalories} kcal
        </span>
      </div>

      {data.ingredients.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--text-faint)' }}>No ingredients for this day.</p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6 }}>
          {data.ingredients.map((ing, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13, color: 'var(--text-2)' }}>
              <span style={{ width: 5, height: 5, borderRadius: 99, background: 'var(--accent)', flexShrink: 0 }} />
              <span>{ing.quantity} {ing.unit} {ing.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
