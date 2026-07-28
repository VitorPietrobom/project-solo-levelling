import { Request, Response } from 'express';
import prisma from '../lib/prisma';

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// GET /api/export — full personal data dump for offline analysis.
export async function exportData(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;

  const [user, foodEntries, whoopDaily, weightEntries, measurements] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.foodEntry.findMany({ where: { userId }, orderBy: { date: 'asc' } }),
    prisma.whoopDaily.findMany({ where: { userId }, orderBy: { date: 'asc' } }),
    prisma.weightEntry.findMany({ where: { userId }, orderBy: { date: 'asc' } }),
    prisma.measurement.findMany({ where: { userId }, orderBy: { date: 'asc' } }),
  ]);

  // Merge everything into one row per calendar day.
  type Day = {
    date: string;
    intakeCalories: number; protein: number; carbs: number; fat: number; meals: number;
    burnedCalories: number | null; strain: number | null;
    weightKg: number | null;
    net: number | null; // intake − burned
  };
  const days = new Map<string, Day>();
  const get = (date: string): Day => {
    let d = days.get(date);
    if (!d) {
      d = { date, intakeCalories: 0, protein: 0, carbs: 0, fat: 0, meals: 0, burnedCalories: null, strain: null, weightKg: null, net: null };
      days.set(date, d);
    }
    return d;
  };

  for (const f of foodEntries) {
    const d = get(ymd(f.date));
    d.intakeCalories += f.calories;
    d.protein += f.protein;
    d.carbs += f.carbs;
    d.fat += f.fat;
    d.meals += 1;
  }
  for (const w of whoopDaily) {
    const d = get(w.date);
    d.burnedCalories = w.calories;
    d.strain = w.strain ?? null;
  }
  for (const w of weightEntries) {
    get(ymd(w.date)).weightKg = w.weight;
  }
  for (const d of days.values()) {
    d.protein = Math.round(d.protein * 10) / 10;
    d.carbs = Math.round(d.carbs * 10) / 10;
    d.fat = Math.round(d.fat * 10) / 10;
    if (d.burnedCalories != null) d.net = d.intakeCalories - d.burnedCalories;
  }

  const daily = Array.from(days.values()).sort((a, b) => a.date.localeCompare(b.date));

  res.json({
    generatedAt: new Date().toISOString(),
    account: { email: user?.email ?? null },
    nutritionSettings: user ? {
      goal: user.nutritionGoal, adjust: user.nutritionAdjust,
      calorieDelta: user.calorieDelta, proteinPerKg: user.proteinPerKg,
    } : null,
    daily,
    raw: {
      foodEntries: foodEntries.map((f) => ({
        date: ymd(f.date), foodName: f.foodName, calories: f.calories,
        protein: f.protein, carbs: f.carbs, fat: f.fat, mealType: f.mealType,
      })),
      whoopDaily: whoopDaily.map((w) => ({ date: w.date, burnedCalories: w.calories, strain: w.strain })),
      weightEntries: weightEntries.map((w) => ({ date: ymd(w.date), weightKg: w.weight })),
      measurements: measurements.map((m) => ({ date: ymd(m.date), type: m.type, value: m.value })),
    },
  });
}
