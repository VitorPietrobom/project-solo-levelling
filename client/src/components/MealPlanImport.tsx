import { useState, useEffect, useCallback } from 'react';
import { Copy, Check, Sparkles, ChefHat, AlertCircle } from 'lucide-react';
import { apiClient } from '../lib/apiClient';

interface Macro { calories: number; protein: number; carbs: number; fat: number }
interface TargetResponse {
  tdee: number | null;
  goal: string;
  weightKg: number | null;
  target: Macro;
}

interface ImportResult { recipesCreated: number; mealsScheduled: number; plan: unknown }

interface Props {
  weekStartDate: string; // current Monday, YYYY-MM-DD
  onImported: (plan: unknown) => void;
}

const GOAL_WORD: Record<string, string> = {
  cut: 'losing fat while keeping muscle', maintain: 'maintaining weight',
  bulk: 'gaining muscle', recomp: 'body recomposition (lose fat, gain muscle)',
};

/**
 * Builds the consultation prompt. The app already knows the hard numbers (the
 * weekly calorie + macro targets from the nutrition engine), so we hand those
 * to the AI and let it do the qualitative part — preferences, budget, local
 * foods. The prompt instructs a MULTI-TURN interview because a one-shot prompt
 * can't ask anything, and a plan built without asking is generic.
 */
function buildPrompt(t: TargetResponse | null): string {
  const known = t && t.target.calories > 0;
  const numbers = known
    ? `Here are my targets (already calculated for me — build around them, don't recompute):
- Daily calories: ${t!.target.calories} kcal
- Protein: ${t!.target.protein} g/day (this is a floor — hit it)
- Carbs: ~${t!.target.carbs} g/day
- Fat: ~${t!.target.fat} g/day${t!.weightKg ? `\n- Bodyweight: ${Math.round(t!.weightKg)} kg` : ''}
- Goal: ${GOAL_WORD[t!.goal] ?? t!.goal}`
    : `First, ask me what my daily calorie and protein targets are (or ask for my weight, height, age, activity and goal and calculate them).`;

  return `You are an experienced registered dietitian and sports nutritionist running a one-on-one consultation with me to build a full 7-day meal-prep plan. Be evidence-based and practical. Ground your advice in established nutrition science (adequate protein of ~1.6–2.2 g/kg for training, ~14 g fiber per 1000 kcal, mostly whole foods, sensible micronutrient variety). Do not invent studies or citations.

${numbers}

# How this works
This is a CONVERSATION, not a form. Interview me FIRST — ask ONE question at a time and wait for my answer before the next. Keep going until you genuinely have what you need. Cover at least:
1. Country / city I live in — so every ingredient is actually available and affordable there, and you can lean on local, seasonal, cheap staples.
2. My weekly food budget and currency — the plan must fit it. Optimize cost: reuse ingredients across recipes, favour cheap protein sources, minimize waste.
3. Foods I love, foods I hate, and anything I can't eat (allergies, intolerances, religious/dietary rules — halal, vegetarian, etc.).
4. Cooking skill, how much time I have (and whether I want to batch-cook once and eat it several days), and my kitchen equipment.
5. How many meals a day and roughly when I eat them; whether I want snacks.
6. How much variety I want vs. how much repetition I'll tolerate (real meal prep leans on cooking a few things in bulk).

Ask follow-ups if my answers are vague. Only move on when you're confident the plan will actually fit my life.

# Designing the plan
- This is MEAL PREP: prefer a small set of recipes cooked in batches and repeated across the week, not 21 unique meals. That's what keeps it cheap and doable.
- Hit my protein target every day and land each day within ~100 kcal of the calorie target.
- Use real, weighable portions and metric units. Give realistic per-serving macros.
- Make sure the week is nutritionally varied enough (fiber, vegetables, fats) — not just protein shakes hitting a number.
- Briefly tell me the plan and your reasoning in plain language first, and let me request changes.

# Final output
ONCE I confirm I'm happy, output ONLY a single JSON object (no markdown fences, no commentary) in EXACTLY this shape:

{
  "weekSummary": "one or two sentences on the strategy",
  "recipes": [
    {
      "name": "Recipe name (unique)",
      "steps": "1. ...\\n2. ...",
      "servings": 4,
      "caloriesPerServing": 520,
      "protein": 42,
      "carbs": 48,
      "fat": 16,
      "ingredients": [ { "name": "Chicken breast", "quantity": "600", "unit": "g" } ]
    }
  ],
  "schedule": [
    { "dayOfWeek": "mon", "mealType": "breakfast", "recipeName": "Recipe name (unique)" }
  ]
}

Rules for the JSON:
- dayOfWeek is one of: mon, tue, wed, thu, fri, sat, sun.
- mealType is one of: breakfast, lunch, dinner, snack.
- Every schedule recipeName MUST exactly match a recipe "name" above.
- Macros are PER SERVING and should be realistic.
- Cover all 7 days. Reusing a recipe across multiple days/slots is encouraged.

Start now by asking me your first question.`;
}

