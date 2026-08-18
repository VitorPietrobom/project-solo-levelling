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

export interface Quest {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  priority: QuestPriority;
  dueDate: string | null;
  linkedSkillId: string | null;
  completed: boolean;
  steps: QuestStep[];
}
