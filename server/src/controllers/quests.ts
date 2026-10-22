import { Request, Response } from 'express';
import { QuestPriority, Recurrence } from '@prisma/client';
import prisma from '../lib/prisma';
import { awardXP, revokeXP, grantSkillXP, revokeSkillXP, getStartOfTodayUTC, Db } from '../services/xp';

const PRIORITIES = new Set(['low', 'medium', 'high']);
const RECURRENCES = new Set(['daily', 'weekly']);
const questInclude = { steps: { orderBy: { sortOrder: 'asc' as const } } };

// ─── Recurring-quest period math (moved from the old Task model) ──────────

function getStartOfWeek(): Date {
  const today = getStartOfTodayUTC();
  const day = today.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  today.setUTCDate(today.getUTCDate() - diff);
  return today;
}

function isCompletedForPeriod(recurrence: Recurrence, lastCompletedAt: Date | null): boolean {
  if (!lastCompletedAt) return false;
  return recurrence === 'daily' ? lastCompletedAt >= getStartOfTodayUTC() : lastCompletedAt >= getStartOfWeek();
}

/** The `completed` a client sees: stored flag for one-time quests, derived for recurring ones. */
function withComputedCompleted<T extends { recurrence: Recurrence | null; lastCompletedAt: Date | null; completed: boolean }>(q: T): T {
  if (!q.recurrence) return q;
  return { ...q, completed: isCompletedForPeriod(q.recurrence, q.lastCompletedAt) };
}

// What to claw back when a completion is undone: exactly what was awarded,
// falling back to the current values for legacy rows completed before
// awardedXP existed.
function awardToRevoke(q: { awardedXP: number | null; awardedSkillId: string | null; xpReward: number; linkedSkillId: string | null }) {
  if (q.awardedXP == null) return { xp: q.xpReward, skillId: q.linkedSkillId };
  return { xp: q.awardedXP, skillId: q.awardedSkillId };
}

async function revokeAward(db: Db, userId: string, q: Parameters<typeof awardToRevoke>[0]): Promise<void> {
  const { xp, skillId } = awardToRevoke(q);
  await revokeXP(userId, xp, db);
  if (skillId) await revokeSkillXP(userId, skillId, xp, db);
}

async function grantAward(db: Db, userId: string, q: { id: string; xpReward: number; linkedSkillId: string | null }): Promise<void> {
  await awardXP(userId, q.xpReward, `quest:${q.id}`, db);
  if (q.linkedSkillId) await grantSkillXP(userId, q.linkedSkillId, q.xpReward, db);
}

const clearedAward = { awardedXP: null, awardedSkillId: null };

// Only called when the caller already knows `value` is present (not
// undefined) — undefined means "field omitted", handled by each call site.
function parseDueDate(value: unknown): { ok: true; date: Date | null } | { ok: false } {
  if (value === null || value === '') return { ok: true, date: null };
  if (typeof value !== 'string') return { ok: false };
  const d = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return { ok: false };
  return { ok: true, date: d };
}

