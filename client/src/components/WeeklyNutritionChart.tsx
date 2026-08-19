import { useState, useEffect, useCallback } from 'react';
import { Flame } from 'lucide-react';
import { apiClient } from '../lib/apiClient';

interface Macro { calories: number; protein: number; carbs: number; fat: number }
interface FoodEntry { calories: number; protein: number; carbs: number; fat: number }

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
// Headroom above 100% so the goal tick doesn't sit at the very top of the track.
const TRACK_HEADROOM = 1.2;
const TRACK_HEIGHT = 64;

const ROWS: { key: keyof Macro; label: string; unit: string; color: string }[] = [
  { key: 'calories', label: 'Calories', unit: '', color: 'var(--info)' },
  { key: 'protein', label: 'Protein', unit: 'g', color: 'var(--bad)' },
  { key: 'fat', label: 'Fat', unit: 'g', color: 'var(--warn)' },
  { key: 'carbs', label: 'Carbs', unit: 'g', color: 'var(--good)' },
];

// Monday (YYYY-MM-DD) of the week containing the given date, computed on
// plain date components so it never shifts with the viewer's timezone.
function mondayOf(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y!, (m ?? 1) - 1, d ?? 1));
  const day = dt.getUTCDay();
  dt.setUTCDate(dt.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return dt.toISOString().slice(0, 10);
}
function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y!, (m ?? 1) - 1, d ?? 1));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}
function shortDay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y!, (m ?? 1) - 1, d ?? 1)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

const EMPTY: Macro = { calories: 0, protein: 0, carbs: 0, fat: 0 };

interface Props {
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

export default function WeeklyNutritionChart({ selectedDate, onSelectDate }: Props) {
  const [target, setTarget] = useState<Macro | null>(null);
  const [byDay, setByDay] = useState<Record<string, Macro>>({});
  const [view, setView] = useState<'consumed' | 'remaining'>('consumed');

  const monday = mondayOf(selectedDate);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  const fetchWeek = useCallback(async (weekMonday: string) => {
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekMonday, i));
    try {
      const [targetRes, ...entriesRes] = await Promise.all([
        apiClient.get(`/api/nutrition/target?date=${weekMonday}`) as Promise<{ target: Macro }>,
        ...weekDays.map((d) => apiClient.get(`/api/food-entries?date=${d}`) as Promise<FoodEntry[]>),
      ]);
      setTarget(targetRes.target);
      const sums: Record<string, Macro> = {};
      weekDays.forEach((d, i) => {
        sums[d] = (entriesRes[i] ?? []).reduce(
          (acc, e) => ({
            calories: acc.calories + (e.calories || 0),
            protein: acc.protein + (e.protein || 0),
            carbs: acc.carbs + (e.carbs || 0),
            fat: acc.fat + (e.fat || 0),
          }),
          { ...EMPTY },
        );
      });
      setByDay(sums);
    } catch { /* leave whatever we have — a transient failure isn't worth a toast here */ }
  }, []);

  useEffect(() => { fetchWeek(monday); }, [monday, fetchWeek]);

  const selected = byDay[selectedDate] ?? EMPTY;

  return (
    <section className="card arise-in" style={{ padding: 'var(--pad)' }}>
      <h3 style={{ fontSize: 17, marginBottom: 16 }}>Weekly Nutrition</h3>

      <div style={{ display: 'flex', gap: 18 }}>
        <div style={{ flex: 1, display: 'grid', gap: 10, minWidth: 0 }}>
          {ROWS.map((row) => (
            <div key={row.key} style={{ display: 'flex', gap: 6 }}>
              {days.map((d) => {
                const macro = byDay[d];
                const hasData = macro !== undefined && macro.calories > 0;
                const value = macro?.[row.key] ?? 0;
                const goal = target?.[row.key] ?? 0;
                const trackMax = goal > 0 ? goal * TRACK_HEADROOM : 1;
                const fillPct = Math.min(100, (value / trackMax) * 100);
                const tickPct = goal > 0 ? 100 / TRACK_HEADROOM : 0;
                const isSelected = d === selectedDate;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => onSelectDate(d)}
                    aria-label={`Select ${shortDay(d)} (${row.label})`}
                    title={shortDay(d)}
                    style={{
                      flex: 1, position: 'relative', height: TRACK_HEIGHT,
                      background: 'var(--surface-inset)', borderRadius: 6,
                      border: isSelected ? '1.5px solid var(--text)' : '1px solid transparent',
                      cursor: 'pointer', padding: 0, overflow: 'hidden',
                    }}
                  >
                    {hasData ? (
                      <>
                        <div style={{
                          position: 'absolute', left: 0, right: 0, bottom: 0, height: `${fillPct}%`,
                          background: row.color, transition: 'height .2s',
                        }} />
                        {goal > 0 && (
                          <div style={{ position: 'absolute', left: 2, right: 2, bottom: `${tickPct}%`, height: 2, background: 'var(--text)', opacity: 0.6 }} />
                        )}
                      </>
                    ) : (
                      <span style={{ position: 'absolute', top: 6, left: '50%', transform: 'translateX(-50%)', width: 12, height: 2, background: 'var(--text-faint)', opacity: 0.5 }} />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
          <div style={{ display: 'flex', gap: 6 }}>
            {days.map((d, i) => (
              <span key={d} className="eyebrow" style={{ flex: 1, textAlign: 'center', fontSize: 10.5, color: d === selectedDate ? 'var(--text)' : 'var(--text-faint)' }}>
                {DAY_LABELS[i]}
              </span>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gap: 10, minWidth: 84 }}>
          {ROWS.map((row) => {
            const goal = target?.[row.key] ?? 0;
            const value = view === 'consumed' ? selected[row.key] : Math.max(0, goal - selected[row.key]);
            return (
              <div key={row.key} style={{ minHeight: TRACK_HEIGHT, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div className="mono" style={{ fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  {Math.round(value)}
                  {row.key === 'calories' && <Flame size={13} style={{ color: 'var(--warn)' }} />}
                  {row.unit && <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{row.unit}</span>}
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--text-faint)' }}>of {Math.round(goal)}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
        <div style={{ display: 'inline-flex', background: 'var(--surface-inset)', borderRadius: 99, padding: 3 }}>
          {(['consumed', 'remaining'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              style={{
                padding: '6px 16px', fontSize: 12.5, fontWeight: 600, borderRadius: 99, border: 'none', cursor: 'pointer',
                background: view === v ? 'var(--surface)' : 'transparent',
                color: view === v ? 'var(--text)' : 'var(--text-faint)',
              }}
            >{v === 'consumed' ? 'Consumed' : 'Remaining'}</button>
          ))}
        </div>
      </div>
    </section>
  );
}
