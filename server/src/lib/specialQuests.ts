// Curated pools of system-offered quests, distinct from the user-authored
// Quest model. Daily quests are picked per-user (so people don't all see
// the same three every day); weekly and monthly are picked once per period
// and shared by everyone, since the point is a common target the whole
// user base is working toward that period.
//
// Selection is deterministic (seeded shuffle, no randomness stored anywhere)
// so "today's 3 daily quests" is reproducible from (userId, date) alone —
// no extra table, no cron job to roll them over at midnight.

export type QuestCategory = 'daily' | 'weekly' | 'monthly';

export interface QuestTemplate {
  id: string;
  category: QuestCategory;
  title: string;
  description: string;
  xpReward: number;
}

export const DAILY_QUEST_POOL: QuestTemplate[] = [
  { id: 'd-log-meals', category: 'daily', title: 'Log every meal today', description: 'Log all meals eaten today in the Diet tab.', xpReward: 15 },
  { id: 'd-hit-protein', category: 'daily', title: 'Hit your protein target', description: "Reach today's protein goal.", xpReward: 15 },
  { id: 'd-workout', category: 'daily', title: 'Complete a workout', description: 'Log a gym session today.', xpReward: 25 },
  { id: 'd-read', category: 'daily', title: 'Read for 20 minutes', description: 'Put in 20 minutes on a book.', xpReward: 10 },
  { id: 'd-practice-skill', category: 'daily', title: 'Practice a skill', description: 'Log an action on any skill.', xpReward: 10 },
  { id: 'd-water', category: 'daily', title: 'Drink enough water', description: 'Stay on top of hydration today.', xpReward: 10 },
  { id: 'd-sleep', category: 'daily', title: 'Get 7+ hours of sleep', description: 'Wake up rested — 7 hours or more.', xpReward: 10 },
  { id: 'd-no-missed-habits', category: 'daily', title: 'Clear every daily habit', description: 'Check off all of your daily habits today.', xpReward: 15 },
];

export const WEEKLY_QUEST_POOL: QuestTemplate[] = [
  { id: 'w-gym-3x', category: 'weekly', title: 'Hit the gym 3 times this week', description: 'Log 3 gym sessions before the week resets.', xpReward: 50 },
  { id: 'w-log-5-days', category: 'weekly', title: 'Log meals 5 days this week', description: 'Log at least one meal on 5 different days.', xpReward: 40 },
  { id: 'w-book-chapter', category: 'weekly', title: 'Finish a book chapter', description: 'Make real progress on whatever you’re reading.', xpReward: 30 },
  { id: 'w-under-target-4x', category: 'weekly', title: 'Stay under your calorie target 4 days', description: 'Land under your daily calorie target on 4 different days.', xpReward: 40 },
  { id: 'w-practice-3x', category: 'weekly', title: 'Practice a skill 3 times', description: 'Log 3 skill actions this week, any skill.', xpReward: 35 },
  { id: 'w-new-pr', category: 'weekly', title: 'Hit a new personal record', description: 'Beat a previous best on any exercise.', xpReward: 50 },
];

export const MONTHLY_QUEST_POOL: QuestTemplate[] = [
  { id: 'm-12-workouts', category: 'monthly', title: 'Complete 12 workouts this month', description: 'Log 12 gym sessions before the month ends.', xpReward: 150 },
  { id: 'm-finish-book', category: 'monthly', title: 'Read a full book', description: 'Finish a book start to finish this month.', xpReward: 120 },
  { id: 'm-milestone', category: 'monthly', title: 'Hit a new body milestone', description: 'A new weight or measurement personal best.', xpReward: 150 },
  { id: 'm-30-day-streak', category: 'monthly', title: 'Keep a 30-day streak alive', description: 'Don’t let your daily streak break all month.', xpReward: 200 },
];

const POOLS: Record<QuestCategory, QuestTemplate[]> = {
  daily: DAILY_QUEST_POOL,
  weekly: WEEKLY_QUEST_POOL,
  monthly: MONTHLY_QUEST_POOL,
};

const PICK_COUNT: Record<QuestCategory, number> = { daily: 3, weekly: 3, monthly: 2 };

const ALL_TEMPLATES: QuestTemplate[] = [...DAILY_QUEST_POOL, ...WEEKLY_QUEST_POOL, ...MONTHLY_QUEST_POOL];

export function findTemplate(templateId: string): QuestTemplate | undefined {
  return ALL_TEMPLATES.find((t) => t.id === templateId);
}

// Small deterministic PRNG (mulberry32) seeded from a string hash (cyrb-ish),
// so the same seed always produces the same shuffle — no persistence needed.
function hashString(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let state = seed;
  return function random() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(seed: string, arr: T[]): T[] {
  const random = mulberry32(hashString(seed));
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

export function getDailyPeriodKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// ISO week (Monday-start, week containing the year's first Thursday is
// week 1) — a standard, unambiguous "which week is this" key.
export function getWeeklyPeriodKey(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

export function getMonthlyPeriodKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function getPeriodKey(category: QuestCategory, date: Date): string {
  if (category === 'daily') return getDailyPeriodKey(date);
  if (category === 'weekly') return getWeeklyPeriodKey(date);
  return getMonthlyPeriodKey(date);
}

/** The active set of templates for a category+period. Daily is per-user; weekly/monthly are shared. */
export function selectActiveTemplates(category: QuestCategory, periodKey: string, userId?: string): QuestTemplate[] {
  const seed = category === 'daily' ? `daily:${userId}:${periodKey}` : `${category}:${periodKey}`;
  return seededShuffle(seed, POOLS[category]).slice(0, PICK_COUNT[category]);
}
