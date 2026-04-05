import type { Recipe } from './RecipeList';

interface RecipeDetailProps {
  recipe: Recipe | null;
  onClose: () => void;
}

export default function RecipeDetail({ recipe, onClose }: RecipeDetailProps) {
  if (!recipe) {
    return (
      <div className="bg-card rounded-lg p-6 border border-border text-center">
        <p className="text-text-secondary text-sm">Recipe not found.</p>
        <button onClick={onClose} className="text-accent-info text-sm mt-2 hover:opacity-80">
          Back to list
        </button>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg p-4 border border-border space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-text-primary font-semibold text-lg">{recipe.name}</h3>
        <button
          onClick={onClose}
          className="text-accent-info text-sm hover:opacity-80"
          aria-label="Close recipe detail"
        >
          ← Back
        </button>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-accent-info text-sm font-semibold">{recipe.caloriesPerServing} kcal/serving</span>
      </div>

      {/* Ingredients */}
      <div>
        <h4 className="text-text-primary font-semibold text-sm mb-2">Ingredients</h4>
        {recipe.ingredients.length === 0 ? (
          <p className="text-text-secondary text-sm">No ingredients listed.</p>
        ) : (
          <ul className="space-y-1">
            {recipe.ingredients.map((ing) => (
              <li key={ing.id} className="text-text-secondary text-sm flex items-center gap-2">
                <span className="text-accent-primary">•</span>
                <span>{ing.quantity} {ing.unit} {ing.name}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Steps */}
      <div>
        <h4 className="text-text-primary font-semibold text-sm mb-2">Steps</h4>
        <p className="text-text-secondary text-sm whitespace-pre-wrap">{recipe.steps}</p>
      </div>
    </div>
  );
}
