// Tasks are actually rendered inline in GamificationTab — this file only
// holds the shared type. The component that used to live here was never
// imported or rendered anywhere; only its type was used. Removed as dead
// code rather than kept "just in case".

export interface Task {
  id: string;
  title: string;
  recurrence: 'daily' | 'weekly';
  xpReward: number;
  completedToday: boolean;
  lastCompletedAt: string | null;
  linkedSkillId?: string | null;
}
