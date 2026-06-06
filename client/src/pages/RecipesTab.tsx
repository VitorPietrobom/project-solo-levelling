import { useState, useEffect, useCallback } from 'react';
import { Plus, Zap, Clock, X } from 'lucide-react';
import { apiClient } from '../lib/apiClient';
import type { Recipe, Ingredient } from '../components/RecipeList';
import XPBar from '../components/ui/XPBar';
import RecipeForm from '../components/RecipeForm';

interface RecipeWithMacros extends Recipe {
  category?: string;
  protein?: number;
  carbs?: number;
  fat?: number;
  timeMinutes?: number;
  servings?: number;
  favorite?: boolean;
  difficulty?: string;
  tags?: string[];
}

const CATEGORIES = ['All', 'Breakfast', 'Lunch', 'Dinner', 'Snack', 'Favorites'];
const CAT_COLOR: Record<string, string> = {
  Breakfast: 'var(--warn)',
  Lunch: 'var(--accent)',
  Dinner: 'var(--accent-2)',
  Snack: 'var(--good)',
};

function Metric({ label, value, unit, accent }: { label: string; value: number | string; unit: string; accent?: string }) {
  return (
    <div>
      <div className="eyebrow" style={{ marginBottom: 5 }}>{label}</div>
      <div className="mono" style={{ fontSize: 24, fontWeight: 700, color: accent ?? 'var(--text)' }}>
        {value}<span style={{ fontSize: 12, color: 'var(--text-faint)', marginLeft: 2 }}>{unit}</span>
      </div>
    </div>
  );
}

function RecipeModal({ recipe, onClose }: { recipe: RecipeWithMacros; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const p = recipe.protein ?? 0;
  const c = recipe.carbs ?? 0;
  const f = recipe.fat ?? 0;
  const maxMacro = Math.max(p, c, f) || 1;
  const macros: [string, number, string][] = [
    ['Protein', p, 'var(--accent)'],
    ['Carbs', c, 'var(--info)'],
    ['Fat', f, 'var(--warn)'],
  ];

  const steps = recipe.steps ? recipe.steps.split('\n').filter(Boolean) : [];

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 70,
        background: 'oklch(0.1 0.02 264 / 0.6)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--r-lg)',
          maxWidth: 720,
          width: '100%',
          maxHeight: '86vh',
          overflowY: 'auto',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '26px 28px',
            borderBottom: '1px solid var(--line-soft)',
            position: 'relative',
            background: 'radial-gradient(120% 120% at 100% 0%, var(--accent-soft), transparent 55%)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                {recipe.category && (
                  <span className="chip" style={{ color: 'var(--accent)' }}>{recipe.category}</span>
                )}
                {recipe.difficulty && <span className="chip">{recipe.difficulty}</span>}
                {(recipe.tags ?? []).map((t) => <span key={t} className="chip">{t}</span>)}
              </div>
              <h2 style={{ fontSize: 26 }}>{recipe.name}</h2>
            </div>
            <button onClick={onClose} className="btn btn-ghost" style={{ fontSize: 20, lineHeight: 1, padding: '4px 10px' }}>
              <X size={18} />
            </button>
          </div>
          <div style={{ display: 'flex', gap: 26, marginTop: 18 }}>
            <Metric label="Calories" value={recipe.caloriesPerServing} unit="kcal" />
            <Metric label="Time" value={recipe.timeMinutes ?? '—'} unit="min" />
            <Metric label="Serves" value={recipe.servings ?? '—'} unit="" />
          </div>
        </div>

        {/* Macro bars */}
        <div
          style={{
            padding: '20px 28px',
            borderBottom: '1px solid var(--line-soft)',
          }}
          className="grid-3-col"
        >
          {macros.map(([label, v, col]) => (
            <div key={label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
                <span className="mono" style={{ fontSize: 13, color: col }}>{v}g</span>
              </div>
              <XPBar value={v} max={maxMacro} height={6} color={col} />
            </div>
          ))}
        </div>

        {/* Ingredients + Steps */}
        <div
          className="grid-2-col"
          style={{
            padding: '24px 28px',
          }}
        >
          <div>
            <h3 style={{ fontSize: 15, marginBottom: 14 }}>Ingredients</h3>
            <div style={{ display: 'grid', gap: 9 }}>
              {recipe.ingredients.map((ing, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: 'var(--text-2)' }}>
                  <span style={{ width: 6, height: 6, borderRadius: 99, background: 'var(--accent)', flexShrink: 0 }} />
                  {ing.quantity} {ing.unit} {ing.name}
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 style={{ fontSize: 15, marginBottom: 14 }}>Method</h3>
            <div style={{ display: 'grid', gap: 14 }}>
              {steps.map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: 12 }}>
                  <span
                    className="mono"
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 8,
                      background: 'var(--accent-soft)',
                      color: 'var(--accent)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 13,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </span>
                  <span style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.5, paddingTop: 3 }}>{step}</span>
                </div>
              ))}
              {steps.length === 0 && (
                <p style={{ fontSize: 13.5, color: 'var(--text-3)' }}>No steps provided.</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '18px 28px',
            borderTop: '1px solid var(--line-soft)',
            display: 'flex',
            gap: 10,
            justifyContent: 'flex-end',
          }}
        >
          <button className="btn"><Plus size={15} strokeWidth={2.4} />Add to meal plan</button>
          <button className="btn btn-primary"><Zap size={15} strokeWidth={2.6} />Log as eaten</button>
        </div>
      </div>
    </div>
  );
}

