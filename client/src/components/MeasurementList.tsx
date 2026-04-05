export interface Measurement {
  id: string;
  type: 'chest' | 'waist' | 'hips' | 'arms' | 'thighs';
  value: number;
  date: string;
}

interface MeasurementListProps {
  measurements: Measurement[];
}

const TYPE_LABELS: Record<Measurement['type'], string> = {
  chest: 'Chest',
  waist: 'Waist',
  hips: 'Hips',
  arms: 'Arms',
  thighs: 'Thighs',
};

const MEASUREMENT_TYPES: Measurement['type'][] = ['chest', 'waist', 'hips', 'arms', 'thighs'];

export default function MeasurementList({ measurements }: MeasurementListProps) {
  if (measurements.length === 0) {
    return (
      <p className="text-text-secondary text-sm">
        No measurements yet. Log your first measurement to start tracking.
      </p>
    );
  }

  // Group by type, sorted by date ascending
  const grouped = new Map<Measurement['type'], Measurement[]>();
  for (const m of measurements) {
    const list = grouped.get(m.type) || [];
    list.push(m);
    grouped.set(m.type, list);
  }
  // Sort each group by date
  for (const [, list] of grouped) {
    list.sort((a, b) => a.date.localeCompare(b.date));
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3" role="list" aria-label="Body measurements">
      {MEASUREMENT_TYPES.filter((t) => grouped.has(t)).map((type) => {
        const entries = grouped.get(type)!;
        const latest = entries[entries.length - 1];
        const previous = entries.length > 1 ? entries[entries.length - 2] : null;
        const change = previous ? latest.value - previous.value : null;

        return (
          <div
            key={type}
            className="bg-card rounded-lg p-3 border border-border"
            role="listitem"
          >
            <p className="text-text-secondary text-xs uppercase tracking-wide mb-1">
              {TYPE_LABELS[type]}
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-text-primary">{latest.value}</span>
              <span className="text-text-secondary text-xs">cm</span>
            </div>
            {change !== null && (
              <span
                className={`text-xs font-semibold ${
                  change < 0
                    ? 'text-accent-success'
                    : change > 0
                      ? 'text-accent-warning'
                      : 'text-text-secondary'
                }`}
                aria-label={`${TYPE_LABELS[type]} change: ${change > 0 ? '+' : ''}${change.toFixed(1)} cm`}
              >
                {change > 0 ? '+' : ''}
                {change.toFixed(1)}
              </span>
            )}
            <p className="text-text-secondary text-xs mt-1">
              {new Date(latest.date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </p>
          </div>
        );
      })}
    </div>
  );
}
