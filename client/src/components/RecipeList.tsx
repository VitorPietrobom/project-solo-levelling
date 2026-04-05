export interface Ingredient {
  id: string;
  name: string;
  quantity: string;
  unit: string;
}

export interface Recipe {
  id: string;
  name: string;
  steps: string;
  caloriesPerServing: number;
  ingredients: Ingredient[];
}

interface RecipeListProps {
  recipes: Recipe[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

export default function RecipeList({ recipes, onSelect, onDelete, searchTerm, onSearchChange }: RecipeListProps) {
  return (
    <div className="space-y-3">
      <input
        type="text"
        placeholder="Search recipes..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-full bg-secondary text-text-primary border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-accent-primary"
        aria-label="Search recipes"
      />

      {recipes.length === 0 ? (
        <p className="text-text-secondary text-sm text-center py-6">
          {searchTerm ? 'No recipes match your search.' : 'No recipes yet. Create one to get started.'}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {recipes.map((recipe) => (
            <div
              key={recipe.id}
              className="bg-card rounded-lg p-4 border border-border hover:border-accent-primary transition-colors cursor-pointer"
              onClick={() => onSelect(recipe.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(recipe.id); }}
              aria-label={`View recipe: ${recipe.name}`}
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h4 className="text-text-primary font-semibold text-sm truncate">{recipe.name}</h4>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-accent-info text-xs">{recipe.caloriesPerServing} kcal/serving</span>
                    <span className="text-text-secondary text-xs">{recipe.ingredients.length} ingredient{recipe.ingredients.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(recipe.id); }}
                  className="text-accent-warning text-xs hover:opacity-80 ml-2 shrink-0"
                  aria-label={`Delete recipe: ${recipe.name}`}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