export default function RecipesTab() {
  const [recipes, setRecipes] = useState<RecipeWithMacros[]>([]);
  const [cat, setCat] = useState('All');
  const [open, setOpen] = useState<RecipeWithMacros | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showRecipeForm, setShowRecipeForm] = useState(false);

  const fetchRecipes = useCallback(async () => {
    try {
      const url = searchTerm ? `/api/recipes?search=${encodeURIComponent(searchTerm)}` : '/api/recipes';
      const data = (await apiClient.get(url)) as RecipeWithMacros[];
      setRecipes(data);
    } catch { /* silently fail */ }
  }, [searchTerm]);

  useEffect(() => { fetchRecipes(); }, [fetchRecipes]);

  const handleRecipeCreated = useCallback(async (
    optimistic: Recipe,
    body: { name: string; steps: string; caloriesPerServing: number; ingredients: { name: string; quantity: string; unit: string }[] },
  ) => {
    setRecipes((prev) => [optimistic as RecipeWithMacros, ...prev]);
    setShowRecipeForm(false);
    try {
      await apiClient.post('/api/recipes', { body });
      fetchRecipes();
    } catch { fetchRecipes(); }
  }, [fetchRecipes]);

  const filtered = recipes.filter((r) => {
    if (cat === 'All') return true;
    if (cat === 'Favorites') return r.favorite;
    return r.category === cat;
  });

  const featured = recipes[0] ?? null;

  const p = featured?.protein ?? 0;
  const c = featured?.carbs ?? 0;
  const f = featured?.fat ?? 0;
  const total = p + c + f || 1;

  return (
    <div style={{ display: 'grid', gap: 'var(--gap)' }}>
      {/* Featured recipe */}
      {featured && (
        <section
          className="card arise-in grid-2-col"
          style={{
            padding: 'var(--pad)',
            gap: 26,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 100% at 100% 0%, var(--accent-soft), transparent 55%)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative' }}>
            <span className="eyebrow" style={{ color: 'var(--accent)' }}>★ Featured this week</span>
            <h2 style={{ fontSize: 28, margin: '10px 0 8px', lineHeight: 1.1 }}>{featured.name}</h2>
            <p style={{ color: 'var(--text-3)', fontSize: 14, marginBottom: 18, maxWidth: 380 }}>
              Your most-cooked recipe — a lean, macro-friendly staple that anchors the weekly meal prep.
            </p>
            <div style={{ display: 'flex', gap: 22, marginBottom: 20, flexWrap: 'wrap' }}>
              <Metric label="Calories" value={featured.caloriesPerServing} unit="kcal" />
              <Metric label="Protein" value={featured.protein ?? 0} unit="g" accent="var(--accent)" />
              <Metric label="Time" value={featured.timeMinutes ?? '—'} unit="min" />
              <Metric label="Serves" value={featured.servings ?? '—'} unit="" />
            </div>
            <button className="btn btn-primary" onClick={() => setOpen(featured)}>
              View recipe
            </button>
          </div>
          <div
            style={{
              position: 'relative',
              borderRadius: 'var(--r)',
              overflow: 'hidden',
              minHeight: 220,
              background: 'linear-gradient(135deg, var(--surface-hi), var(--surface-inset))',
              border: '1px solid var(--line-soft)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, padding: 24, width: '100%' }}>
              {(featured.tags ?? [featured.category ?? 'Recipe', 'Balanced']).slice(0, 6).map((tag, i) => (
                <span key={i} className="chip" style={{ justifyContent: 'center', fontSize: 11.5, padding: '8px 6px' }}>{tag}</span>
              ))}
            </div>
            <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16, display: 'flex', gap: 8 }}>
              <div style={{ flex: p / total, height: 6, borderRadius: 99, background: 'var(--accent)' }} />
              <div style={{ flex: c / total, height: 6, borderRadius: 99, background: 'var(--info)' }} />
              <div style={{ flex: f / total, height: 6, borderRadius: 99, background: 'var(--warn)' }} />
            </div>
          </div>
        </section>
      )}

      {/* Filter pills + search */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {CATEGORIES.map((c2) => (
            <button
              key={c2}
              onClick={() => setCat(c2)}
              style={{
                padding: '8px 16px',
                borderRadius: 99,
                border: `1px solid ${cat === c2 ? 'transparent' : 'var(--line-soft)'}`,
                background: cat === c2 ? 'var(--accent)' : 'var(--surface)',
                color: cat === c2 ? 'var(--bg-0)' : 'var(--text-3)',
                fontWeight: 600,
                fontSize: 13,
                transition: 'all .15s',
                cursor: 'pointer',
              }}
            >
              {c2}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              background: 'var(--surface-inset)',
              border: '1px solid var(--line-soft)',
              borderRadius: 'var(--r-sm)',
              color: 'var(--text)',
              padding: '8px 12px',
              fontSize: 13,
              outline: 'none',
            }}
          />
          <button className="btn" onClick={() => setShowRecipeForm((v) => !v)}>
            <Plus size={15} strokeWidth={2.4} />{showRecipeForm ? 'Cancel' : 'New recipe'}
          </button>
        </div>
      </div>
      {showRecipeForm && (
        <div style={{ marginBottom: 'var(--gap)' }}>
          <RecipeForm onCreated={handleRecipeCreated} />
        </div>
      )}

      {/* Recipe grid */}
      <div className="grid-3-col">
        {filtered.map((r) => {
          const rp = r.protein ?? 0;
          const rc = r.carbs ?? 0;
          const rf = r.fat ?? 0;
          const rt = rp + rc + rf || 1;
          const catCol = CAT_COLOR[r.category ?? ''] ?? 'var(--text-3)';
          return (
            <button
              key={r.id}
              onClick={() => setOpen(r)}
              className="card arise-in"
              style={{
                padding: 0,
                textAlign: 'left',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'transform .16s, border-color .16s',
                border: '1px solid var(--line-soft)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.borderColor = 'var(--accent)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.borderColor = 'var(--line-soft)';
              }}
            >
              {/* Header band */}
              <div
                style={{
                  height: 84,
                  background: 'linear-gradient(135deg, var(--surface-hi), var(--surface-inset))',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'flex-end',
                  padding: 14,
                }}
              >
                {r.category && (
                  <span
                    className="chip"
                    style={{ position: 'absolute', top: 12, left: 12, fontSize: 11, color: catCol, borderColor: 'var(--line-soft)' }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: 99, background: catCol }} />
                    {r.category}
                  </span>
                )}
                {r.favorite && (
                  <span style={{ position: 'absolute', top: 12, right: 12, color: 'var(--warn)', fontSize: 15 }}>★</span>
                )}
                <span className="mono" style={{ fontSize: 22, fontWeight: 700 }}>
                  {r.caloriesPerServing}<span style={{ fontSize: 11, color: 'var(--text-faint)', marginLeft: 3 }}>kcal</span>
                </span>
              </div>
              <div style={{ padding: 16 }}>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 10, lineHeight: 1.25, minHeight: 38 }}>{r.name}</div>
                {/* Macro split */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
                  <div style={{ flex: rp / rt, height: 5, borderRadius: 99, background: 'var(--accent)' }} title={`P ${rp}g`} />
                  <div style={{ flex: rc / rt, height: 5, borderRadius: 99, background: 'var(--info)' }} title={`C ${rc}g`} />
                  <div style={{ flex: rf / rt, height: 5, borderRadius: 99, background: 'var(--warn)' }} title={`F ${rf}g`} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-3)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Zap size={12} />{rp}g protein
                  </span>
                  {r.timeMinutes && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Clock size={12} />{r.timeMinutes} min
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-faint)', padding: 40 }}>
            No recipes found. Create one to get started!
          </div>
        )}
      </div>

      {open && <RecipeModal recipe={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
