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
      <div className="bg-card rounded-lg p-4 border border-border text-center">
        <p className="text-text-secondary text-sm">
          Select a day from the meal plan to see its grocery list.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg p-4 border border-border space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-text-primary font-semibold text-sm">
          Grocery List — {DAY_LABELS[day] || day}
        </h4>
        <span className="text-accent-info text-xs font-semibold" data-testid="grocery-total-calories">
          {data.totalCalories} kcal
        </span>
      </div>

      {data.ingredients.length === 0 ? (
        <p className="text-text-secondary text-sm">No ingredients for this day.</p>
      ) : (
        <ul className="space-y-1">
          {data.ingredients.map((ing, i) => (
            <li key={i} className="text-text-secondary text-sm flex items-center gap-2">
              <span className="text-accent-primary">•</span>
              <span>
                {ing.quantity} {ing.unit} {ing.name}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
