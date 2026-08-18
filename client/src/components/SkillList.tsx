// Skills are actually rendered inline in GamificationTab (list + RadarChart)
// — this file only holds the shared type. The component that used to live
// here (with its own separate, older radar implementation) was never
// imported or rendered anywhere; only its type was used. Removed as dead
// code rather than kept "just in case".

export interface Skill {
  id: string;
  name: string;
  totalXP: number;
  level: number;
  progress: { current: number; required: number; percentage: number };
}
