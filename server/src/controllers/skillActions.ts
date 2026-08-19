import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { awardXP, grantSkillXP, getStartOfTodayUTC } from '../services/xp';

// Same-day diminishing returns on a skill: the 1st log of the day pays full
// XP, each further one that day pays less. A long cram session still adds
// up to real XP, but spreading the same number of sessions across separate
// days nets more total XP than doing them all in one sitting — the whole
// point being to reward frequency over volume.
const DAILY_MULTIPLIERS = [1, 0.6, 0.4, 0.25];

function multiplierForCount(countSoFarToday: number): number {
  return DAILY_MULTIPLIERS[Math.min(countSoFarToday, DAILY_MULTIPLIERS.length - 1)]!;
}

export async function listSkillActions(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const skillId = req.query.skillId as string | undefined;
    if (!skillId) { res.status(400).json({ error: 'skillId is required' }); return; }

    const actions = await prisma.skillAction.findMany({
      where: { userId, skillId },
      orderBy: { createdAt: 'asc' as const },
    });
    res.json(actions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createSkillAction(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { skillId, name, xpReward } = req.body;

    if (!skillId || typeof skillId !== 'string') { res.status(400).json({ error: 'skillId is required' }); return; }
    if (!name || typeof name !== 'string' || name.trim().length === 0) { res.status(400).json({ error: 'Name is required' }); return; }
    if (typeof xpReward !== 'number' || xpReward <= 0) { res.status(400).json({ error: 'xpReward must be a positive number' }); return; }

    const skill = await prisma.skill.findFirst({ where: { id: skillId, userId } });
    if (!skill) { res.status(400).json({ error: 'Skill not found' }); return; }

    const action = await prisma.skillAction.create({
      data: { userId, skillId, name: name.trim(), xpReward },
    });
    res.status(201).json(action);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateSkillAction(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;
    const { name, xpReward } = req.body;

    const existing = await prisma.skillAction.findFirst({ where: { id, userId } });
    if (!existing) { res.status(404).json({ error: 'Skill action not found' }); return; }

    const data: Record<string, unknown> = {};
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) { res.status(400).json({ error: 'Name cannot be empty' }); return; }
      data.name = name.trim();
    }
    if (xpReward !== undefined) {
      if (typeof xpReward !== 'number' || xpReward <= 0) { res.status(400).json({ error: 'xpReward must be a positive number' }); return; }
      data.xpReward = xpReward;
    }

    const action = await prisma.skillAction.update({ where: { id }, data });
    res.json(action);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteSkillAction(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;
    const existing = await prisma.skillAction.findFirst({ where: { id, userId } });
    if (!existing) { res.status(404).json({ error: 'Skill action not found' }); return; }
    await prisma.skillAction.delete({ where: { id } });
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// POST /api/skill-actions/:id/log — the repeatable "I just did this" button.
// Fixed reward per action (set once when the action was created), always
// routed through awardXP, so — unlike the old manual-XP endpoint — it's
// bounded and it actually moves the user's overall level.
export async function logSkillAction(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;

    const action = await prisma.skillAction.findFirst({ where: { id, userId } });
    if (!action) { res.status(404).json({ error: 'Skill action not found' }); return; }

    const countToday = await prisma.skillActionLog.count({
      where: { skillId: action.skillId, userId, loggedAt: { gte: getStartOfTodayUTC() } },
    });
    const multiplier = multiplierForCount(countToday);
    const xpAwarded = Math.round(action.xpReward * multiplier);

    await prisma.skillActionLog.create({
      data: { skillActionId: action.id, skillId: action.skillId, userId, xpAwarded },
    });
    await grantSkillXP(action.skillId, xpAwarded);
    const xp = await awardXP(userId, xpAwarded, `skill-action:${action.id}`);

    res.json({ xpAwarded, multiplier, countToday: countToday + 1, xp });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
