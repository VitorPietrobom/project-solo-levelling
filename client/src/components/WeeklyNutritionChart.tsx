import { useState, useEffect, useCallback } from 'react';
import { Flame, Activity, Settings2, TrendingDown, Brain, Zap, Check } from 'lucide-react';
import { apiClient } from '../lib/apiClient';
import { useAriseAddXP } from './Dashboard';

interface Macro { calories: number; protein: number; carbs: number; fat: number }
interface FoodEntry { calories: number; protein: number; carbs: number; fat: number }
interface Adherence { proteinMet: boolean; caloriesOk: boolean; eligible: boolean; claimed: boolean; xp: number }
interface TargetResponse {
  date: string;
  weekStart: string;
  weekEnd: string;
  nextRecalibration: string;
  tdee: number | null;
  source: 'adaptive' | 'whoop' | 'fallback';
  daysOfData: number;
  goal: string;
  calorieDelta: number;
  weightKg: number | null;
  target: Macro;
  adherence: Adherence;
  suggestion: string | null;
}
interface SettingsResponse {
  goal: string; adjust: string; calorieDelta: number; proteinPerKg: number; fallbackCalories: number;
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
// Headroom above 100% so the goal tick doesn't sit at the very top of the bar.
const TRACK_HEADROOM = 1.2;
const BAR_HEIGHT = 42;
const BAR_WIDTH = 11;
const BAR_GAP = 3;
const GOAL_LABEL: Record<string, string> = { cut: 'Cut', maintain: 'Maintain', bulk: 'Bulk', recomp: 'Recomp' };

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
  /** Bumped by the parent whenever a food entry is logged/imported/deleted, so the week's totals refetch instead of only updating on next mount. */
  refreshKey?: number;
}

