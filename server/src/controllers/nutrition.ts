import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { awardXP } from '../services/xp';

const GOALS = new Set(['cut', 'maintain', 'bulk', 'recomp']);
const ADJUST = new Set(['steady', 'reactive']);
const KCAL_PER_KG = 7700; // energy in 1 kg of body mass
const DAILY_XP = 40;

function isoDaysAgo(base: Date, n: number): string {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}
function ymd(d: Date): string { return d.toISOString().slice(0, 10); }

function settingsPayload(user: { nutritionGoal: string; nutritionAdjust: string; calorieDelta: number; proteinPerKg: number; calorieGoal: number }) {
  return {
    goal: user.nutritionGoal,
    adjust: user.nutritionAdjust,
    calorieDelta: user.calorieDelta,
    proteinPerKg: user.proteinPerKg,
    fallbackCalories: user.calorieGoal,
  };
}

/**
 * Adaptive TDEE: the truest maintenance estimate. Over a trailing window we
 * know average intake and the actual weight change, so:
 *   maintenance = avgIntake − (weightChangeKg * 7700 / spanDays)
 * (lose weight on X kcal → maintenance is above X by the deficit implied by
 * the loss). Returns null until there's enough logged data to trust it.
 */
async function computeAdaptiveTdee(userId: string, dateStr: string): Promise<number | null> {
  const windowStart = new Date(`${dateStr}T00:00:00Z`);
  windowStart.setUTCDate(windowStart.getUTCDate() - 21);
  const end = new Date(`${dateStr}T23:59:59Z`);

  const [weights, foods] = await Promise.all([
    prisma.weightEntry.findMany({ where: { userId, date: { gte: windowStart, lte: end } }, orderBy: { date: 'asc' } }),
    prisma.foodEntry.findMany({ where: { userId, date: { gte: windowStart, lte: end } } }),
  ]);
  if (weights.length < 2) return null;

  const first = weights[0];
  const last = weights[weights.length - 1];
  const spanDays = (last.date.getTime() - first.date.getTime()) / 86400000;
  if (spanDays < 10) return null;

  // Average intake across DISTINCT logged days within the same window.
  const byDay = new Map<string, number>();
  for (const f of foods) {
    const key = ymd(f.date);
    byDay.set(key, (byDay.get(key) ?? 0) + f.calories);
  }
  const loggedDays = [...byDay.values()].filter((c) => c > 500); // ignore barely-logged days
  if (loggedDays.length < 7) return null;
  const avgIntake = loggedDays.reduce((s, c) => s + c, 0) / loggedDays.length;

  const weightChangeKg = last.weight - first.weight;
  const adaptive = avgIntake - (weightChangeKg * KCAL_PER_KG) / spanDays;
  // Sanity clamp to avoid nonsense from sparse/noisy data.
  if (adaptive < 1200 || adaptive > 5500) return null;
  return Math.round(adaptive);
}

interface DayNutrition {
  date: string;
  tdee: number;
  source: 'adaptive' | 'whoop' | 'fallback';
  daysOfData: number;
  weightKg: number | null;
  target: { calories: number; protein: number; carbs: number; fat: number };
  intake: { calories: number; protein: number; carbs: number; fat: number; meals: number };
  adherence: { proteinMet: boolean; caloriesOk: boolean; eligible: boolean; claimed: boolean; xp: number };
  suggestion: string | null;
}

