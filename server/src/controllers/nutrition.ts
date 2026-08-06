import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { awardXP } from '../services/xp';

const GOALS = new Set(['cut', 'maintain', 'bulk', 'recomp']);
const ADJUST = new Set(['steady', 'reactive']);
const KCAL_PER_KG = 7700; // energy in 1 kg of body mass
const DAILY_XP = 40;

// Minimum logged/weight data before the energy-balance estimate is trusted.
const MIN_LOGGED_DAYS = 7;
const MIN_SPAN_DAYS = 10;
const CALIBRATION_WINDOW_DAYS = 21; // trailing completed days feeding each week
const MIN_LOGGED_KCAL = 500; // a day below this is "not really logged"

function ymd(d: Date): string { return d.toISOString().slice(0, 10); }
function dateFromStr(dateStr: string): Date { return new Date(`${dateStr}T00:00:00Z`); }
function addDaysStr(dateStr: string, n: number): string {
  const d = dateFromStr(dateStr);
  d.setUTCDate(d.getUTCDate() + n);
  return ymd(d);
}

/**
 * The Monday (UTC) on or before `dateStr`. The target is keyed off this, so it
 * stays identical every day of the week and only moves when a new week starts.
 */
export function weekStartOf(dateStr: string): string {
  const d = dateFromStr(dateStr);
  const dow = d.getUTCDay();            // 0 = Sunday … 6 = Saturday
  const sinceMonday = (dow + 6) % 7;    // Monday → 0, Sunday → 6
  d.setUTCDate(d.getUTCDate() - sinceMonday);
  return ymd(d);
}

/**
 * Energy-balance maintenance estimate from *completed* data:
 *   maintenance = avgIntake − (weightChangeKg * 7700 / spanDays)
 * (losing weight on X kcal means maintenance sits above X by the deficit the
 * loss implies). Pure so it can be unit-tested without a database. Returns null
 * until there's enough logged data to trust it.
 */
export function energyBalanceTdee(
  loggedDayCalories: number[],
  weightSpan: { startKg: number; endKg: number; spanDays: number } | null,
): number | null {
  if (!weightSpan || weightSpan.spanDays < MIN_SPAN_DAYS) return null;
  if (loggedDayCalories.length < MIN_LOGGED_DAYS) return null;

  const avgIntake = loggedDayCalories.reduce((s, c) => s + c, 0) / loggedDayCalories.length;
  const change = weightSpan.endKg - weightSpan.startKg;
  const tdee = avgIntake - (change * KCAL_PER_KG) / weightSpan.spanDays;
  // Sanity clamp to avoid nonsense from sparse/noisy data.
  if (tdee < 1200 || tdee > 5500) return null;
  return Math.round(tdee);
}

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
 * Adaptive TDEE for a whole week. The window is the completed days *before* the
 * week started, so nothing that happens during the week can shift the number —
 * this week's logs feed next week's recalibration. Only distinct days with real
 * food logged count toward the intake average.
 */
async function computeAdaptiveTdee(userId: string, weekStart: string): Promise<number | null> {
  const windowStart = dateFromStr(addDaysStr(weekStart, -CALIBRATION_WINDOW_DAYS));
  const windowEnd = dateFromStr(weekStart); // exclusive: the current week is still in progress

  const [weights, foods] = await Promise.all([
    prisma.weightEntry.findMany({ where: { userId, date: { gte: windowStart, lt: windowEnd } }, orderBy: { date: 'asc' } }),
    prisma.foodEntry.findMany({ where: { userId, date: { gte: windowStart, lt: windowEnd } } }),
  ]);
  if (weights.length < 2) return null;

  const first = weights[0];
  const last = weights[weights.length - 1];
  const spanDays = (last.date.getTime() - first.date.getTime()) / 86400000;

  // Sum intake per DISTINCT logged day, dropping barely-logged days.
  const byDay = new Map<string, number>();
  for (const f of foods) {
    const key = ymd(f.date);
    byDay.set(key, (byDay.get(key) ?? 0) + f.calories);
  }
  const loggedDays = [...byDay.values()].filter((c) => c > MIN_LOGGED_KCAL);

  return energyBalanceTdee(loggedDays, { startKg: first.weight, endKg: last.weight, spanDays });
}

