import { useState, useEffect, useCallback } from 'react';
import CalorieTracker from '../components/CalorieTracker';
import type { FoodEntry } from '../components/CalorieTracker';
import FoodEntryForm from '../components/FoodEntryForm';
import { apiClient } from '../lib/apiClient';

export default function DietTab() {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [foodEntries, setFoodEntries] = useState<FoodEntry[]>([]);
  const [calorieGoal, setCalorieGoal] = useState(2000);
  const [showFoodForm, setShowFoodForm] = useState(false);

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

  useEffect(() => {
    fetchFoodEntries(selectedDate);
    fetchCalorieGoal();
  }, [fetchFoodEntries, fetchCalorieGoal, selectedDate]);

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

  function handleGoalChange(goal: number) {
    const prev = calorieGoal;
    setCalorieGoal(goal);
    apiClient
      .put('/api/calorie-goal', { body: { calorieGoal: goal } })
      .catch(() => setCalorieGoal(prev));
  }

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
            <button
              onClick={() => setShowFoodForm(!showFoodForm)}
              className="text-accent-info text-sm hover:opacity-80"
            >
              {showFoodForm ? 'Cancel' : '+ Log Food'}
            </button>
          </div>
          {showFoodForm && (
            <div className="mb-4">
              <FoodEntryForm onCreated={handleFoodEntryCreated} />
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
                  <div className="text-right">
                    <span className="text-text-primary text-sm font-semibold">{entry.calories} kcal</span>
                    {(entry.protein > 0 || entry.carbs > 0 || entry.fat > 0) && (
                      <p className="text-text-secondary text-xs">
                        P:{entry.protein}g C:{entry.carbs}g F:{entry.fat}g
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
