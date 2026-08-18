// Quests are actually rendered by QuestCard.tsx inside the GamificationTab
// kanban — this file only exists to hold the shared types. The component
// that used to live here (its own separate kanban implementation, on the
// pre-redesign styling) was never imported or rendered anywhere; only its
// types were used. Removed as dead code rather than kept "just in case".

export interface QuestStep {
  id: string;
  description: string;
  sortOrder: number;
  completed: boolean;
}

export type QuestPriority = 'low' | 'medium' | 'high';
export type QuestRecurrence = 'daily' | 'weekly';

// A Quest is either one-time (recurrence null — permanent completion,
// optionally with steps) or a recurring habit (recurrence set — completion
// resets every period, no steps). This absorbed what used to be a separate
// Task model, so both live behind one type and one set of endpoints.
export interface Quest {
  id: string;
  title: string;
  description: string | null;
  xpReward: number;
  priority: QuestPriority;
  dueDate: string | null;
  linkedSkillId: string | null;
  recurrence: QuestRecurrence | null;
  /** Permanent for one-time quests; "completed for the current period" for recurring ones. */
  completed: boolean;
  steps: QuestStep[];
}