interface DayNutrition {
  date: string;
  weekStart: string;
  weekEnd: string;
  nextRecalibration: string;
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

  // The target is a property of the WEEK, not the day: computed once from the
  // completed weeks before it, then held constant Mon–Sun.
  const weekStart = weekStartOf(dateStr);
  const weekEnd = addDaysStr(weekStart, 6);
  const nextRecalibration = addDaysStr(weekStart, 7);

  // --- TDEE: adaptive (best) > WHOOP burn > static fallback ---
  // WHOOP burn is averaged over the completed week before this one, so it too
  // stays fixed across the current week.
  const whoopWindowStart = addDaysStr(weekStart, -7);
  const dailies = await prisma.whoopDaily.findMany({
    where: { userId, date: { gte: whoopWindowStart, lt: weekStart } },
    orderBy: { date: 'desc' },
  });

  const adaptive = await computeAdaptiveTdee(userId, weekStart);
  let tdee: number;
  let source: 'adaptive' | 'whoop' | 'fallback';

  if (adaptive != null) {
    tdee = adaptive;
    source = 'adaptive';
  } else if (dailies.length > 0) {
    tdee = Math.round(dailies.reduce((s, d) => s + d.calories, 0) / dailies.length);
    source = 'whoop';
  } else {
    tdee = user.calorieGoal;
    source = 'fallback';
  }

  // --- body weight for the protein target, snapshotted at the week start so
  //     the target doesn't shift mid-week when a new weigh-in lands ---
  const weekStartDate = dateFromStr(weekStart);
  const preWeekWeight = await prisma.weightEntry.findFirst({
    where: { userId, date: { lte: weekStartDate } },
    orderBy: { date: 'desc' },
  });
  // Brand-new user with no weigh-in before this week: fall back to their
  // earliest logged weight, then WHOOP, so protein still has a basis.
  const anyWeight = preWeekWeight
    ? null
    : await prisma.weightEntry.findFirst({ where: { userId }, orderBy: { date: 'asc' } });
  const conn = await prisma.whoopConnection.findUnique({ where: { userId } });
  const whoopWeight = (conn?.latest as any)?.body?.weightKg ?? null;
  const weightKg: number | null = preWeekWeight?.weight ?? anyWeight?.weight ?? whoopWeight ?? null;

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

  // --- weekly weight-trend suggestion (anchored to the week so the whole card
  //     is stable Mon–Sun) — looks at the two weeks up to this week's start ---
  let suggestion: string | null = null;
  if (user.nutritionGoal === 'cut' || user.nutritionGoal === 'bulk') {
    const twoWeeksAgo = dateFromStr(addDaysStr(weekStart, -14));
    const weights = await prisma.weightEntry.findMany({ where: { userId, date: { gte: twoWeeksAgo, lt: dateFromStr(nextRecalibration) } }, orderBy: { date: 'asc' } });
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
    weekStart,
    weekEnd,
    nextRecalibration,
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
  const { goal, adjust, calorieDelta, proteinPerKg, fallbackCalories } = req.body ?? {};
  const data: Record<string, unknown> = {};
  if (typeof goal === 'string' && GOALS.has(goal)) data.nutritionGoal = goal;
  if (typeof adjust === 'string' && ADJUST.has(adjust)) data.nutritionAdjust = adjust;
  if (typeof calorieDelta === 'number' && Number.isFinite(calorieDelta)) {
    data.calorieDelta = Math.round(Math.max(-1500, Math.min(1500, calorieDelta)));
  }
  if (typeof proteinPerKg === 'number' && proteinPerKg > 0 && proteinPerKg <= 4) {
    data.proteinPerKg = proteinPerKg;
  }
  if (typeof fallbackCalories === 'number' && Number.isFinite(fallbackCalories)) {
    data.calorieGoal = Math.round(Math.max(1000, Math.min(6000, fallbackCalories)));
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