export default function MealPlanImport({ weekStartDate, onImported }: Props) {
  const [target, setTarget] = useState<TargetResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [json, setJson] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [showPrompt, setShowPrompt] = useState(true);

  const fetchTarget = useCallback(async () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      setTarget((await apiClient.get(`/api/nutrition/target?date=${today}`)) as TargetResponse);
    } catch { setTarget(null); }
  }, []);
  useEffect(() => { fetchTarget(); }, [fetchTarget]);

  const prompt = buildPrompt(target);

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard blocked */ }
  }

  async function handleImport() {
    setError(null); setOk(null);
    let parsed: any;
    try {
      // Tolerate accidental ```json fences around the paste.
      const cleaned = json.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      setError('That is not valid JSON. Paste the final JSON block the AI gave you.');
      return;
    }
    if (!parsed || !Array.isArray(parsed.recipes) || !Array.isArray(parsed.schedule)) {
      setError('JSON must have "recipes" and "schedule" arrays.');
      return;
    }
    setImporting(true);
    try {
      const res = (await apiClient.post('/api/meal-prep/import', {
        body: { weekStartDate, recipes: parsed.recipes, schedule: parsed.schedule },
      })) as ImportResult;
      setOk(`Imported ${res.recipesCreated} recipes and scheduled ${res.mealsScheduled} meals.`);
      setJson('');
      onImported(res.plan);
    } catch (e: any) {
      setError(e?.body?.error ?? e?.message ?? 'Import failed. Check the JSON and try again.');
    } finally {
      setImporting(false);
    }
  }

  const inputBg = 'var(--surface-inset)';

  return (
    <div style={{ background: 'var(--surface-inset)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r)', padding: 16, display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <ChefHat size={16} style={{ color: 'var(--accent)' }} />
        <span style={{ fontWeight: 600, fontSize: 14 }}>AI meal-prep consultation</span>
      </div>
      <p style={{ fontSize: 12.5, color: 'var(--text-3)', lineHeight: 1.5, margin: 0 }}>
        Copy the prompt into any AI (ChatGPT, Claude, Gemini…). It interviews you like a nutritionist —
        your country, budget, foods you like — then builds a week around
        {target && target.target.calories > 0
          ? ` your ${target.target.calories} kcal / ${target.target.protein} g protein target.`
          : ' your calorie target.'}
        {' '}Paste its final JSON back here to import the whole plan.
      </p>

      <div>
        <button className="btn btn-primary" onClick={copyPrompt}>
          {copied ? <Check size={14} /> : <Copy size={14} />}{copied ? 'Copied!' : 'Copy consultation prompt'}
        </button>
        <button className="btn btn-ghost" style={{ marginLeft: 8 }} onClick={() => setShowPrompt((v) => !v)}>
          {showPrompt ? 'Hide prompt' : 'Preview prompt'}
        </button>
      </div>

      {showPrompt && (
        <pre style={{ background: 'var(--surface)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r-sm)', padding: 12, fontSize: 11, lineHeight: 1.5, color: 'var(--text-3)', maxHeight: 220, overflow: 'auto', whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'var(--font-mono)' }}>
          {prompt}
        </pre>
      )}

      <div style={{ height: 1, background: 'var(--line-soft)' }} />

      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <Sparkles size={14} style={{ color: 'var(--accent-2)' }} />
          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-2)' }}>Paste the plan JSON</span>
        </div>
        <textarea
          value={json}
          onChange={(e) => setJson(e.target.value)}
          placeholder='{ "recipes": [...], "schedule": [...] }'
          aria-label="Meal plan JSON"
          rows={5}
          style={{ width: '100%', background: inputBg, color: 'var(--text)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r-sm)', padding: '10px 12px', fontSize: 12, fontFamily: 'var(--font-mono)', outline: 'none', resize: 'vertical' }}
        />
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: 12.5, color: 'var(--bad)' }}>
          <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />{error}
        </div>
      )}
      {ok && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: 'var(--good)' }}>
          <Check size={14} />{ok}
        </div>
      )}

      <button className="btn btn-primary" onClick={handleImport} disabled={!json.trim() || importing}>
        {importing ? 'Importing…' : 'Import plan'}
      </button>
    </div>
  );
}
