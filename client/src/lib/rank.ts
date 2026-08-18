// Shared hunter rank scale — used for the overall level (GamificationTab)
// and per-skill ranks (SkillsTab), so a "B-Rank" means the same threshold
// everywhere in the app.
const RANKS: { from: number; label: string; color: string }[] = [
  { from: 60, label: 'S-Rank', color: 'var(--warn)' },
  { from: 40, label: 'A-Rank', color: 'var(--bad)' },
  { from: 25, label: 'B-Rank', color: 'var(--accent-2)' },
  { from: 15, label: 'C-Rank', color: 'var(--info)' },
  { from: 7, label: 'D-Rank', color: 'var(--accent)' },
  { from: 0, label: 'E-Rank', color: 'var(--text-3)' },
];

export function rankForLevel(level: number): { label: string; color: string } {
  return RANKS.find((r) => level >= r.from) ?? RANKS[RANKS.length - 1]!;
}
