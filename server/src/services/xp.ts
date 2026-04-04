import prisma from '../lib/prisma';

export interface XPResult {
  totalXP: number;
  level: number;
  progress: { current: number; required: number; percentage: number };
}

/**
 * Returns the highest level N where 50 * N * (N + 1) <= totalXP.
 * Level 0 means the user hasn't reached level 1 yet.
 */
export function getCurrentLevel(totalXP: number): number {
  if (totalXP < 0) return 0;
  // Solve 50*N*(N+1) <= totalXP  =>  N^2 + N - totalXP/50 <= 0
  // N = floor((-1 + sqrt(1 + 4*totalXP/50)) / 2)
  const n = Math.floor((-1 + Math.sqrt(1 + (4 * totalXP) / 50)) / 2);
  return Math.max(0, n);
}

/**
 * XP required to go from currentLevel to currentLevel + 1.
 * Each level N+1 costs 100 * (N + 1) XP.
 */
export function getXPForNextLevel(currentLevel: number): number {
  return 100 * (currentLevel + 1);
}

/**
 * Returns progress toward the next level: how much XP the user has
 * accumulated past their current level threshold, how much is needed,
 * and the percentage.
 */
export function getProgressToNextLevel(totalXP: number): {
  current: number;
  required: number;
  percentage: number;
} {
  const level = getCurrentLevel(totalXP);
  const xpForCurrentLevel = 50 * level * (level + 1);
  const current = totalXP - xpForCurrentLevel;
  const required = getXPForNextLevel(level);
  const percentage = required > 0 ? Math.min((current / required) * 100, 99.99) : 0;
  return { current, required, percentage };
}

/**
 * Awards XP to a user, persists the new total, and returns the updated
 * level and progress info.
 */
export async function awardXP(
  userId: string,
  amount: number,
  _source: string,
): Promise<XPResult> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { totalXP: { increment: amount } },
  });

  const totalXP = user.totalXP;
  const level = getCurrentLevel(totalXP);
  const progress = getProgressToNextLevel(totalXP);

  return { totalXP, level, progress };
}
