interface SorenessBodyDiagramProps {
  heatmap: Record<string, number>;
}

function getColor(value: number): string {
  if (value > 75) return 'var(--heatmap-100)';
  if (value > 50) return 'var(--heatmap-75)';
  if (value > 25) return 'var(--heatmap-50)';
  if (value > 0) return 'var(--heatmap-25)';
  return 'var(--heatmap-0)';
}

function getLabel(value: number): string {
  if (value > 75) return 'Intense';
  if (value > 50) return 'High';
  if (value > 25) return 'Moderate';
  if (value > 0) return 'Mild';
  return 'None';
}

const ALL_GROUPS = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps',
  'quads', 'hamstrings', 'glutes', 'calves', 'abs', 'forearms',
] as const;

const LABELS: Record<string, string> = {
  chest: 'Chest', back: 'Back', shoulders: 'Shoulders', biceps: 'Biceps',
  triceps: 'Triceps', quads: 'Quads', hamstrings: 'Hamstrings',
  glutes: 'Glutes', calves: 'Calves', abs: 'Abs', forearms: 'Forearms',
};

export default function SorenessBodyDiagram({ heatmap }: SorenessBodyDiagramProps) {
  return (
    <div className="bg-card rounded-lg p-4 border border-border">
      <h3 className="text-text-primary font-semibold mb-3">Muscle Soreness</h3>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {ALL_GROUPS.map((group) => {
          const value = heatmap[group] ?? 0;
          const color = getColor(value);
          const label = getLabel(value);
          return (
            <div
              key={group}
              className="rounded-lg p-2 text-center border border-border transition-colors"
              style={{ backgroundColor: color, opacity: value > 0 ? 0.85 : 0.4 }}
              aria-label={`${LABELS[group]}: ${label} soreness (${Math.round(value)}%)`}
            >
              <p className="text-text-primary text-xs font-medium">{LABELS[group]}</p>
              <p className="text-text-primary text-lg font-bold">{Math.round(value)}</p>
              <p className="text-text-primary text-[10px] opacity-70">{label}</p>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-2 mt-3">
        <span className="text-text-secondary text-xs">None</span>
        <div className="flex gap-0.5">
          <div className="w-5 h-2.5 rounded-sm bg-heatmap-0" />
          <div className="w-5 h-2.5 rounded-sm bg-heatmap-25" />
          <div className="w-5 h-2.5 rounded-sm bg-heatmap-50" />
          <div className="w-5 h-2.5 rounded-sm bg-heatmap-75" />
          <div className="w-5 h-2.5 rounded-sm bg-heatmap-100" />
        </div>
        <span className="text-text-secondary text-xs">Intense</span>
      </div>
    </div>
  );
}
