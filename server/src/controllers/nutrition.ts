import { Request, Response } from 'express';
import prisma from '../lib/prisma';

const GOALS = new Set(['cut', 'maintain', 'bulk', 'recomp']);
const ADJUST = new Set(['steady', 'reactive']);

function isoDaysAgo(base: Date, n: number): string {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

// GET /api/nutrition/settings
export async function getNutritionSettings(req: Request, res: Response): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }
  res.json({
    goal: user.nutritionGoal,
    adjust: user.nutritionAdjust,
    calorieDelta: user.calorieDelta,
    proteinPerKg: user.proteinPerKg,
    fallbackCalories: user.calorieGoal,
  });
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
  res.json({
    goal: user.nutritionGoal,
    adjust: user.nutritionAdjust,
    calorieDelta: user.calorieDelta,
    proteinPerKg: user.proteinPerKg,
    fallbackCalories: user.calorieGoal,
  });
}

// GET /api/nutrition/target?date=YYYY-MM-DD
export async function getNutritionTarget(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const dateStr = typeof req.query.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)
    ? req.query.date
    : new Date().toISOString().slice(0, 10);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }

  // --- TDEE from WHOOP daily burn ---
  const since = isoDaysAgo(new Date(`${dateStr}T00:00:00Z`), 7);
  const dailies = await prisma.whoopDaily.findMany({
    where: { userId, date: { gte: since, lte: dateStr } },
    orderBy: { date: 'desc' },
  });

  let tdee: number | null = null;
  let source: 'whoop' | 'fallback' = 'fallback';
  const daysOfData = dailies.length;

  if (dailies.length > 0) {
    if (user.nutritionAdjust === 'reactive') {
      const today = dailies.find((d) => d.date === dateStr);
      const avg = Math.round(dailies.reduce((s, d) => s + d.calories, 0) / dailies.length);
      tdee = today ? today.calories : avg;
    } else {
      tdee = Math.round(dailies.reduce((s, d) => s + d.calories, 0) / dailies.length);
    }
    source = 'whoop';
  } else {
    tdee = user.calorieGoal; // static fallback until WHOOP data exists
  }

  // --- current body weight (for protein target) ---
  const latestWeight = await prisma.weightEntry.findFirst({
    where: { userId },
    orderBy: { date: 'desc' },
  });
  const conn = await prisma.whoopConnection.findUnique({ where: { userId } });
  const whoopWeight = (conn?.latest as any)?.body?.weightKg ?? null;
  const weightKg: number | null = latestWeight?.weight ?? whoopWeight ?? null;

  // --- calorie target ---
  const calorieTarget = Math.max(1200, Math.round((tdee ?? 2000) + user.calorieDelta));

  // --- macros: protein from bodyweight, fat 25% of kcal, carbs fill the rest ---
  const proteinG = weightKg ? Math.round(weightKg * user.proteinPerKg) : Math.round((calorieTarget * 0.30) / 4);
  const fatG = Math.round((calorieTarget * 0.25) / 9);
  const carbsG = Math.max(0, Math.round((calorieTarget - proteinG * 4 - fatG * 9) / 4));

  // --- weekly weight-trend suggestion (steady + cut/bulk) ---
  let suggestion: string | null = null;
  if (user.nutritionAdjust === 'steady' && (user.nutritionGoal === 'cut' || user.nutritionGoal === 'bulk')) {
    const twoWeeksAgo = new Date(`${dateStr}T00:00:00Z`);
    twoWeeksAgo.setUTCDate(twoWeeksAgo.getUTCDate() - 14);
    const weights = await prisma.weightEntry.findMany({
      where: { userId, date: { gte: twoWeeksAgo } },
      orderBy: { date: 'asc' },
    });
    if (weights.length >= 2) {
      const first = weights[0];
      const last = weights[weights.length - 1];
      const days = Math.max(1, (last.date.getTime() - first.date.getTime()) / 86400000);
      const perWeek = ((last.weight - first.weight) / days) * 7;
      if (user.nutritionGoal === 'cut') {
        if (perWeek > -0.1) suggestion = `Weight isn't trending down (${perWeek >= 0 ? '+' : ''}${perWeek.toFixed(2)} kg/wk). Consider a larger deficit (e.g. -${Math.abs(user.calorieDelta) + 150} kcal).`;
        else if (perWeek < -1.0) suggestion = `Losing fast (${perWeek.toFixed(2)} kg/wk) — you may be under-eating. Consider a smaller deficit to protect muscle.`;
        else suggestion = `On track: ${perWeek.toFixed(2)} kg/wk. Keep going.`;
      } else {
        if (perWeek < 0.1) suggestion = `Not gaining (${perWeek >= 0 ? '+' : ''}${perWeek.toFixed(2)} kg/wk). Consider a larger surplus.`;
        else if (perWeek > 0.6) suggestion = `Gaining fast (${perWeek.toFixed(2)} kg/wk) — likely adding fat. Consider a smaller surplus.`;
        else suggestion = `On track: +${perWeek.toFixed(2)} kg/wk.`;
      }
    }
  }

  res.json({
    date: dateStr,
    tdee,
    source,
    daysOfData,
    goal: user.nutritionGoal,
    calorieDelta: user.calorieDelta,
    weightKg,
    target: { calories: calorieTarget, protein: proteinG, carbs: carbsG, fat: fatG },
    suggestion,
  });
}
