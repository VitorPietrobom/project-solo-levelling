import { useState, useEffect, useCallback } from 'react';
import { Flame, Activity, Settings2, TrendingDown } from 'lucide-react';
import Ring from './ui/Ring';
import XPBar from './ui/XPBar';
import { apiClient } from '../lib/apiClient';

interface Macro { calories: number; protein: number; carbs: number; fat: number }
interface TargetResponse {
  date: string;
  tdee: number | null;
  source: 'whoop' | 'fallback';
  daysOfData: number;
  goal: string;
  calorieDelta: number;
  weightKg: number | null;
  target: Macro;
  suggestion: string | null;
}
interface SettingsResponse {
  goal: string; adjust: string; calorieDelta: number; proteinPerKg: number; fallbackCalories: number;
}

interface Props {
  /** today's logged intake, computed by the Diet tab from its food entries */
  consumed: Macro;
  date: string;
}

const GOAL_LABEL: Record<string, string> = { cut: 'Cut', maintain: 'Maintain', bulk: 'Bulk', recomp: 'Recomp' };

function MacroBar({ label, value, target, color, unit = 'g' }: {
  label: string; value: number; target: number; color: string; unit?: string;
}) {
  const left = target - value;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12.5 }}>
        <span style={{ color: 'var(--text-2)', fontWeight: 600 }}>{label}</span>
        <span className="mono" style={{ color: 'var(--text-3)' }}>
          {Math.round(value)} / {target}{unit}
        </span>
      </div>
      <XPBar value={value} max={target || 1} height={7} color={color} />
      <div className="mono" style={{ fontSize: 11, color: left < 0 ? 'var(--bad)' : 'var(--text-faint)', marginTop: 4 }}>
        {left >= 0 ? `${Math.round(left)}${unit} left` : `${Math.round(-left)}${unit} over`}
      </div>
    </div>
  );
}

export default function NutritionTarget({ consumed, date }: Props) {
  const [data, setData] = useState<TargetResponse | null>(null);
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchTarget = useCallback(async () => {
    try { setData((await apiClient.get(`/api/nutrition/target?date=${date}`)) as TargetResponse); }
    catch { setData(null); }
  }, [date]);

  const fetchSettings = useCallback(async () => {
    try { setSettings((await apiClient.get('/api/nutrition/settings')) as SettingsResponse); }
    catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchTarget(); fetchSettings(); }, [fetchTarget, fetchSettings]);

  async function saveSettings(patch: Partial<SettingsResponse>) {
    setSaving(true);
    try {
      const next = (await apiClient.put('/api/nutrition/settings', { body: patch })) as SettingsResponse;
      setSettings(next);
      await fetchTarget();
    } finally { setSaving(false); }
  }

  if (!data) {
    return (
      <section className="card arise-in" style={{ padding: 'var(--pad)' }}>
        <h3 style={{ fontSize: 17, marginBottom: 8 }}>Nutrition Target</h3>
        <p style={{ color: 'var(--text-faint)', fontSize: 13 }}>Loading…</p>
      </section>
    );
  }

  const t = data.target;
  const remaining = t.calories - consumed.calories;
  const pct = t.calories > 0 ? Math.min(100, Math.round((consumed.calories / t.calories) * 100)) : 0;
  const over = remaining < 0;

  return (
    <section className="card arise-in" style={{ padding: 'var(--pad)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h3 style={{ fontSize: 17 }}>Nutrition Target</h3>
          <span className="chip" style={{ fontSize: 11 }}>{GOAL_LABEL[data.goal] ?? data.goal}</span>
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
              Daily kcal adjustment
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
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
        <Ring value={Math.min(consumed.calories, t.calories)} max={t.calories || 1} size={132} thick={11} color={over ? 'var(--bad)' : 'var(--accent)'}>
          <span className="eyebrow" style={{ fontSize: 9 }}>{over ? 'OVER BY' : 'REMAINING'}</span>
          <span className="mono" style={{ fontSize: 30, fontWeight: 700, lineHeight: 1, color: 'var(--text)' }}>
            {Math.abs(remaining)}
          </span>
          <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>kcal</span>
        </Ring>

        <div style={{ flex: 1, minWidth: 200, display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span className="mono" style={{ color: 'var(--text-3)' }}>{consumed.calories} eaten</span>
            <span className="mono" style={{ color: 'var(--text-3)' }}>{t.calories} target · {pct}%</span>
          </div>
          <MacroBar label="Protein" value={consumed.protein} target={t.protein} color="var(--accent)" />
          <MacroBar label="Carbs" value={consumed.carbs} target={t.carbs} color="var(--info)" />
          <MacroBar label="Fat" value={consumed.fat} target={t.fat} color="var(--warn)" />
        </div>
      </div>

      {/* TDEE source line */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, fontSize: 12, color: 'var(--text-faint)' }}>
        {data.source === 'whoop' ? (
          <>
            <Activity size={13} style={{ color: 'var(--accent)' }} />
            <span>Burn {data.tdee} kcal (WHOOP {data.daysOfData}-day avg){data.weightKg ? ` · ${Math.round(data.weightKg)} kg` : ''}</span>
          </>
        ) : (
          <>
            <Flame size={13} />
            <span>Using fallback target — connect WHOOP on the Body tab for a dynamic burn-based goal.</span>
          </>
        )}
      </div>

      {data.suggestion && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 12, padding: '10px 14px', background: 'var(--accent-2-soft)', borderRadius: 'var(--r-sm)', fontSize: 12.5, color: 'var(--text-2)' }}>
          <TrendingDown size={14} style={{ color: 'var(--accent-2)', flexShrink: 0, marginTop: 1 }} />
          <span>{data.suggestion}</span>
        </div>
      )}
    </section>
  );
}
