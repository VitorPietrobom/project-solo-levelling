import { useState, useCallback } from 'react';
import { Sparkles, Copy, Check } from 'lucide-react';
import { apiClient } from '../lib/apiClient';

interface DailyRow {
  date: string;
  intakeCalories: number; protein: number; carbs: number; fat: number; meals: number;
  burnedCalories: number | null; strain: number | null;
  weightKg: number | null; net: number | null;
}
interface ExportPayload {
  daily: DailyRow[];
  nutritionSettings: { goal: string; adjust: string; calorieDelta: number; proteinPerKg: number } | null;
  raw: { foodEntries: { date: string; foodName: string; calories: number; protein: number; carbs: number; fat: number; mealType: string }[] };
}
interface TargetResponse {
  goal: string; weightKg: number | null;
  target: { calories: number; protein: number; carbs: number; fat: number };
}

const GOAL_LABEL: Record<string, string> = { cut: 'cut (fat loss)', maintain: 'maintain', bulk: 'bulk (muscle gain)', recomp: 'recomposition' };

function buildPrompt(data: ExportPayload, target: TargetResponse | null, date: string): string {
  const recent = data.daily.slice(-7);
  const goal = target?.goal ?? data.nutritionSettings?.goal ?? 'maintain';
  const weight = target?.weightKg ?? recent[recent.length - 1]?.weightKg ?? null;

  const goalLine = `Goal: ${GOAL_LABEL[goal] ?? goal}${data.nutritionSettings?.calorieDelta ? ` (daily calorie ${data.nutritionSettings.calorieDelta > 0 ? 'surplus' : 'deficit'} of ${Math.abs(data.nutritionSettings.calorieDelta)} kcal)` : ''}.`;
  const bodyLine = weight ? `Current bodyweight: ${Math.round(weight)} kg.` : '';
  const targetLine = target
    ? `Today's targets: ${target.target.calories} kcal, protein ${target.target.protein} g, carbs ${target.target.carbs} g, fat ${target.target.fat} g.`
    : '';

  const table = ['date | intake kcal | protein g | carbs g | fat g | burned kcal | weight kg',
    ...recent.map((d) =>
      `${d.date} | ${d.intakeCalories} | ${Math.round(d.protein)} | ${Math.round(d.carbs)} | ${Math.round(d.fat)} | ${d.burnedCalories ?? '—'} | ${d.weightKg != null ? Math.round(d.weightKg) : '—'}`,
    )].join('\n');

  const todaysFoods = data.raw.foodEntries
    .filter((f) => f.date === date)
    .map((f) => `- ${f.foodName} — ${f.calories} kcal (P ${f.protein} / C ${f.carbs} / F ${f.fat}), ${f.mealType}`);
  const foodBlock = todaysFoods.length
    ? `Individual foods I logged on ${date}:\n${todaysFoods.join('\n')}`
    : `I have no individual foods logged for ${date} yet.`;

  return `You are an experienced sports nutritionist. Analyze my recent nutrition and flag likely gaps. I only track calories and macros (protein/carbs/fat) — I do NOT track vitamins or minerals, so infer my micronutrient intake from the food names below.

${[goalLine, bodyLine, targetLine].filter(Boolean).join(' ')}

Daily log (last ${recent.length} days). "burned kcal" is total energy expenditure from my WHOOP band where available:
${table}

${foodBlock}

Please give me:
1. **Likely micronutrient gaps** — the top 3–5 vitamins/minerals I'm probably low on based on the foods above, with a one-line reason each and the rough RDA you're comparing against.
2. **Macro & calorie assessment** — whether my macro split and calorie balance fit my goal, referencing the intake-vs-burned trend.
3. **5 specific foods to add** — easy, goal-appropriate foods that would fill the biggest gaps, and which nutrient each covers.
4. **Data quality note** — if any of my food entries are too vague to estimate well, tell me exactly what extra detail (portion size, cooking method, brand) would sharpen the analysis.

Ground everything in general nutrition science. Be concise and specific — no long preamble.`;
}

export default function NutritionAiPrompt({ date }: { date: string }) {
  const [prompt, setPrompt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, target] = await Promise.all([
        apiClient.get('/api/export') as Promise<ExportPayload>,
        apiClient.get(`/api/nutrition/target?date=${date}`).catch(() => null) as Promise<TargetResponse | null>,
      ]);
      setPrompt(buildPrompt(data, target, date));
    } catch {
      setError('Could not gather your data. Try again.');
    } finally {
      setLoading(false);
    }
  }, [date]);

  async function copy() {
    if (!prompt) return;
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard blocked — user can select manually */ }
  }

  return (
    <section className="card arise-in" style={{ padding: 'var(--pad)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--accent-2-soft)', color: 'var(--accent-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={17} />
          </div>
          <h3 style={{ fontSize: 17 }}>AI Nutrition Analysis</h3>
        </div>
        <button className="btn btn-primary" onClick={generate} disabled={loading}>
          <Sparkles size={15} strokeWidth={2.4} />{loading ? 'Gathering…' : prompt ? 'Regenerate' : 'Generate prompt'}
        </button>
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-faint)', marginBottom: 14, maxWidth: 560 }}>
        Bundles your last 7 days of intake, macros, WHOOP burn, weight, and today's foods into a prompt.
        Copy it into ChatGPT, Claude, or any AI you already use — no account or API key needed here.
      </p>

      {error && <p style={{ color: 'var(--warn)', fontSize: 13, marginBottom: 12 }}>{error}</p>}

      {prompt && (
        <>
          <textarea
            value={prompt}
            readOnly
            onFocus={(e) => e.currentTarget.select()}
            style={{
              width: '100%', minHeight: 200, resize: 'vertical',
              background: 'var(--surface-inset)', color: 'var(--text-2)',
              border: '1px solid var(--line-soft)', borderRadius: 'var(--r-sm)',
              padding: '12px 14px', fontSize: 12.5, fontFamily: 'var(--font-mono)', lineHeight: 1.5,
              outline: 'none',
            }}
            aria-label="AI nutrition analysis prompt"
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
            <button className="btn" onClick={copy}>
              {copied ? <><Check size={15} /> Copied</> : <><Copy size={15} /> Copy prompt</>}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
