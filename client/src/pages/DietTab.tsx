import { useState, useEffect, useCallback } from 'react';
import CalorieTracker from '../components/CalorieTracker';
import type { FoodEntry } from '../components/CalorieTracker';
import FoodEntryForm from '../components/FoodEntryForm';
import FoodEntryImport from '../components/FoodEntryImport';
import RecipeList from '../components/RecipeList';
import type { Recipe } from '../components/RecipeList';
import RecipeDetail from '../components/RecipeDetail';
import RecipeForm from '../components/RecipeForm';
import RecipeImport from '../components/RecipeImport';
import MealPrepPlan from '../components/MealPrepPlan';
import type { MealPrepPlanData } from '../components/MealPrepPlan';
import MealPrepForm from '../components/MealPrepForm';
import GroceryList from '../components/GroceryList';
import type { GroceryListData } from '../components/GroceryList';
import { apiClient } from '../lib/apiClient';

export default function DietTab() {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [foodEntries, setFoodEntries] = useState<FoodEntry[]>([]);
  const [calorieGoal, setCalorieGoal] = useState(2000);
  const [showFoodForm, setShowFoodForm] = useState(false);
  const [showFoodImport, setShowFoodImport] = useState(false);

  // Recipe state
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showRecipeForm, setShowRecipeForm] = useState(false);
  const [showRecipeImport, setShowRecipeImport] = useState(false);

  // Meal prep state
  const [mealPrepPlan, setMealPrepPlan] = useState<MealPrepPlanData | null>(null);
  const [selectedMealPrepDay, setSelectedMealPrepDay] = useState<string | null>(null);
  const [groceryList, setGroceryList] = useState<GroceryListData | null>(null);
  const [showMealPrepForm, setShowMealPrepForm] = useState(false);

  const fetchFoodEntries = useCallback(async (date: string) => {
    try {
      const data = (await apiClient.get(`/api/food-entries?date=${date}`)) as FoodEntry[];
      setFoodEntries(data);
    } catch { /* silently fail */ }
  }, []);

  const fetchCalorieGoal = useCallback(async () => {
    try {
      const data = (await apiClient.get('/api/calorie-goal')) as { calorieGoal: number };
      if (data.calorieGoal) setCalorieGoal(data.calorieGoal);
    } catch { /* silently fail */ }
  }, []);

  const fetchRecipes = useCallback(async (search: string) => {
    try {
      const url = search ? `/api/recipes?search=${encodeURIComponent(search)}` : '/api/recipes';
      const data = (await apiClient.get(url)) as Recipe[];
      setRecipes(data);
    } catch { /* silently fail */ }
  }, []);

  const fetchMealPrepPlan = useCallback(async () => {
    try {
      const data = (await apiClient.get('/api/meal-prep')) as MealPrepPlanData;
      setMealPrepPlan(data);
    } catch { /* silently fail */ }
  }, []);

  const fetchGroceryList = useCallback(async (day: string) => {
    try {
      const data = (await apiClient.get(`/api/meal-prep/${day}/grocery-list`)) as GroceryListData;
      setGroceryList(data);
    } catch { /* silently fail */ }
  }, []);

  useEffect(() => {
    fetchFoodEntries(selectedDate);
    fetchCalorieGoal();
    fetchMealPrepPlan();
  }, [fetchFoodEntries, fetchCalorieGoal, fetchMealPrepPlan, selectedDate]);

  useEffect(() => {
    fetchRecipes(searchTerm);
  }, [fetchRecipes, searchTerm]);

  useEffect(() => {
    if (selectedMealPrepDay) {
      fetchGroceryList(selectedMealPrepDay);
    } else {
      setGroceryList(null);
    }
  }, [selectedMealPrepDay, fetchGroceryList]);

  function handleFoodEntryCreated(
    optimistic: FoodEntry,
    body: { foodName: string; calories: number; mealType: string; date: string },
  ) {
    setFoodEntries((prev) => [...prev, optimistic]);
    setShowFoodForm(false);
    apiClient
      .post('/api/food-entries', { body })
      .then((data) =>
        setFoodEntries((prev) =>
          prev.map((e) => (e.id === optimistic.id ? (data as FoodEntry) : e)),
        ),
      )
      .catch(() =>
        setFoodEntries((prev) => prev.filter((e) => e.id !== optimistic.id)),
      );
  }

  function handleFoodImport(entries: { optimistic: FoodEntry; body: any }[]) {
    setFoodEntries((prev) => [...prev, ...entries.map((e) => e.optimistic)]);
    setShowFoodImport(false);
    // Fire all POSTs in parallel
    entries.forEach(({ optimistic, body }) => {
      apiClient.post('/api/food-entries', { body })
        .then((data) => setFoodEntries((prev) => prev.map((e) => (e.id === optimistic.id ? (data as FoodEntry) : e))))
        .catch(() => setFoodEntries((prev) => prev.filter((e) => e.id !== optimistic.id)));
    });
  }

  function handleFoodEntryDeleted(entryId: string) {
    setFoodEntries((prev) => prev.filter((e) => e.id !== entryId));
    apiClient.delete(`/api/food-entries/${entryId}`).catch(() => fetchFoodEntries(selectedDate));
  }

  function handleGoalChange(goal: number) {
    const prev = calorieGoal;
    setCalorieGoal(goal);
    apiClient
      .put('/api/calorie-goal', { body: { calorieGoal: goal } })
      .catch(() => setCalorieGoal(prev));
  }

  function handleRecipeCreated(
    optimistic: Recipe,
    body: { name: string; steps: string; caloriesPerServing: number; ingredients: { name: string; quantity: string; unit: string }[] },
  ) {
    setRecipes((prev) => [optimistic, ...prev]);
    setShowRecipeForm(false);
    apiClient
      .post('/api/recipes', { body })
      .then((data) =>
        setRecipes((prev) =>
          prev.map((r) => (r.id === optimistic.id ? (data as Recipe) : r)),
        ),
      )
      .catch(() =>
        setRecipes((prev) => prev.filter((r) => r.id !== optimistic.id)),
      );
  }

  function handleRecipeImported(optimistic: Recipe, body: any) {
    setRecipes((prev) => [optimistic, ...prev]);
    setShowRecipeImport(false);
    apiClient.post('/api/recipes', { body })
      .then((data) => setRecipes((prev) => prev.map((r) => (r.id === optimistic.id ? (data as Recipe) : r))))
      .catch(() => setRecipes((prev) => prev.filter((r) => r.id !== optimistic.id)));
  }

  function handleRecipeDelete(id: string) {
    const prev = recipes;
    setRecipes((r) => r.filter((recipe) => recipe.id !== id));
    if (selectedRecipeId === id) setSelectedRecipeId(null);
    apiClient.delete(`/api/recipes/${id}`).catch(() => setRecipes(prev));
  }

  function handleMealPrepCreated(body: {
    weekStartDate: string;
    entries: { dayOfWeek: string; mealType: string; recipeId: string }[];
  }) {
    setShowMealPrepForm(false);
    apiClient
      .post('/api/meal-prep', { body })
      .then((data) => setMealPrepPlan(data as MealPrepPlanData))
      .catch(() => { /* silently fail */ });
  }

  function handleMealPrepDeleted() {
    setMealPrepPlan(null);
    setSelectedMealPrepDay(null);
    setGroceryList(null);
    if (mealPrepPlan) {
      apiClient.delete(`/api/meal-prep/${mealPrepPlan.id}`).catch(() => fetchMealPrepPlan());
    }
  }

  const selectedRecipe = recipes.find((r) => r.id === selectedRecipeId) ?? null;

  return (
    <div className="text-text-primary">
      {/* Date selector */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">Diet</h2>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="bg-secondary text-text-primary border border-border rounded px-3 py-1.5 text-sm focus:outline-none focus:border-accent-primary"
          aria-label="Select date"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column — Calorie Tracker */}
        <div>
          <CalorieTracker
            entries={foodEntries}
            calorieGoal={calorieGoal}
            onGoalChange={handleGoalChange}
          />
        </div>

        {/* Right column — Food Entry Form + Entry List */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Food Log</h2>
            <div className="flex items-center gap-2">
              <button onClick={() => { setShowFoodImport(!showFoodImport); setShowFoodForm(false); }} className="text-accent-info text-sm hover:opacity-80">
                {showFoodImport ? 'Cancel' : '📋 Import'}
              </button>
              <button onClick={() => { setShowFoodForm(!showFoodForm); setShowFoodImport(false); }} className="text-accent-info text-sm hover:opacity-80">
                {showFoodForm ? 'Cancel' : '+ Log Food'}
              </button>
            </div>
          </div>
          {showFoodForm && (
            <div className="mb-4">
              <FoodEntryForm onCreated={handleFoodEntryCreated} />
            </div>
          )}
          {showFoodImport && (
            <div className="mb-4">
              <FoodEntryImport onImport={handleFoodImport} />
            </div>
          )}

          {/* Food entries list */}
          <div className="bg-card rounded-lg border border-border divide-y divide-border">
            {foodEntries.length === 0 ? (
              <p className="text-text-secondary text-sm text-center py-6">
                No food entries for this day. Log your first meal!
              </p>
            ) : (
              foodEntries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <span className="text-text-primary text-sm">{entry.foodName}</span>
                    <span className="text-text-secondary text-xs ml-2 capitalize">{entry.mealType}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-text-primary text-sm font-semibold">{entry.calories} kcal</span>
                      {(entry.protein > 0 || entry.carbs > 0 || entry.fat > 0) && (
                        <p className="text-text-secondary text-xs">
                          P:{entry.protein}g C:{entry.carbs}g F:{entry.fat}g
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleFoodEntryDeleted(entry.id)}
                      className="text-accent-warning text-xs hover:opacity-80"
                      aria-label={`Delete ${entry.foodName}`}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recipes section */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Recipes</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => { setShowRecipeImport(!showRecipeImport); setShowRecipeForm(false); setSelectedRecipeId(null); }} className="text-accent-info text-sm hover:opacity-80">
              {showRecipeImport ? 'Cancel' : '📋 Import'}
            </button>
            <button onClick={() => { setShowRecipeForm(!showRecipeForm); setShowRecipeImport(false); setSelectedRecipeId(null); }} className="text-accent-info text-sm hover:opacity-80">
              {showRecipeForm ? 'Cancel' : '+ New Recipe'}
            </button>
          </div>
        </div>

        {showRecipeForm && (
          <div className="mb-4">
            <RecipeForm onCreated={handleRecipeCreated} />
          </div>
        )}

        {showRecipeImport && (
          <div className="mb-4">
            <RecipeImport onImport={handleRecipeImported} />
          </div>
        )}

        {selectedRecipeId ? (
          <RecipeDetail recipe={selectedRecipe} onClose={() => setSelectedRecipeId(null)} />
        ) : (
          <RecipeList
            recipes={recipes}
            onSelect={(id) => { setSelectedRecipeId(id); setShowRecipeForm(false); }}
            onDelete={handleRecipeDelete}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />
        )}
      </div>

      {/* Meal Prep section */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Meal Prep</h2>
          <div className="flex items-center gap-2">
            {mealPrepPlan && (
              <button onClick={handleMealPrepDeleted} className="text-accent-warning text-sm hover:opacity-80">
                Delete Plan
              </button>
            )}
            <button
              onClick={() => setShowMealPrepForm(!showMealPrepForm)}
              className="text-accent-info text-sm hover:opacity-80"
            >
              {showMealPrepForm ? 'Cancel' : '+ New Plan'}
            </button>
          </div>
        </div>

        {showMealPrepForm && (
          <div className="mb-4">
            <MealPrepForm recipes={recipes} onCreated={handleMealPrepCreated} />
          </div>
        )}

        <div className="space-y-4">
          <MealPrepPlan
            plan={mealPrepPlan}
            onSelectDay={setSelectedMealPrepDay}
            selectedDay={selectedMealPrepDay}
          />
          {selectedMealPrepDay && (
            <GroceryList data={groceryList} day={selectedMealPrepDay} />
          )}
        </div>
      </div>
    </div>
  );
}
