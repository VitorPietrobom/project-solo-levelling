import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { awardXP, revokeXP } from '../services/xp';
import {
  QuestCategory,
  QuestTemplate,
  findTemplate,
  getPeriodKey,
  selectActiveTemplates,
} from '../lib/specialQuests';

const CATEGORIES: QuestCategory[] = ['daily', 'weekly', 'monthly'];

interface QuestView extends QuestTemplate {
  periodKey: string;
  completed: boolean;
}

// GET /api/special-quests — today's daily picks (per-user), this week's
// shared picks, and this month's shared picks, each with the caller's own
// completion state.
export async function listSpecialQuests(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const now = new Date();

    const active = CATEGORIES.map((category) => {
      const periodKey = getPeriodKey(category, now);
      const templates = selectActiveTemplates(category, periodKey, userId);
      return { category, periodKey, templates };
    });

    const completions = await prisma.specialQuestCompletion.findMany({
      where: {
        userId,
        OR: active.map(({ periodKey, templates }) => ({
          periodKey,
          templateId: { in: templates.map((t) => t.id) },
        })),
      },
    });
    const completedIds = new Set(completions.map((c) => `${c.periodKey}:${c.templateId}`));

    const byCategory: Record<QuestCategory, QuestView[]> = { daily: [], weekly: [], monthly: [] };
    for (const { category, periodKey, templates } of active) {
      byCategory[category] = templates.map((t) => ({
        ...t,
        periodKey,
        completed: completedIds.has(`${periodKey}:${t.id}`),
      }));
    }

    res.json(byCategory);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// PATCH /api/special-quests/:templateId — body { completed: boolean }.
// Toggling on claims the XP for the current period; toggling off (only
// possible within the same period) claws it back. A templateId that isn't
// one of this period's active picks (stale link, catalog changed) 404s.
export async function toggleSpecialQuest(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const templateId = req.params.templateId as string;
    const requested = req.body?.completed;
    if (typeof requested !== 'boolean') {
      res.status(400).json({ error: 'completed must be a boolean' });
      return;
    }

    const template = findTemplate(templateId);
    if (!template) { res.status(404).json({ error: 'Quest not found' }); return; }

    const now = new Date();
    const periodKey = getPeriodKey(template.category, now);
    const active = selectActiveTemplates(template.category, periodKey, userId);
    if (!active.some((t) => t.id === templateId)) {
      res.status(404).json({ error: 'Quest is not active this period' });
      return;
    }

    const existing = await prisma.specialQuestCompletion.findUnique({
      where: { userId_templateId_periodKey: { userId, templateId, periodKey } },
    });

    if (requested && !existing) {
      await prisma.specialQuestCompletion.create({
        data: { userId, templateId, periodKey, xpAwarded: template.xpReward },
      });
      await awardXP(userId, template.xpReward, `special-quest:${templateId}`);
    } else if (!requested && existing) {
      await prisma.specialQuestCompletion.delete({ where: { id: existing.id } });
      await revokeXP(userId, existing.xpAwarded);
    }

    res.json({ ...template, periodKey, completed: requested });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