export default function WeeklyNutritionChart({ selectedDate, onSelectDate, refreshKey = 0 }: Props) {
  const addXP = useAriseAddXP();
  const [data, setData] = useState<TargetResponse | null>(null);
  const [byDay, setByDay] = useState<Record<string, Macro>>({});
  const [view, setView] = useState<'consumed' | 'remaining'>('consumed');
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [saving, setSaving] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const monday = mondayOf(selectedDate);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  const fetchTarget = useCallback(async () => {
    try { setData((await apiClient.get(`/api/nutrition/target?date=${selectedDate}`)) as TargetResponse); }
    catch { setData(null); }
  }, [selectedDate]);

  const fetchSettings = useCallback(async () => {
    try { setSettings((await apiClient.get('/api/nutrition/settings')) as SettingsResponse); }
    catch { /* ignore */ }
  }, []);

  const fetchWeekEntries = useCallback(async (weekMonday: string) => {
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekMonday, i));
    try {
      const entriesRes = await Promise.all(weekDays.map((d) => apiClient.get(`/api/food-entries?date=${d}`) as Promise<FoodEntry[]>));
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

  useEffect(() => { fetchTarget(); }, [fetchTarget, refreshKey]);
  useEffect(() => { fetchSettings(); }, [fetchSettings]);
  useEffect(() => { fetchWeekEntries(monday); }, [monday, fetchWeekEntries, refreshKey]);

  async function saveSettings(patch: Partial<SettingsResponse>) {
    setSaving(true);
    try {
      const next = (await apiClient.put('/api/nutrition/settings', { body: patch })) as SettingsResponse;
      setSettings(next);
      await fetchTarget();
    } finally { setSaving(false); }
  }

  async function claimXp() {
    if (!data) return;
    setClaiming(true);
    try {
      const r = (await apiClient.post('/api/nutrition/claim', { body: { date: selectedDate } })) as { awarded: boolean; xp: number };
      if (r.awarded) addXP(r.xp, 'Nutrition goal hit');
      await fetchTarget();
    } catch { /* not eligible yet */ } finally { setClaiming(false); }
  }

  const target = data?.target ?? null;
  const selected = byDay[selectedDate] ?? EMPTY;

  return (
    <section className="card arise-in" style={{ padding: 'var(--pad)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h3 style={{ fontSize: 17 }}>Weekly Nutrition</h3>
            {data && <span className="chip" style={{ fontSize: 11 }}>{GOAL_LABEL[data.goal] ?? data.goal}</span>}
          </div>
          {data && (
            <p style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 4 }}>
              {shortDay(data.weekStart)}–{shortDay(data.weekEnd)} · target is the same every day · recalibrates {shortDay(data.nextRecalibration)}
            </p>
          )}
        </div>
        <button className="btn btn-ghost" onClick={() => setShowSettings((v) => !v)}>
          <Settings2 size={14} />{showSettings ? 'Close' : 'Adjust'}
        </button>
      </div>

      {showSettings && settings && (
        <div style={{ background: 'var(--surface-inset)', borderRadius: 'var(--r-sm)', padding: 16, marginBottom: 18, display: 'grid', gap: 14 }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Goal</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['cut', 'maintain', 'bulk', 'recomp'].map((g) => (
                <button
                  key={g}
                  onClick={() => saveSettings({ goal: g, calorieDelta: g === 'cut' ? -500 : g === 'bulk' ? 300 : 0 })}
                  disabled={saving}
                  className="btn"
                  style={{
                    padding: '6px 12px', fontSize: 12.5,
                    background: settings.goal === g ? 'var(--accent)' : 'var(--surface)',
                    color: settings.goal === g ? 'var(--bg-0)' : 'var(--text-3)',
                    borderColor: settings.goal === g ? 'transparent' : 'var(--line-soft)',
                  }}
                >{GOAL_LABEL[g]}</button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
            <label style={{ fontSize: 12.5, color: 'var(--text-3)' }}>
              Goal kcal adjustment
              <input
                type="number" step={50} defaultValue={settings.calorieDelta}
                onBlur={(e) => saveSettings({ calorieDelta: Number(e.target.value) })}
                style={{ display: 'block', marginTop: 5, width: 110, background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r-sm)', padding: '6px 10px', fontSize: 13 }}
              />
            </label>
            <label style={{ fontSize: 12.5, color: 'var(--text-3)' }}>
              Protein g/kg bodyweight
              <input
                type="number" step={0.1} defaultValue={settings.proteinPerKg}
                onBlur={(e) => saveSettings({ proteinPerKg: Number(e.target.value) })}
                style={{ display: 'block', marginTop: 5, width: 110, background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r-sm)', padding: '6px 10px', fontSize: 13 }}
              />
            </label>
            <label style={{ fontSize: 12.5, color: 'var(--text-3)' }}>
              Base calories (until adaptive)
              <input
                type="number" step={50} defaultValue={settings.fallbackCalories}
                onBlur={(e) => saveSettings({ fallbackCalories: Number(e.target.value) })}
                style={{ display: 'block', marginTop: 5, width: 110, background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r-sm)', padding: '6px 10px', fontSize: 13 }}
              />
            </label>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 12 }}>
            Base calories are only used until WHOOP or ~2 weeks of logs unlock your adaptive TDEE.
          </p>
        </div>
      )}

      <div style={{ display: 'flex', gap: 18 }}>
        <div style={{ flex: 1, display: 'flex', gap: 6, minWidth: 0 }}>
          {days.map((d, dayIndex) => {
            const macro = byDay[d];
            const hasData = macro !== undefined && macro.calories > 0;
            const isSelected = d === selectedDate;
            return (
              <button
                key={d}
                type="button"
                onClick={() => onSelectDate(d)}
                aria-label={`Select ${shortDay(d)}`}
                title={shortDay(d)}
                style={{
                  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: BAR_GAP,
                  padding: '6px 3px', borderRadius: 14, cursor: 'pointer',
                  background: 'transparent',
                  border: `1.5px solid ${isSelected ? 'var(--text)' : 'transparent'}`,
                }}
              >
                {ROWS.map((row) => {
                  const value = macro?.[row.key] ?? 0;
                  const goal = target?.[row.key] ?? 0;
                  const trackMax = goal > 0 ? goal * TRACK_HEADROOM : 1;
                  const fillPct = Math.min(100, (value / trackMax) * 100);
                  const tickPct = goal > 0 ? 100 / TRACK_HEADROOM : 0;
                  return (
                    <div
                      key={row.key}
                      style={{
                        position: 'relative', width: BAR_WIDTH, height: BAR_HEIGHT,
                        background: 'var(--surface-inset)', borderRadius: 999, overflow: 'hidden', flexShrink: 0,
                      }}
                    >
                      {hasData && (
                        <div style={{
                          position: 'absolute', left: 0, right: 0, bottom: 0, height: `${fillPct}%`,
                          background: row.color, borderRadius: 999, transition: 'height .2s',
                        }} />
                      )}
                      {goal > 0 && (
                        <div style={{ position: 'absolute', left: 2, right: 2, bottom: `${tickPct}%`, height: 1.5, background: 'var(--text)', opacity: 0.5, borderRadius: 1 }} />
                      )}
                    </div>
                  );
                })}
                <span className="eyebrow" style={{ fontSize: 11.5, fontWeight: isSelected ? 700 : 500, marginTop: 2, color: isSelected ? 'var(--text)' : 'var(--text-faint)' }}>
                  {DAY_LABELS[dayIndex]}
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ display: 'grid', gap: BAR_GAP, minWidth: 84, alignContent: 'center' }}>
          {ROWS.map((row) => {
            const goal = target?.[row.key] ?? 0;
            const value = view === 'consumed' ? selected[row.key] : Math.max(0, goal - selected[row.key]);
            return (
              <div key={row.key} style={{ height: BAR_HEIGHT, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div className="mono" style={{ fontSize: 17, fontWeight: 700, display: 'flex', alignItems: 'baseline', gap: 4 }}>
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

      <div style={{ display: 'flex', justifyContent: 'center', margin: '16px 0' }}>
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

      {data && (
        <>
          {/* Daily nutrition XP */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '11px 14px', background: 'var(--surface-inset)', borderRadius: 'var(--r-sm)', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--text-2)' }}>
              <Zap size={15} style={{ color: data.adherence.claimed ? 'var(--good)' : 'var(--accent)' }} />
              {data.adherence.claimed
                ? <span>Daily nutrition XP claimed <span className="mono" style={{ color: 'var(--good)' }}>+{data.adherence.xp}</span></span>
                : data.adherence.eligible
                  ? <span>Targets hit! Claim your <span className="mono" style={{ color: 'var(--accent)' }}>+{data.adherence.xp} XP</span></span>
                  : <span style={{ color: 'var(--text-faint)' }}>Hit ~90% protein & stay within calories to earn <span className="mono">+{data.adherence.xp} XP</span></span>}
            </div>
            {data.adherence.claimed ? (
              <span className="chip" style={{ color: 'var(--good)', borderColor: 'var(--good)' }}><Check size={13} /> Done</span>
            ) : (
              <button className="btn btn-primary" onClick={claimXp} disabled={!data.adherence.eligible || claiming} style={{ opacity: data.adherence.eligible ? 1 : 0.5 }}>
                <Zap size={14} strokeWidth={2.4} />{claiming ? 'Claiming…' : 'Claim XP'}
              </button>
            )}
          </div>

          {/* TDEE source line */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 12, color: 'var(--text-faint)' }}>
            {data.source === 'adaptive' ? (
              <>
                <Brain size={13} style={{ color: 'var(--accent-2)' }} />
                <span>Adaptive TDEE {data.tdee} kcal — calibrated from your logged days + weight trend over the prior weeks{data.weightKg ? ` · ${Math.round(data.weightKg)} kg` : ''}</span>
              </>
            ) : data.source === 'whoop' ? (
              <>
                <Activity size={13} style={{ color: 'var(--accent)' }} />
                <span>Burn {data.tdee} kcal (WHOOP, last week's {data.daysOfData}-day avg){data.weightKg ? ` · ${Math.round(data.weightKg)} kg` : ''}</span>
              </>
            ) : (
              <>
                <Flame size={13} />
                <span>Static target — connect WHOOP or log weight + food for ~2 weeks to unlock adaptive TDEE.</span>
              </>
            )}
          </div>

          {data.suggestion && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 12, padding: '10px 14px', background: 'var(--accent-2-soft)', borderRadius: 'var(--r-sm)', fontSize: 12.5, color: 'var(--text-2)' }}>
              <TrendingDown size={14} style={{ color: 'var(--accent-2)', flexShrink: 0, marginTop: 1 }} />
              <span>{data.suggestion}</span>
            </div>
          )}
        </>
      )}
    </section>
  );
}
