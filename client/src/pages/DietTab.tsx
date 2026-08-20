import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import type { FoodEntry } from '../components/CalorieTracker';
import FoodEntryForm from '../components/FoodEntryForm';
import FoodEntryImport from '../components/FoodEntryImport';
import BarcodeFoodForm from '../components/BarcodeFoodForm';

// The barcode-decoding libraries are ~110KB gzipped and only needed once
// someone taps "Scan Barcode" — split out of the main bundle instead of
// loading them on every visit to the Diet tab.
const BarcodeScanner = lazy(() => import('../components/BarcodeScanner'));
import type { Recipe } from '../components/RecipeList';
import MealPrepPlan from '../components/MealPrepPlan';
import type { MealPrepPlanData } from '../components/MealPrepPlan';
import MealPrepForm from '../components/MealPrepForm';
import MealPlanImport from '../components/MealPlanImport';
import GroceryList from '../components/GroceryList';
import type { GroceryListData } from '../components/GroceryList';
import WeeklyNutritionChart from '../components/WeeklyNutritionChart';
import NutritionAiPrompt from '../components/NutritionAiPrompt';
import { apiClient, errorMessage } from '../lib/apiClient';
import { useToast } from '../contexts/ToastContext';

// The Monday that opens the current week, YYYY-MM-DD (local).
function getCurrentMonday(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().split('T')[0];
}