async function computeNutrition(userId: string, dateStr: string): Promise<DayNutrition | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  // --- TDEE: adaptive (best) > WHOOP burn > static fallback ---
  const since = isoDaysAgo(new Date(`${dateStr}T00:00:00Z`), 7);
  const dailies = await prisma.whoopDaily.findMany({
    where: { userId, date: { gte: since, lte: dateStr } },
    orderBy: { date: 'desc' },
  });

  const adaptive = await computeAdaptiveTdee(userId, dateStr);
  let tdee: number;
  let source: 'adaptive' | 'whoop' | 'fallback';

  if (adaptive != null) {
    tdee = adaptive;
    source = 'adaptive';
  } else if (dailies.length > 0) {
    if (user.nutritionAdjust === 'reactive') {
      const today = dailies.find((d) => d.date === dateStr);
      const avg = Math.round(dailies.reduce((s, d) => s + d.calories, 0) / dailies.length);
      tdee = today ? today.calories : avg;
    } else {
      tdee = Math.round(dailies.reduce((s, d) => s + d.calories, 0) / dailies.length);
    }
    source = 'whoop';
  } else {
    tdee = user.calorieGoal;
    source = 'fallback';
  }

  // --- current body weight (for protein target) ---
  const latestWeight = await prisma.weightEntry.findFirst({ where: { userId }, orderBy: { date: 'desc' } });
  const conn = await prisma.whoopConnection.findUnique({ where: { userId } });
  const whoopWeight = (conn?.latest as any)?.body?.weightKg ?? null;
  const weightKg: number | null = latestWeight?.weight ?? whoopWeight ?? null;

  // --- target ---
  const calorieTarget = Math.max(1200, Math.round(tdee + user.calorieDelta));
  const proteinG = weightKg ? Math.round(weightKg * user.proteinPerKg) : Math.round((calorieTarget * 0.3) / 4);
  const fatG = Math.round((calorieTarget * 0.25) / 9);
  const carbsG = Math.max(0, Math.round((calorieTarget - proteinG * 4 - fatG * 9) / 4));

  // --- today's intake ---
  const dayStart = new Date(`${dateStr}T00:00:00Z`);
  const dayEnd = new Date(`${dateStr}T23:59:59Z`);
  const todaysFood = await prisma.foodEntry.findMany({ where: { userId, date: { gte: dayStart, lte: dayEnd } } });
  const intake = todaysFood.reduce(
    (a, f) => ({ calories: a.calories + f.calories, protein: a.protein + f.protein, carbs: a.carbs + f.carbs, fat: a.fat + f.fat, meals: a.meals + 1 }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, meals: 0 },
  );

  // --- adherence / XP eligibility ---
  const proteinMet = proteinG > 0 && intake.protein >= proteinG * 0.9;
  const caloriesOk = intake.calories >= 1000 && intake.calories <= calorieTarget * 1.08;
  const claim = await prisma.nutritionXpClaim.findUnique({ where: { userId_date: { userId, date: dateStr } } });
  const eligible = intake.meals > 0 && proteinMet && caloriesOk;

  // --- weekly weight-trend suggestion ---
  let suggestion: string | null = null;
  if (user.nutritionGoal === 'cut' || user.nutritionGoal === 'bulk') {
    const twoWeeksAgo = new Date(`${dateStr}T00:00:00Z`);
    twoWeeksAgo.setUTCDate(twoWeeksAgo.getUTCDate() - 14);
    const weights = await prisma.weightEntry.findMany({ where: { userId, date: { gte: twoWeeksAgo } }, orderBy: { date: 'asc' } });
    if (weights.length >= 2) {
      const f = weights[0], l = weights[weights.length - 1];
      const days = Math.max(1, (l.date.getTime() - f.date.getTime()) / 86400000);
      const perWeek = ((l.weight - f.weight) / days) * 7;
      if (user.nutritionGoal === 'cut') {
        if (perWeek > -0.1) suggestion = `Weight isn't trending down (${perWeek >= 0 ? '+' : ''}${perWeek.toFixed(2)} kg/wk). Consider a larger deficit.`;
        else if (perWeek < -1.0) suggestion = `Losing fast (${perWeek.toFixed(2)} kg/wk) — you may be under-eating. Ease the deficit to protect muscle.`;
        else suggestion = `On track: ${perWeek.toFixed(2)} kg/wk. Keep going.`;
      } else {
        if (perWeek < 0.1) suggestion = `Not gaining (${perWeek >= 0 ? '+' : ''}${perWeek.toFixed(2)} kg/wk). Consider a larger surplus.`;
        else if (perWeek > 0.6) suggestion = `Gaining fast (${perWeek.toFixed(2)} kg/wk) — likely adding fat. Ease the surplus.`;
        else suggestion = `On track: +${perWeek.toFixed(2)} kg/wk.`;
      }
    }
  }

  return {
    date: dateStr,
    tdee,
    source,
    daysOfData: dailies.length,
    weightKg,
    target: { calories: calorieTarget, protein: proteinG, carbs: carbsG, fat: fatG },
    intake,
    adherence: { proteinMet, caloriesOk, eligible, claimed: !!claim, xp: DAILY_XP },
    suggestion,
  };
}

// GET /api/nutrition/settings
export async function getNutritionSettings(req: Request, res: Response): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }
  res.json(settingsPayload(user));
}

// PUT /api/nutrition/settings
export async function updateNutritionSettings(req: Request, res: Response): Promise<void> {
  const { goal, adjust, calorieDelta, proteinPerKg } = req.body ?? {};
  const data: Record<string, unknown> = {};
  if (typeof goal === 'string' && GOALS.has(goal)) data.nutritionGoal = goal;
  if (typeof adjust === 'string' && ADJUST.has(adjust)) data.nutritionAdjust = adjust;
  if (typeof calorieDelta === 'number' && Number.isFinite(calorieDelta)) {
    data.calorieDelta = Math.round(Math.max(-1500, Math.min(1500, calorieDelta)));
  }
  if (typeof proteinPerKg === 'number' && proteinPerKg > 0 && proteinPerKg <= 4) {
    data.proteinPerKg = proteinPerKg;
  }
  const user = await prisma.user.update({ where: { id: req.user!.id }, data });
  res.json(settingsPayload(user));
}

// GET /api/nutrition/target?date=YYYY-MM-DD
export async function getNutritionTarget(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const dateStr = typeof req.query.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)
    ? req.query.date
    : new Date().toISOString().slice(0, 10);
  const result = await computeNutrition(userId, dateStr);
  if (!result) { res.status(404).json({ error: 'User not found' }); return; }
  res.json(result);
}

// POST /api/nutrition/claim  { date }  — award daily nutrition XP once per day.
export async function claimNutritionXp(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const dateStr = typeof req.body?.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.body.date)
    ? req.body.date
    : new Date().toISOString().slice(0, 10);

  const day = await computeNutrition(userId, dateStr);
  if (!day) { res.status(404).json({ error: 'User not found' }); return; }
  if (day.adherence.claimed) { res.json({ awarded: false, alreadyClaimed: true, xp: DAILY_XP }); return; }
  if (!day.adherence.eligible) {
    res.status(400).json({ awarded: false, error: 'Day targets not met yet', adherence: day.adherence });
    return;
  }

  // Idempotent insert guards against double-claims from concurrent requests.
  try {
    await prisma.nutritionXpClaim.create({ data: { userId, date: dateStr, xp: DAILY_XP } });
  } catch {
    res.json({ awarded: false, alreadyClaimed: true, xp: DAILY_XP });
    return;
  }
  const xpResult = await awardXP(userId, DAILY_XP, `nutrition:${dateStr}`);
  res.json({ awarded: true, xp: DAILY_XP, ...xpResult });
}
