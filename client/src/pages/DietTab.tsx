import { useState, useEffect, useCallback } from 'react';
import CalorieTracker from '../components/CalorieTracker';
import type { FoodEntry } from '../components/CalorieTracker';
import FoodEntryForm from '../components/FoodEntryForm';
import FoodEntryImport from '../components/FoodEntryImport';
import type { Recipe } from '../components/RecipeList';
import MealPrepPlan from '../components/MealPrepPlan';
import type { MealPrepPlanData } from '../components/MealPrepPlan';
import MealPrepForm from '../components/MealPrepForm';
import GroceryList from '../components/GroceryList';
import type { GroceryListData } from '../components/GroceryList';
import NutritionTarget from '../components/NutritionTarget';
import { apiClient } from '../lib/apiClient';

export default function DietTab() {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [foodEntries, setFoodEntries] = useState<FoodEntry[]>([]);
  const [calorieGoal, setCalorieGoal] = useState(2000);
  const [showFoodForm, setShowFoodForm] = useState(false);
  const [showFoodImport, setShowFoodImport] = useState(false);

  // Recipes — fetched only to populate the meal-prep planner; managed in the Recipes tab
  const [recipes, setRecipes] = useState<Recipe[]>([]);

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

  const fetchRecipes = useCallback(async () => {
    try {
      const data = (await apiClient.get('/api/recipes')) as Recipe[];
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
    fetchRecipes();
  }, [fetchRecipes]);

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

  const consumed = foodEntries.reduce(
    (acc, e) => ({
      calories: acc.calories + (e.calories || 0),
      protein: acc.protein + (e.protein || 0),
      carbs: acc.carbs + (e.carbs || 0),
      fat: acc.fat + (e.fat || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  return (
    <div style={{ display: 'grid', gap: 'var(--gap)' }}>
      {/* Date selector */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="eyebrow">Select date</span>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          style={{ background: 'var(--surface-inset)', color: 'var(--text)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r-sm)', padding: '6px 12px', fontSize: 13, outline: 'none' }}
          aria-label="Select date"
        />
      </div>

      {/* Dynamic nutrition target (WHOOP-driven) */}
      <NutritionTarget consumed={consumed} date={selectedDate} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column — Calorie Tracker */}
        <section className="card arise-in" style={{ padding: 'var(--pad)' }}>
          <h3 style={{ fontSize: 17, marginBottom: 16 }}>Calories</h3>
          <CalorieTracker
            entries={foodEntries}
            calorieGoal={calorieGoal}
            onGoalChange={handleGoalChange}
          />
        </section>

        {/* Right column — Food Entry Form + Entry List */}
        <section className="card arise-in" style={{ padding: 'var(--pad)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: 17 }}>Food Log</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => { setShowFoodImport(!showFoodImport); setShowFoodForm(false); }} className="btn btn-ghost">
                {showFoodImport ? 'Cancel' : 'Import'}
              </button>
              <button onClick={() => { setShowFoodForm(!showFoodForm); setShowFoodImport(false); }} className="btn btn-ghost">
                {showFoodForm ? 'Cancel' : '+ Log Food'}
              </button>
            </div>
          </div>
          {showFoodForm && (
            <div style={{ marginBottom: 16 }}>
              <FoodEntryForm onCreated={handleFoodEntryCreated} />
            </div>
          )}
          {showFoodImport && (
            <div style={{ marginBottom: 16 }}>
              <FoodEntryImport onImport={handleFoodImport} defaultDate={selectedDate} />
            </div>
          )}

          {/* Food entries list */}
          <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
            {foodEntries.length === 0 ? (
              <p style={{ color: 'var(--text-faint)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
                No food entries for this day. Log your first meal!
              </p>
            ) : (
              foodEntries.map((entry) => (
                <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 14px', background: 'var(--surface-inset)', borderRadius: 'var(--r-sm)' }}>
                  <span className="chip" style={{ width: 80, justifyContent: 'center', fontSize: 11 }}>{entry.mealType}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{entry.foodName}</div>
                    {(entry.protein > 0 || entry.carbs > 0 || entry.fat > 0) && (
                      <div className="mono" style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>P {entry.protein}g · C {entry.carbs}g · F {entry.fat}g</div>
                    )}
                  </div>
                  <span className="mono" style={{ fontSize: 15, fontWeight: 600 }}>{entry.calories}<span style={{ fontSize: 11, color: 'var(--text-faint)', marginLeft: 3 }}>kcal</span></span>
                  <button
                    onClick={() => handleFoodEntryDeleted(entry.id)}
                    style={{ color: 'var(--bad)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}
                    aria-label={`Delete ${entry.foodName}`}
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Meal Prep section */}
      <section className="card arise-in" style={{ padding: 'var(--pad)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontSize: 17 }}>Meal Prep — This Week</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {mealPrepPlan && (
              <button onClick={handleMealPrepDeleted} className="btn btn-ghost" style={{ color: 'var(--bad)' }}>
                Delete Plan
              </button>
            )}
            <button className="btn btn-ghost" onClick={() => setShowMealPrepForm(!showMealPrepForm)}>
              {showMealPrepForm ? 'Cancel' : '+ New Plan'}
            </button>
          </div>
        </div>

        {showMealPrepForm && (
          <div style={{ marginBottom: 16 }}>
            <MealPrepForm recipes={recipes} onCreated={handleMealPrepCreated} />
          </div>
        )}

        <div style={{ display: 'grid', gap: 16 }}>
          <MealPrepPlan
            plan={mealPrepPlan}
            onSelectDay={setSelectedMealPrepDay}
            selectedDay={selectedMealPrepDay}
          />
          {selectedMealPrepDay && (
            <GroceryList data={groceryList} day={selectedMealPrepDay} />
          )}
        </div>
      </section>
    </div>
  );
}
