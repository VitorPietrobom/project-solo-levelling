import { Request, Response } from 'express';
import { QuestPriority } from '@prisma/client';
import prisma from '../lib/prisma';
import { awardXP } from '../services/xp';

const PRIORITIES = new Set(['low', 'medium', 'high']);
const questInclude = { steps: { orderBy: { sortOrder: 'asc' as const } } };

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
    res.json(quests);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createQuest(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { title, description, steps, xpReward, priority, dueDate } = req.body;

    if (!title || !description || !Array.isArray(steps) || steps.length === 0) {
      res.status(400).json({ error: 'Title, description, and at least one step are required' });
      return;
    }

    if (typeof xpReward !== 'number' || xpReward < 0) {
      res.status(400).json({ error: 'xpReward must be a non-negative number' });
      return;
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

    const quest = await prisma.quest.create({
      data: {
        userId,
        title,
        description,
        xpReward,
        priority: (priority as QuestPriority) ?? 'medium',
        dueDate: parsedDueDate,
        steps: {
          create: steps.map((desc: string, i: number) => ({
            description: desc,
            sortOrder: i,
          })),
        },
      },
      include: questInclude,
    });

    res.status(201).json(quest);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// PATCH /api/quests/:id — edit title/description/xpReward/priority/dueDate.
// Completion state is never touched here; use the step/reset/complete
// endpoints for that so XP stays consistent.
export async function updateQuest(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;
    const existing = await prisma.quest.findFirst({ where: { id, userId } });
    if (!existing) { res.status(404).json({ error: 'Quest not found' }); return; }

    const { title, description, xpReward, priority, dueDate } = req.body;
    const data: Record<string, unknown> = {};

    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim() === '') { res.status(400).json({ error: 'Title cannot be empty' }); return; }
      data.title = title.trim();
    }
    if (description !== undefined) {
      if (typeof description !== 'string' || description.trim() === '') { res.status(400).json({ error: 'Description cannot be empty' }); return; }
      data.description = description.trim();
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

    const updated = await prisma.quest.update({ where: { id }, data, include: questInclude });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// PATCH /api/quests/:id/steps/:stepId — toggle a single step. Optional body
// `{ completed }` sets it explicitly; omitted, it flips the current value.
// Whichever direction the LAST step takes, the quest's own completed state
// (and its XP) follows automatically:
//   - every step now complete, quest wasn't      → complete quest, award XP
//   - a step reopened on a quest that was done    → reopen quest, claw back XP
// This replaces the old one-directional version, which 400'd on any attempt
// to re-touch a step — so a checklist could never actually be unchecked.
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
      res.json(quest);
      return;
    }

    await prisma.questStep.update({ where: { id: stepId }, data: { completed: nextCompleted } });

    const nextSteps = quest.steps.map((s) => (s.id === stepId ? nextCompleted : s.completed));
    const allDone = nextSteps.every(Boolean);
    const wasCompleted = quest.completed;

    if (allDone && !wasCompleted) {
      await prisma.quest.update({ where: { id: questId }, data: { completed: true } });
      await awardXP(userId, quest.xpReward, `quest:${questId}`);
    } else if (!allDone && wasCompleted) {
      await prisma.quest.update({ where: { id: questId }, data: { completed: false } });
      await prisma.user.update({ where: { id: userId }, data: { totalXP: { decrement: quest.xpReward } } });
      await prisma.user.updateMany({ where: { id: userId, totalXP: { lt: 0 } }, data: { totalXP: 0 } });
    }

    const updated = await prisma.quest.findUnique({ where: { id: questId }, include: questInclude });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// PATCH /api/quests/:id/reset — clears every step back to incomplete and
// reopens the quest, clawing back its XP if it had been awarded. This is
// what dragging a quest card back to "To Do" does.
export async function resetQuest(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;
    const quest = await prisma.quest.findFirst({ where: { id, userId }, include: questInclude });
    if (!quest) { res.status(404).json({ error: 'Quest not found' }); return; }

    const nothingToReset = quest.steps.every((s) => !s.completed) && !quest.completed;
    if (nothingToReset) { res.json(quest); return; }

    await prisma.questStep.updateMany({ where: { questId: id }, data: { completed: false } });

    if (quest.completed) {
      await prisma.user.update({ where: { id: userId }, data: { totalXP: { decrement: quest.xpReward } } });
      await prisma.user.updateMany({ where: { id: userId, totalXP: { lt: 0 } }, data: { totalXP: 0 } });
    }
    await prisma.quest.update({ where: { id }, data: { completed: false } });

    const updated = await prisma.quest.findUnique({ where: { id }, include: questInclude });
    res.json(updated);
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

// PATCH /api/quests/:id/complete — bulk-complete every step. What dragging a
// quest card to "Done" does.
export async function completeQuestAll(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;
    const quest = await prisma.quest.findFirst({
      where: { id, userId },
      include: { steps: true },
    });
    if (!quest) { res.status(404).json({ error: 'Quest not found' }); return; }
    if (quest.completed) { res.json(quest); return; }

    await prisma.questStep.updateMany({ where: { questId: id }, data: { completed: true } });
    await prisma.quest.update({ where: { id }, data: { completed: true } });
    await awardXP(userId, quest.xpReward, `quest:${id}`);

    const updated = await prisma.quest.findUnique({ where: { id }, include: questInclude });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
