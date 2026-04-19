import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { getCurrentLevel } from '../services/xp';

/**
 * Returns the start (Monday 00:00 UTC) and end (Sunday 23:59:59.999 UTC)
 * of the week containing the given date.
 */
function getWeekBounds(date: Date): { start: Date; end: Date } {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? 6 : day - 1; // days since Monday
  const start = new Date(d);
  start.setUTCDate(d.getUTCDate() - diff);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  end.setUTCHours(23, 59, 59, 999);
  return { start, end };
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function getWeeklySummary(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;

    // Determine the week to summarise
    const weekOf = typeof req.query.weekOf === 'string' ? new Date(req.query.weekOf) : new Date();
    if (isNaN(weekOf.getTime())) {
      res.status(400).json({ error: 'Invalid weekOf date' });
      return;
    }

    const { start, end } = getWeekBounds(weekOf);

    // ── Gamification ──────────────────────────────────────────────────────────

    // XP snapshot: compare totalXP now vs XP at start of week
    // We don't store XP history, so we compute XP earned from completed tasks/quests/skills
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { totalXP: true, calorieGoal: true },
    });
    const currentTotalXP = user?.totalXP ?? 0;
    const currentLevel = getCurrentLevel(currentTotalXP);

    // Quests completed this week
    const completedQuests = await prisma.quest.findMany({
      where: {
        userId,
        completed: true,
        updatedAt: { gte: start, lte: end },
      },
      include: { steps: true },
    });

    // Tasks completed this week
    const completedTasks = await prisma.task.findMany({
      where: {
        userId,
        lastCompletedAt: { gte: start, lte: end },
      },
    });

    // XP earned this week from tasks + quests
    const xpFromTasks = completedTasks.reduce((sum, t) => sum + t.xpReward, 0);
    const xpFromQuests = completedQuests.reduce((sum, q) => sum + q.xpReward, 0);
    const xpEarnedThisWeek = xpFromTasks + xpFromQuests;

    // Skills — show all skills with their current level/XP
    const skills = await prisma.skill.findMany({
      where: { userId },
      orderBy: { name: 'asc' as const },
    });

    // ── Body ──────────────────────────────────────────────────────────────────

    // Weight entries this week
    const weightEntries = await prisma.weightEntry.findMany({
      where: { userId, date: { gte: start, lte: end } },
      orderBy: { date: 'asc' as const },
    });

    // Most recent weight entry before this week (for comparison)
    const prevWeightEntry = await prisma.weightEntry.findFirst({
      where: { userId, date: { lt: start } },
      orderBy: { date: 'desc' as const },
    });

    // Measurements logged this week
    const measurements = await prisma.measurement.findMany({
      where: { userId, date: { gte: start, lte: end } },
      orderBy: { date: 'asc' as const },
    });

    // Gym sessions this week
    const gymSessions = await prisma.gymSession.findMany({
      where: { userId, date: { gte: start, lte: end } },
      include: {
        exercises: {
          include: { muscleGroups: true },
        },
      },
      orderBy: { date: 'asc' as const },
    });

    // Collect unique muscle groups trained
    const muscleGroupsSet = new Set<string>();
    for (const session of gymSessions) {
      for (const exercise of session.exercises) {
        for (const mg of exercise.muscleGroups) {
          muscleGroupsSet.add(mg.muscleGroup);
        }
      }
    }

    // ── Diet ──────────────────────────────────────────────────────────────────

    // Food entries this week
    const foodEntries = await prisma.foodEntry.findMany({
      where: { userId, date: { gte: start, lte: end } },
      orderBy: { date: 'asc' as const },
    });

    // Calorie goal (stored on User model)
    const dailyCalorieGoal = user?.calorieGoal ?? null;

    // Group calories by day
    const caloriesByDay: Record<string, number> = {};
    for (const entry of foodEntries) {
      const day = formatDate(entry.date);
      caloriesByDay[day] = (caloriesByDay[day] ?? 0) + entry.calories;
    }
    const daysWithEntries = Object.keys(caloriesByDay);
    const avgDailyCalories =
      daysWithEntries.length > 0
        ? Math.round(daysWithEntries.reduce((sum, d) => sum + caloriesByDay[d], 0) / daysWithEntries.length)
        : 0;

    // Meal prep adherence: days with at least one food entry / 7
    const adherenceDays = daysWithEntries.length;

    // New recipes added this week
    const newRecipes = await prisma.recipe.findMany({
      where: { userId, createdAt: { gte: start, lte: end } },
      select: { name: true },
    });

    // ── Learning ──────────────────────────────────────────────────────────────

    // Documents uploaded this week
    const newDocuments = await prisma.document.findMany({
      where: { userId, uploadedAt: { gte: start, lte: end } },
      select: { title: true, category: true },
    });

    // Distinct categories updated
    const updatedCategories = [...new Set(newDocuments.map((d) => d.category))];

    // Books finished this week
    const finishedBooks = await prisma.book.findMany({
      where: { userId, status: 'finished', finishedAt: { gte: start, lte: end } },
      select: { title: true, author: true },
    });

    // Journal entries this week
    const journalEntries = await prisma.journalEntry.findMany({
      where: { userId, date: { gte: start, lte: end } },
      select: { date: true, tags: true },
    });

    // Lessons learned this week
    const lessonsLearned = await prisma.lessonLearned.findMany({
      where: { userId, date: { gte: start, lte: end } },
      select: { content: true, tags: true },
    });

    // ── Build Markdown ────────────────────────────────────────────────────────

    const lines: string[] = [];

    lines.push(`# Weekly Summary — ${formatDate(start)} to ${formatDate(end)}`);
    lines.push('');

    // Gamification section
    lines.push('## 🎮 Gamification');
    lines.push('');
    lines.push(`- **Current Level:** ${currentLevel} (${currentTotalXP} total XP)`);
    lines.push(`- **XP Earned This Week:** ${xpEarnedThisWeek} XP`);
    lines.push(`  - From tasks: ${xpFromTasks} XP`);
    lines.push(`  - From quests: ${xpFromQuests} XP`);
    lines.push('');

    if (completedQuests.length > 0) {
      lines.push(`**Quests Completed (${completedQuests.length}):**`);
      for (const q of completedQuests) {
        lines.push(`- ${q.title} (+${q.xpReward} XP)`);
      }
      lines.push('');
    } else {
      lines.push('**Quests Completed:** None');
      lines.push('');
    }

    const dailyTasksDone = completedTasks.filter((t) => t.recurrence === 'daily');
    const weeklyTasksDone = completedTasks.filter((t) => t.recurrence === 'weekly');
    lines.push(`**Tasks Completed:** ${completedTasks.length} total (${dailyTasksDone.length} daily, ${weeklyTasksDone.length} weekly)`);
    lines.push('');

    if (skills.length > 0) {
      lines.push('**Skill Progress:**');
      for (const skill of skills) {
        const level = getCurrentLevel(skill.totalXP);
        lines.push(`- ${skill.name}: Level ${level} (${skill.totalXP} XP)`);
      }
      lines.push('');
    }

    // Body section
    lines.push('## 💪 Body');
    lines.push('');

    if (weightEntries.length > 0) {
      const latestWeight = weightEntries[weightEntries.length - 1];
      const firstWeight = weightEntries[0];
      const weightChange =
        prevWeightEntry
          ? (latestWeight.weight - prevWeightEntry.weight).toFixed(1)
          : weightEntries.length > 1
          ? (latestWeight.weight - firstWeight.weight).toFixed(1)
          : null;
      lines.push(`**Weight:** ${weightEntries.length} entr${weightEntries.length === 1 ? 'y' : 'ies'} logged`);
      lines.push(`- Latest: ${latestWeight.weight} kg (${formatDate(latestWeight.date)})`);
      if (weightChange !== null) {
        const sign = parseFloat(weightChange) >= 0 ? '+' : '';
        lines.push(`- Change: ${sign}${weightChange} kg`);
      }
    } else {
      lines.push('**Weight:** No entries this week');
    }
    lines.push('');

    if (measurements.length > 0) {
      lines.push(`**Measurements Logged (${measurements.length}):**`);
      for (const m of measurements) {
        lines.push(`- ${m.type}: ${m.value} cm (${formatDate(m.date)})`);
      }
    } else {
      lines.push('**Measurements:** None logged this week');
    }
    lines.push('');

    if (gymSessions.length > 0) {
      lines.push(`**Gym Sessions (${gymSessions.length}):**`);
      for (const session of gymSessions) {
        const exerciseNames = session.exercises.map((e) => e.name).join(', ');
        lines.push(`- ${formatDate(session.date)}: ${session.exercises.length} exercise${session.exercises.length === 1 ? '' : 's'}${exerciseNames ? ` (${exerciseNames})` : ''}`);
      }
      if (muscleGroupsSet.size > 0) {
        lines.push(`- Muscle groups trained: ${[...muscleGroupsSet].join(', ')}`);
      }
    } else {
      lines.push('**Gym Sessions:** None this week');
    }
    lines.push('');

    // Diet section
    lines.push('## 🥗 Diet');
    lines.push('');

    if (daysWithEntries.length > 0) {
      lines.push(`**Average Daily Calories:** ${avgDailyCalories} kcal`);
      if (dailyCalorieGoal) {
        const diff = avgDailyCalories - dailyCalorieGoal;
        const sign = diff >= 0 ? '+' : '';
        lines.push(`- Goal: ${dailyCalorieGoal} kcal/day (avg ${sign}${diff} kcal vs goal)`);
      }
      lines.push(`**Meal Tracking Adherence:** ${adherenceDays}/7 days logged`);
    } else {
      lines.push('**Calories:** No food entries this week');
    }
    lines.push('');

    if (newRecipes.length > 0) {
      lines.push(`**New Recipes Added (${newRecipes.length}):**`);
      for (const r of newRecipes) {
        lines.push(`- ${r.name}`);
      }
    } else {
      lines.push('**New Recipes:** None added this week');
    }
    lines.push('');

    // Learning section
    lines.push('## 📚 Learning');
    lines.push('');

    if (finishedBooks.length > 0) {
      lines.push(`**Books Finished (${finishedBooks.length}):**`);
      for (const b of finishedBooks) {
        lines.push(`- *${b.title}* by ${b.author}`);
      }
      lines.push('');
    }

    if (journalEntries.length > 0) {
      lines.push(`**Journal Entries:** ${journalEntries.length} written`);
      const allTags = journalEntries.flatMap((e) => e.tags);
      const uniqueTags = [...new Set(allTags)];
      if (uniqueTags.length > 0) {
        lines.push(`- Tags: ${uniqueTags.join(', ')}`);
      }
      lines.push('');
    }

    if (lessonsLearned.length > 0) {
      lines.push(`**Lessons Learned (${lessonsLearned.length}):**`);
      for (const l of lessonsLearned) {
        const preview = l.content.length > 80 ? l.content.slice(0, 80) + '…' : l.content;
        lines.push(`- ${preview}`);
      }
      lines.push('');
    }

    if (newDocuments.length > 0) {
      lines.push(`**Documents Uploaded (${newDocuments.length}):**`);
      for (const d of newDocuments) {
        lines.push(`- ${d.title} [${d.category}]`);
      }
      if (updatedCategories.length > 0) {
        lines.push(`- Categories updated: ${updatedCategories.join(', ')}`);
      }
    } else {
      lines.push('**Documents:** None uploaded this week');
    }
    lines.push('');

    const markdown = lines.join('\n');

    res.json({ markdown, weekStart: formatDate(start), weekEnd: formatDate(end) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
