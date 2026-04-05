import type { Measurement } from './MeasurementList';

interface BodyMeasurementDiagramProps {
  measurements: Measurement[];
}

function getLatest(measurements: Measurement[]): Record<string, { value: number; change: number | null }> {
  const grouped: Record<string, Measurement[]> = {};
  for (const m of measurements) {
    (grouped[m.type] ??= []).push(m);
  }
  const result: Record<string, { value: number; change: number | null }> = {};
  for (const [type, entries] of Object.entries(grouped)) {
    const sorted = entries.sort((a, b) => a.date.localeCompare(b.date));
    const latest = sorted[sorted.length - 1];
    const prev = sorted.length > 1 ? sorted[sorted.length - 2] : null;
    result[type] = {
      value: latest.value,
      change: prev ? latest.value - prev.value : null,
    };
  }
  return result;
}

const MEASURE_POINTS: { type: string; label: string; bodyY: number; side: 'left' | 'right' }[] = [
  { type: 'arms',   label: 'Arms',   bodyY: 115, side: 'left' },
  { type: 'chest',  label: 'Chest',  bodyY: 145, side: 'right' },
  { type: 'waist',  label: 'Waist',  bodyY: 185, side: 'left' },
  { type: 'hips',   label: 'Hips',   bodyY: 215, side: 'right' },
  { type: 'thighs', label: 'Thighs', bodyY: 265, side: 'left' },
];

export default function BodyMeasurementDiagram({ measurements }: BodyMeasurementDiagramProps) {
  const latest = getLatest(measurements);
  const hasData = Object.keys(latest).length > 0;

  return (
    <div className="bg-card rounded-lg p-4 border border-border">
      <h3 className="text-text-primary font-semibold mb-2">Body Measurements</h3>
      <svg viewBox="-60 0 320 400" className="w-full max-w-[340px] mx-auto">
        {/* Head */}
        <ellipse cx="100" cy="40" rx="22" ry="26" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5" opacity="0.4" />
        {/* Neck */}
        <rect x="90" y="66" width="20" height="14" rx="4" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5" opacity="0.4" />
        {/* Torso */}
        <path d="M 65 80 L 55 80 Q 40 85 38 110 L 38 130 L 42 130 Q 50 115 60 110 L 60 200 Q 62 220 70 230 L 70 310 Q 70 320 75 325 L 80 340 L 88 340 L 88 325 Q 92 310 95 280 L 100 260 L 105 280 Q 108 310 112 325 L 112 340 L 120 340 L 125 325 Q 130 320 130 310 L 130 230 Q 138 220 140 200 L 140 110 Q 150 115 158 130 L 162 130 L 162 110 Q 160 85 145 80 L 135 80 Z"
          fill="none" stroke="var(--text-secondary)" strokeWidth="1.5" opacity="0.4" />
        {/* Left arm */}
        <path d="M 55 80 Q 30 85 22 120 L 18 170 Q 16 180 20 185 L 28 185 Q 32 180 30 170 L 38 130"
          fill="none" stroke="var(--text-secondary)" strokeWidth="1.5" opacity="0.4" />
        {/* Right arm */}
        <path d="M 145 80 Q 170 85 178 120 L 182 170 Q 184 180 180 185 L 172 185 Q 168 180 170 170 L 162 130"
          fill="none" stroke="var(--text-secondary)" strokeWidth="1.5" opacity="0.4" />

        {/* Measurement lines */}
        {MEASURE_POINTS.map(({ type, label, bodyY, side }) => {
          const data = latest[type];
          const bodyX = side === 'left' ? 38 : 162;
          const endX = side === 'left' ? -40 : 240;
          const textX = side === 'left' ? -45 : 245;
          const anchor = side === 'left' ? 'end' : 'start';

          return (
            <g key={type}>
              {/* Horizontal dashed line */}
              <line
                x1={bodyX} y1={bodyY}
                x2={endX} y2={bodyY}
                stroke="var(--accent-primary)" strokeWidth="0.8" strokeDasharray="4 3" opacity="0.5"
              />
              {/* Dot on body */}
              <circle cx={bodyX} cy={bodyY} r="3" fill="var(--accent-primary)" />

              {/* Label */}
              <text x={textX} y={bodyY - 8} textAnchor={anchor} fill="var(--text-secondary)" fontSize="10">
                {label}
              </text>
              {/* Value */}
              {data ? (
                <>
                  <text x={textX} y={bodyY + 5} textAnchor={anchor} fill="var(--text-primary)" fontSize="13" fontWeight="bold">
                    {data.value} cm
                  </text>
                  {data.change !== null && (
                    <text
                      x={textX} y={bodyY + 18} textAnchor={anchor} fontSize="9"
                      fill={data.change < 0 ? 'var(--accent-success)' : data.change > 0 ? 'var(--accent-warning)' : 'var(--text-secondary)'}
                    >
                      {data.change > 0 ? '+' : ''}{data.change.toFixed(1)}
                    </text>
                  )}
                </>
              ) : (
                <text x={textX} y={bodyY + 5} textAnchor={anchor} fill="var(--text-secondary)" fontSize="10" opacity="0.5">
                  —
                </text>
              )}
            </g>
          );
        })}

        {!hasData && (
          <text x="100" y="380" textAnchor="middle" fill="var(--text-secondary)" fontSize="11">
            Log measurements to see them here
          </text>
        )}
      </svg>
    </div>
  );
}
