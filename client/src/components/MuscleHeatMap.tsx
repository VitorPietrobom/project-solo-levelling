interface MuscleHeatMapProps {
  heatmap: Record<string, number>;
}

const MUSCLE_GROUPS = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps',
  'quads', 'hamstrings', 'glutes', 'calves', 'abs', 'forearms',
] as const;

const LABELS: Record<string, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
  abs: 'Abs',
  forearms: 'Forearms',
};

function getSorenessLevel(value: number): { color: string; label: string } {
  if (value > 75) return { color: 'bg-heatmap-100', label: 'Intense' };
  if (value > 50) return { color: 'bg-heatmap-75', label: 'High' };
  if (value > 25) return { color: 'bg-heatmap-50', label: 'Moderate' };
  if (value > 0) return { color: 'bg-heatmap-25', label: 'Mild' };
  return { color: 'bg-heatmap-0', label: 'None' };
}

export default function MuscleHeatMap({ heatmap }: MuscleHeatMapProps) {
  return (
    <div className="bg-card rounded-lg p-4 border border-border">
      <h3 className="text-text-primary font-semibold mb-3">Muscle Soreness</h3>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2" role="list" aria-label="Muscle soreness heat map">
        {MUSCLE_GROUPS.map((mg) => {
          const value = heatmap[mg] ?? 0;
          const { color, label } = getSorenessLevel(value);
          return (
            <div
              key={mg}
              className={`${color} rounded-lg p-3 text-center transition-colors`}
              role="listitem"
              aria-label={`${LABELS[mg]}: ${label} soreness (${Math.round(value)}%)`}
            >
              <p className="text-text-primary text-sm font-medium">{LABELS[mg]}</p>
              <p className="text-text-primary text-xs opacity-80">{label}</p>
              <p className="text-text-primary text-lg font-bold">{Math.round(value)}</p>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-2 mt-3">
        <span className="text-text-secondary text-xs">None</span>
        <div className="flex gap-0.5">
          <div className="w-6 h-3 rounded-sm bg-heatmap-0" />
          <div className="w-6 h-3 rounded-sm bg-heatmap-25" />
          <div className="w-6 h-3 rounded-sm bg-heatmap-50" />
          <div className="w-6 h-3 rounded-sm bg-heatmap-75" />
          <div className="w-6 h-3 rounded-sm bg-heatmap-100" />
        </div>
        <span className="text-text-secondary text-xs">Intense</span>
      </div>
    </div>
  );
}