export default function DietTab() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [foodEntries, setFoodEntries] = useState<FoodEntry[]>([]);
  const [showFoodForm, setShowFoodForm] = useState(false);
  const [showFoodImport, setShowFoodImport] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  // Bumped whenever a food entry is confirmed logged/imported/deleted, so
  // WeeklyNutritionChart (which fetches its own week of entries) refetches
  // instead of only picking up the change on the next mount.
  const [foodRefreshKey, setFoodRefreshKey] = useState(0);
  const bumpFoodRefresh = useCallback(() => setFoodRefreshKey((k) => k + 1), []);

  // Recipes — fetched only to populate the meal-prep planner; managed in the Recipes tab
  const [recipes, setRecipes] = useState<Recipe[]>([]);

  // Meal prep state
  const [mealPrepPlan, setMealPrepPlan] = useState<MealPrepPlanData | null>(null);
  const [selectedMealPrepDay, setSelectedMealPrepDay] = useState<string | null>(null);
  const [groceryList, setGroceryList] = useState<GroceryListData | null>(null);
  const [showMealPrepForm, setShowMealPrepForm] = useState(false);
  const [showMealPrepAi, setShowMealPrepAi] = useState(false);

  // Guards against a slower response for an older date landing after a
  // faster response for a newer one and overwriting it with stale data —
  // only the most recently requested date's response is ever applied.
  const latestRequestedDate = useRef<string | null>(null);

  const fetchFoodEntries = useCallback(async (date: string) => {
    latestRequestedDate.current = date;
    try {
      const data = (await apiClient.get(`/api/food-entries?date=${date}`)) as FoodEntry[];
      if (latestRequestedDate.current === date) setFoodEntries(data);
    } catch (err) {
      if (latestRequestedDate.current === date) showToast(errorMessage(err, 'Failed to load food entries'));
    }
  }, [showToast]);

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
    Promise.all([fetchFoodEntries(selectedDate), fetchMealPrepPlan()]).finally(() => setLoading(false));
  }, [fetchFoodEntries, fetchMealPrepPlan, selectedDate]);

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
      .then((data) => {
        setFoodEntries((prev) =>
          prev.map((e) => (e.id === optimistic.id ? (data as FoodEntry) : e)),
        );
        bumpFoodRefresh();
      })
      .catch((err) => {
        setFoodEntries((prev) => prev.filter((e) => e.id !== optimistic.id));
        showToast(errorMessage(err, 'Failed to log food entry'));
      });
  }

  function handleFoodImport(entries: { optimistic: FoodEntry; body: any }[]) {
    setFoodEntries((prev) => [...prev, ...entries.map((e) => e.optimistic)]);
    setShowFoodImport(false);
    // Fire all POSTs in parallel, then refresh the weekly chart once
    // everything has settled rather than once per entry.
    Promise.allSettled(
      entries.map(({ optimistic, body }) =>
        apiClient.post('/api/food-entries', { body })
          .then((data) => setFoodEntries((prev) => prev.map((e) => (e.id === optimistic.id ? (data as FoodEntry) : e))))
          .catch((err) => {
            setFoodEntries((prev) => prev.filter((e) => e.id !== optimistic.id));
            showToast(errorMessage(err, 'Failed to import a food entry'));
          }),
      ),
    ).then(bumpFoodRefresh);
  }

  function handleFoodEntryDeleted(entryId: string) {
    setFoodEntries((prev) => prev.filter((e) => e.id !== entryId));
    apiClient.delete(`/api/food-entries/${entryId}`)
      .then(bumpFoodRefresh)
      .catch((err) => {
        fetchFoodEntries(selectedDate);
        showToast(errorMessage(err, 'Failed to delete food entry'));
      });
  }


  function handleMealPrepCreated(body: {
    weekStartDate: string;
    entries: { dayOfWeek: string; mealType: string; recipeId: string }[];
  }) {
    setShowMealPrepForm(false);
    apiClient
      .post('/api/meal-prep', { body })
      .then((data) => setMealPrepPlan(data as MealPrepPlanData))
      .catch((err) => showToast(errorMessage(err, 'Failed to create meal prep plan')));
  }

  // Removes a single assigned meal by re-posting the week's plan without it —
  // createOrUpdateMealPrepPlan already does a full delete+recreate of entries
  // server-side, so this needs no new endpoint. If it was the last entry,
  // the create endpoint would reject an empty entries array, so fall back
  // to deleting the whole (now-empty) plan instead.
  function handleMealPrepEntryRemoved(entryId: string) {
    if (!mealPrepPlan) return;
    const remaining = mealPrepPlan.entries.filter((e) => e.id !== entryId);
    if (remaining.length === 0) {
      handleMealPrepDeleted();
      return;
    }
    const prevPlan = mealPrepPlan;
    setMealPrepPlan({ ...mealPrepPlan, entries: remaining });
    apiClient
      .post('/api/meal-prep', {
        body: {
          weekStartDate: mealPrepPlan.weekStartDate,
          entries: remaining.map((e) => ({ dayOfWeek: e.dayOfWeek, mealType: e.mealType, recipeId: e.recipeId })),
        },
      })
      .then((data) => setMealPrepPlan(data as MealPrepPlanData))
      .catch((err) => {
        setMealPrepPlan(prevPlan);
        showToast(errorMessage(err, 'Failed to remove meal'));
      });
  }

  function handleMealPrepDeleted() {
    setMealPrepPlan(null);
    setSelectedMealPrepDay(null);
    setGroceryList(null);
    if (mealPrepPlan) {
      apiClient.delete(`/api/meal-prep/${mealPrepPlan.id}`).catch((err) => {
        fetchMealPrepPlan();
        showToast(errorMessage(err, 'Failed to delete meal prep plan'));
      });
    }
  }

  if (loading) {
    return <p style={{ color: 'var(--text-faint)', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>Loading…</p>;
  }

  return (
    <>
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

      <WeeklyNutritionChart selectedDate={selectedDate} onSelectDate={setSelectedDate} refreshKey={foodRefreshKey} />

      <div>
        {/* Food Entry Form + Entry List */}
        <section className="card arise-in" style={{ padding: 'var(--pad)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: 17 }}>Food Log</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={() => { setShowScanner(true); setShowFoodForm(false); setShowFoodImport(false); setScannedCode(null); }}
                className="btn btn-ghost"
              >
                Scan Barcode
              </button>
              <button onClick={() => { setShowFoodImport(!showFoodImport); setShowFoodForm(false); setScannedCode(null); }} className="btn btn-ghost">
                {showFoodImport ? 'Cancel' : 'Import'}
              </button>
              <button onClick={() => { setShowFoodForm(!showFoodForm); setShowFoodImport(false); setScannedCode(null); }} className="btn btn-ghost">
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
          {scannedCode && (
            <div style={{ marginBottom: 16 }}>
              <BarcodeFoodForm
                code={scannedCode}
                defaultDate={selectedDate}
                onCreated={(optimistic, body) => { handleFoodEntryCreated(optimistic, body); setScannedCode(null); }}
                onCancel={() => setScannedCode(null)}
              />
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <h3 style={{ fontSize: 17 }}>Meal Prep — This Week</h3>
            <p style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 3 }}>
              Build a week with AI, or assign your own recipes by hand.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {mealPrepPlan && (
              <button onClick={handleMealPrepDeleted} className="btn btn-ghost" style={{ color: 'var(--bad)' }}>
                Delete Plan
              </button>
            )}
            <button
              className="btn btn-primary"
              onClick={() => { setShowMealPrepAi((v) => !v); setShowMealPrepForm(false); }}
            >
              {showMealPrepAi ? 'Close' : '✨ Build with AI'}
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => { setShowMealPrepForm(!showMealPrepForm); setShowMealPrepAi(false); }}
            >
              {showMealPrepForm ? 'Cancel' : '+ Manual plan'}
            </button>
          </div>
        </div>

        {showMealPrepAi && (
          <div style={{ marginBottom: 16 }}>
            <MealPlanImport
              weekStartDate={getCurrentMonday()}
              onImported={(plan) => { setMealPrepPlan(plan as MealPrepPlanData); setShowMealPrepAi(false); fetchMealPrepPlan(); }}
            />
          </div>
        )}

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
            onRemoveEntry={handleMealPrepEntryRemoved}
          />
          {selectedMealPrepDay && (
            <GroceryList data={groceryList} day={selectedMealPrepDay} />
          )}
        </div>
      </section>

      {/* Copyable AI analysis prompt (bring-your-own-AI, no API cost) */}
      <NutritionAiPrompt date={selectedDate} />
    </div>

    {showScanner && (
      <Suspense fallback={null}>
        <BarcodeScanner
          onDetected={(code) => { setShowScanner(false); setScannedCode(code); setShowFoodForm(false); setShowFoodImport(false); }}
          onClose={() => setShowScanner(false)}
        />
      </Suspense>
    )}
    </>
  );
}