export async function listQuests(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const quests = await prisma.quest.findMany({
      where: { userId },
      include: questInclude,
      orderBy: { createdAt: 'desc' },
    });
    res.json(quests.map(withComputedCompleted));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createQuest(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { title, description, steps, xpReward, priority, dueDate, linkedSkillId, recurrence } = req.body;

    if (!title || typeof title !== 'string' || title.trim() === '') {
      res.status(400).json({ error: 'Title is required' });
      return;
    }
    if (typeof xpReward !== 'number' || xpReward < 0) {
      res.status(400).json({ error: 'xpReward must be a non-negative number' });
      return;
    }

    const isRecurring = recurrence !== undefined && recurrence !== null;
    if (isRecurring && !RECURRENCES.has(recurrence)) {
      res.status(400).json({ error: 'recurrence must be daily or weekly' });
      return;
    }

    // A recurring habit has no checklist — it's a single toggle each period.
    // A one-time quest needs at least one step and a description, same as before.
    let stepList: string[] = [];
    if (isRecurring) {
      if (Array.isArray(steps) && steps.length > 0) {
        res.status(400).json({ error: 'Recurring quests cannot have steps' });
        return;
      }
    } else {
      if (!description || typeof description !== 'string' || description.trim() === '' || !Array.isArray(steps) || steps.length === 0) {
        res.status(400).json({ error: 'Title, description, and at least one step are required' });
        return;
      }
      stepList = steps;
    }

    if (priority !== undefined && !PRIORITIES.has(priority)) {
      res.status(400).json({ error: 'priority must be low, medium, or high' });
      return;
    }

    let parsedDueDate: Date | null = null;
    if (dueDate !== undefined) {
      const parsedDue = parseDueDate(dueDate);
      if (!parsedDue.ok) {
        res.status(400).json({ error: 'dueDate must be a valid date' });
        return;
      }
      parsedDueDate = parsedDue.date;
    }

    if (linkedSkillId) {
      const skill = await prisma.skill.findFirst({ where: { id: linkedSkillId, userId } });
      if (!skill) { res.status(400).json({ error: 'Skill not found' }); return; }
    }

    const quest = await prisma.quest.create({
      data: {
        userId,
        title: title.trim(),
        description: typeof description === 'string' && description.trim() !== '' ? description.trim() : null,
        xpReward,
        priority: (priority as QuestPriority) ?? 'medium',
        dueDate: parsedDueDate,
        linkedSkillId: linkedSkillId || null,
        recurrence: isRecurring ? (recurrence as Recurrence) : null,
        steps: {
          create: stepList.map((desc: string, i: number) => ({
            description: desc,
            sortOrder: i,
          })),
        },
      },
      include: questInclude,
    });

    res.status(201).json(withComputedCompleted(quest));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// PATCH /api/quests/:id — edit title/description/xpReward/priority/dueDate/
// recurrence/linkedSkillId. Completion state is only reset on a recurrence
// switch (allowed only while not completed); use the
// step/reset/complete endpoints for that so XP stays consistent.
export async function updateQuest(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;
    const existing = await prisma.quest.findFirst({ where: { id, userId } });
    if (!existing) { res.status(404).json({ error: 'Quest not found' }); return; }

    const { title, description, xpReward, priority, dueDate, linkedSkillId, recurrence } = req.body;
    const data: Record<string, unknown> = {};

    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim() === '') { res.status(400).json({ error: 'Title cannot be empty' }); return; }
      data.title = title.trim();
    }
    if (description !== undefined) {
      data.description = typeof description === 'string' && description.trim() !== '' ? description.trim() : null;
    }
    if (xpReward !== undefined) {
      if (typeof xpReward !== 'number' || xpReward < 0) { res.status(400).json({ error: 'xpReward must be a non-negative number' }); return; }
      data.xpReward = xpReward;
    }
    if (priority !== undefined) {
      if (!PRIORITIES.has(priority)) { res.status(400).json({ error: 'priority must be low, medium, or high' }); return; }
      data.priority = priority;
    }
    if (dueDate !== undefined) {
      const parsed = parseDueDate(dueDate);
      if (!parsed.ok) { res.status(400).json({ error: 'dueDate must be a valid date' }); return; }
      data.dueDate = parsed.date;
    }
    if (recurrence !== undefined) {
      if (recurrence !== null && !RECURRENCES.has(recurrence)) { res.status(400).json({ error: 'recurrence must be daily or weekly' }); return; }
      const nextRecurrence = (recurrence ?? null) as Recurrence | null;
      if (nextRecurrence !== existing.recurrence) {
        // Switching modes while the quest is completed for the current period
        // would let the other mode's stale field be completed again for a
        // second award (OE-023). Require reopening first, and clear both
        // completion fields so nothing carries over between modes.
        const completedNow = existing.recurrence
          ? isCompletedForPeriod(existing.recurrence, existing.lastCompletedAt)
          : existing.completed;
        if (completedNow) {
          res.status(409).json({ error: 'Reopen the quest before changing its recurrence' });
          return;
        }
        data.completed = false;
        data.lastCompletedAt = null;
      }
      data.recurrence = nextRecurrence;
    }
    if (linkedSkillId !== undefined) {
      if (linkedSkillId) {
        const skill = await prisma.skill.findFirst({ where: { id: linkedSkillId, userId } });
        if (!skill) { res.status(400).json({ error: 'Skill not found' }); return; }
      }
      data.linkedSkillId = linkedSkillId || null;
    }

    const updated = await prisma.quest.update({ where: { id }, data, include: questInclude });
    res.json(withComputedCompleted(updated));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// PATCH /api/quests/:id/steps/:stepId — toggle a single step on a one-time
// quest. Optional body `{ completed }` sets it explicitly; omitted, it flips
// the current value. Whichever direction the LAST step takes, the quest's
// own completed state (and its XP) follows automatically:
//   - every step now complete, quest wasn't      → complete quest, award XP
//   - a step reopened on a quest that was done    → reopen quest, claw back XP
export async function toggleStep(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const questId = req.params.id as string;
    const stepId = req.params.stepId as string;

    const quest = await prisma.quest.findFirst({
      where: { id: questId, userId },
      include: questInclude,
    });
    if (!quest) { res.status(404).json({ error: 'Quest not found' }); return; }

    const step = quest.steps.find((s) => s.id === stepId);
    if (!step) { res.status(404).json({ error: 'Step not found' }); return; }

    const requested = req.body?.completed;
    const nextCompleted = typeof requested === 'boolean' ? requested : !step.completed;

    if (nextCompleted === step.completed) {
      res.json(withComputedCompleted(quest));
      return;
    }

    // Step write, conditional quest flip and XP commit together or not at
    // all, so a failure can't leave the quest completed without XP (OE-102).
    await prisma.$transaction(async (tx) => {
      await tx.questStep.update({ where: { id: stepId }, data: { completed: nextCompleted } });

      // Recompute from the DB rather than the snapshot read above: two
      // concurrent toggles of the last two steps would each see the other as
      // still open, and neither would complete the quest (OE-006).
      const openSteps = await tx.questStep.count({ where: { questId, completed: false } });
      const allDone = openSteps === 0;

      // Flip the quest's state with a conditional write so only the request
      // that actually performs the transition awards/revokes XP.
      if (allDone) {
        const { count } = await tx.quest.updateMany({
          where: { id: questId, completed: false },
          data: { completed: true, awardedXP: quest.xpReward, awardedSkillId: quest.linkedSkillId },
        });
        if (count === 1) await grantAward(tx, userId, quest);
      } else {
        const { count } = await tx.quest.updateMany({
          where: { id: questId, completed: true },
          data: { completed: false, ...clearedAward },
        });
        if (count === 1) await revokeAward(tx, userId, quest);
      }
    });

    const updated = await prisma.quest.findUnique({ where: { id: questId }, include: questInclude });
    res.json(withComputedCompleted(updated!));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// PATCH /api/quests/:id/reset
//   One-time quest → clears every step back to incomplete and reopens it,
//     clawing back XP if it had been awarded. What dragging a card back to
//     "To Do" does.
//   Recurring quest → uncompletes the CURRENT period (clears lastCompletedAt),
//     clawing back XP if this period had been completed. What clicking an
//     already-done habit does.
export async function resetQuest(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;
    const quest = await prisma.quest.findFirst({ where: { id, userId }, include: questInclude });
    if (!quest) { res.status(404).json({ error: 'Quest not found' }); return; }

    if (quest.recurrence) {
      const wasCompleted = isCompletedForPeriod(quest.recurrence, quest.lastCompletedAt);
      if (!wasCompleted) { res.json(withComputedCompleted(quest)); return; }

      // Conditional on the lastCompletedAt we read, so concurrent resets
      // revoke only once (OE-006).
      await prisma.$transaction(async (tx) => {
        const { count } = await tx.quest.updateMany({
          where: { id, lastCompletedAt: quest.lastCompletedAt },
          data: { lastCompletedAt: null, ...clearedAward },
        });
        if (count === 1) await revokeAward(tx, userId, quest);
      });

      const updated = await prisma.quest.findUnique({ where: { id }, include: questInclude });
      res.json(withComputedCompleted(updated!));
      return;
    }

    const nothingToReset = quest.steps.every((s) => !s.completed) && !quest.completed;
    if (nothingToReset) { res.json(quest); return; }

    await prisma.$transaction(async (tx) => {
      await tx.questStep.updateMany({ where: { questId: id }, data: { completed: false } });

      const { count } = await tx.quest.updateMany({
        where: { id, completed: true },
        data: { completed: false, ...clearedAward },
      });
      if (count === 1) await revokeAward(tx, userId, quest);
    });

    const updated = await prisma.quest.findUnique({ where: { id }, include: questInclude });
    res.json(withComputedCompleted(updated!));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteQuest(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;
    const quest = await prisma.quest.findFirst({ where: { id, userId } });
    if (!quest) { res.status(404).json({ error: 'Quest not found' }); return; }
    await prisma.quest.delete({ where: { id } });
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// PATCH /api/quests/:id/complete
//   One-time quest → bulk-completes every step. What dragging a card to
//     "Done" does.
//   Recurring quest → completes the CURRENT period. What clicking an
//     incomplete habit does.
export async function completeQuestAll(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;
    const quest = await prisma.quest.findFirst({
      where: { id, userId },
      include: { steps: true },
    });
    if (!quest) { res.status(404).json({ error: 'Quest not found' }); return; }

    if (quest.recurrence) {
      if (isCompletedForPeriod(quest.recurrence, quest.lastCompletedAt)) {
        res.json(withComputedCompleted(quest));
        return;
      }
      // Conditional on the lastCompletedAt we read, so a double tap awards
      // only once (OE-006).
      await prisma.$transaction(async (tx) => {
        const { count } = await tx.quest.updateMany({
          where: { id, lastCompletedAt: quest.lastCompletedAt },
          data: { lastCompletedAt: new Date(), awardedXP: quest.xpReward, awardedSkillId: quest.linkedSkillId },
        });
        if (count === 1) await grantAward(tx, userId, quest);
      });

      const updated = await prisma.quest.findUnique({ where: { id }, include: questInclude });
      res.json(withComputedCompleted(updated!));
      return;
    }

    if (quest.completed) { res.json(quest); return; }

    await prisma.$transaction(async (tx) => {
      await tx.questStep.updateMany({ where: { questId: id }, data: { completed: true } });
      const { count } = await tx.quest.updateMany({
        where: { id, completed: false },
        data: { completed: true, awardedXP: quest.xpReward, awardedSkillId: quest.linkedSkillId },
      });
      if (count === 1) await grantAward(tx, userId, quest);
    });

    const updated = await prisma.quest.findUnique({ where: { id }, include: questInclude });
    res.json(withComputedCompleted(updated!));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
