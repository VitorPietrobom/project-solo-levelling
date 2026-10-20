import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';

/** The global client or an interactive-transaction client (OE-102). */
export type Db = Prisma.TransactionClient;

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
 * level and progress info. Also marks today as an active day — the only
 * data the streak stat runs on — so any XP-earning action keeps the streak
 * alive, not just one specific feature.
 */
export async function awardXP(
  userId: string,
  amount: number,
  _source: string,
  db: Db = prisma,
): Promise<XPResult> {
  const today = new Date().toISOString().slice(0, 10);
  // Sequential so it's safe inside an interactive transaction.
  const user = await db.user.update({
    where: { id: userId },
    data: { totalXP: { increment: amount } },
  });
  await db.dailyActivity.upsert({
    where: { userId_date: { userId, date: today } },
    create: { userId, date: today },
    update: {},
  });

  const totalXP = user.totalXP;
  const level = getCurrentLevel(totalXP);
  const progress = getProgressToNextLevel(totalXP);

  return { totalXP, level, progress };
}

/** Undoes an awardXP grant (e.g. un-completing a quest/habit), clamped at 0. */
export async function revokeXP(userId: string, amount: number, db: Db = prisma): Promise<void> {
  await db.user.update({ where: { id: userId }, data: { totalXP: { decrement: amount } } });
  await db.user.updateMany({ where: { id: userId, totalXP: { lt: 0 } }, data: { totalXP: 0 } });
}

/** Grants a skill XP and marks it as practiced right now. */
// Scoped to the owner via updateMany, so a foreign or deleted skill id is a
// silent no-op rather than a cross-user write or a P2025 throw.
export async function grantSkillXP(userId: string, skillId: string, xp: number, db: Db = prisma): Promise<void> {
  await db.skill.updateMany({
    where: { id: skillId, userId },
    data: { totalXP: { increment: xp }, lastActivityAt: new Date() },
  });
}

/** Undoes a skill XP grant (e.g. un-completing a linked quest/habit). */
export async function revokeSkillXP(userId: string, skillId: string, xp: number, db: Db = prisma): Promise<void> {
  await db.skill.updateMany({ where: { id: skillId, userId }, data: { totalXP: { decrement: xp } } });
  await db.skill.updateMany({ where: { id: skillId, userId, totalXP: { lt: 0 } }, data: { totalXP: 0 } });
}

/** Midnight UTC for "today" — the boundary every daily/streak/reminder calc uses. */
export function getStartOfTodayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
