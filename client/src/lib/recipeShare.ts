import type { Recipe } from '../components/RecipeList';

interface ShareRecipe extends Recipe {
  protein?: number; carbs?: number; fat?: number; servings?: number; timeMinutes?: number;
}

// Brand palette (sRGB approximations of the app's oklch tokens).
const C = {
  bg0: '#12121c',
  bg1: '#1b1b28',
  surface: '#242433',
  line: 'rgba(150,150,180,0.18)',
  text: '#f4f4f7',
  text2: '#c3c6cf',
  text3: '#8b8fa0',
  accent: '#5fd1c5',
  accent2: '#9b7ae6',
  info: '#7fb3f5',
  warn: '#e0c25a',
};

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function renderRecipePng(recipe: ShareRecipe): Promise<Blob> {
  // Make sure web fonts are ready so canvas uses them.
  try { await (document as unknown as { fonts?: { ready: Promise<unknown> } }).fonts?.ready; } catch { /* ignore */ }

  const W = 1080;
  const H = 1350;
  const scale = 2; // crisp
  const canvas = document.createElement('canvas');
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);

  // Background gradient + accent glows
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, C.bg1);
  bg.addColorStop(1, C.bg0);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W, 0, 0, W, 0, 720);
  glow.addColorStop(0, 'rgba(155,122,230,0.22)');
  glow.addColorStop(1, 'rgba(155,122,230,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  const glow2 = ctx.createRadialGradient(0, H, 0, 0, H, 640);
  glow2.addColorStop(0, 'rgba(95,209,197,0.16)');
  glow2.addColorStop(1, 'rgba(95,209,197,0)');
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, W, H);

  const PAD = 84;
  const contentW = W - PAD * 2;
  let y = 96;

  // Brand eyebrow with lightning glyph
  ctx.fillStyle = C.accent;
  ctx.font = "700 22px 'JetBrains Mono', monospace";
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('⚡ PROJECT ARISE', PAD, y);
  y += 58;

  // Title
  ctx.fillStyle = C.text;
  ctx.font = "700 76px 'Space Grotesk', sans-serif";
  const titleLines = wrap(ctx, recipe.name, contentW).slice(0, 3);
  for (const line of titleLines) { ctx.fillText(line, PAD, y + 60); y += 84; }
  y += 24;

  // Meta pills
  const pills: string[] = [`${recipe.caloriesPerServing || 0} kcal`];
  if (recipe.servings) pills.push(`Serves ${recipe.servings}`);
  if (recipe.timeMinutes) pills.push(`${recipe.timeMinutes} min`);
  let px = PAD;
  ctx.font = "600 28px 'Manrope', sans-serif";
  for (const p of pills) {
    const w = ctx.measureText(p).width + 44;
    ctx.fillStyle = C.surface;
    roundRect(ctx, px, y, w, 56, 28); ctx.fill();
    ctx.strokeStyle = C.line; ctx.lineWidth = 1.5; roundRect(ctx, px, y, w, 56, 28); ctx.stroke();
    ctx.fillStyle = C.text2;
    ctx.fillText(p, px + 22, y + 38);
    px += w + 16;
  }
  y += 104;

  // Macros row
  const macros: [string, number, string][] = [
    ['PROTEIN', recipe.protein ?? 0, C.accent],
    ['CARBS', recipe.carbs ?? 0, C.info],
    ['FAT', recipe.fat ?? 0, C.warn],
  ];
  const colW = contentW / 3;
  macros.forEach(([label, val, color], i) => {
    const cx = PAD + colW * i;
    ctx.fillStyle = C.text3;
    ctx.font = "700 22px 'JetBrains Mono', monospace";
    ctx.fillText(label, cx, y);
    ctx.fillStyle = C.text;
    ctx.font = "700 52px 'JetBrains Mono', monospace";
    ctx.fillText(`${val}g`, cx, y + 52);
    ctx.fillStyle = color;
    roundRect(ctx, cx, y + 68, colW - 28, 6, 3); ctx.fill();
  });
  y += 128;

  // Divider
  ctx.strokeStyle = C.line; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();
  y += 52;

  // Two columns: ingredients | steps
  const colGap = 56;
  const halfW = (contentW - colGap) / 2;
  const startY = y;

  // Ingredients
  ctx.fillStyle = C.accent;
  ctx.font = "700 26px 'JetBrains Mono', monospace";
  ctx.fillText('INGREDIENTS', PAD, y);
  let iy = y + 46;
  ctx.font = "500 27px 'Manrope', sans-serif";
  const maxItems = 12;
  for (const ing of (recipe.ingredients || []).slice(0, maxItems)) {
    const text = `${ing.quantity ? ing.quantity + ' ' : ''}${ing.unit ? ing.unit + ' ' : ''}${ing.name}`.trim();
    const lines = wrap(ctx, text, halfW - 26);
    ctx.fillStyle = C.accent2;
    ctx.fillText('•', PAD, iy);
    ctx.fillStyle = C.text2;
    for (const l of lines) { ctx.fillText(l, PAD + 26, iy); iy += 38; }
    iy += 6;
    if (iy > H - 200) break;
  }
  if ((recipe.ingredients || []).length > maxItems) {
    ctx.fillStyle = C.text3;
    ctx.fillText(`+${recipe.ingredients.length - maxItems} more`, PAD + 26, iy);
  }

  // Steps
  const sx = PAD + halfW + colGap;
  ctx.fillStyle = C.accent;
  ctx.font = "700 26px 'JetBrains Mono', monospace";
  ctx.fillText('STEPS', sx, startY);
  let sy = startY + 46;
  const steps = (recipe.steps || '').split('\n').map((s) => s.trim()).filter(Boolean);
  ctx.font = "500 26px 'Manrope', sans-serif";
  let n = 1;
  for (const step of steps) {
    const clean = step.replace(/^\d+[.)]\s*/, '');
    const lines = wrap(ctx, clean, halfW - 44);
    ctx.fillStyle = C.accent;
    ctx.font = "700 24px 'JetBrains Mono', monospace";
    ctx.fillText(`${n}`, sx, sy);
    ctx.font = "500 26px 'Manrope', sans-serif";
    ctx.fillStyle = C.text2;
    for (const l of lines) { ctx.fillText(l, sx + 40, sy); sy += 36; }
    sy += 10;
    n += 1;
    if (sy > H - 200) { ctx.fillStyle = C.text3; ctx.fillText('…', sx + 40, sy); break; }
  }

  // Footer
  ctx.fillStyle = C.text3;
  ctx.font = "600 26px 'Manrope', sans-serif";
  ctx.fillText('Made with Project Arise', PAD, H - 64);
  ctx.textAlign = 'right';
  ctx.fillStyle = C.accent;
  ctx.fillText('project-arise-sand.vercel.app', W - PAD, H - 64);
  ctx.textAlign = 'left';

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png');
  });
}

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'recipe';
}

/** Share the recipe as a PNG via the native share sheet, or download it. */
export async function shareRecipe(recipe: ShareRecipe): Promise<'shared' | 'downloaded'> {
  const blob = await renderRecipePng(recipe);
  const file = new File([blob], `${slug(recipe.name)}.png`, { type: 'image/png' });

  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare && nav.canShare({ files: [file] })) {
    await nav.share({ files: [file], title: recipe.name, text: `${recipe.name} — from Project Arise` });
    return 'shared';
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return 'downloaded';
}
