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
  { type: 'arms',   label: 'Arms',   bodyY: 118, side: 'left' },
  { type: 'chest',  label: 'Chest',  bodyY: 148, side: 'right' },
  { type: 'waist',  label: 'Waist',  bodyY: 188, side: 'left' },
  { type: 'hips',   label: 'Hips',   bodyY: 218, side: 'right' },
  { type: 'thighs', label: 'Thighs', bodyY: 268, side: 'left' },
];

export default function BodyMeasurementDiagram({ measurements }: BodyMeasurementDiagramProps) {
  const latest = getLatest(measurements);
  const hasData = Object.keys(latest).length > 0;

  return (
    <svg viewBox="-90 0 380 390" style={{ width: '100%', maxWidth: 380, display: 'block', margin: '0 auto' }}>
      <defs>
        {/* Body fill gradient */}
        <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.10" />
          <stop offset="100%" stopColor="var(--accent-2)" stopOpacity="0.06" />
        </linearGradient>
        {/* Glow filter for accent dots */}
        <filter id="dotGlow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ── Body silhouette ── */}

      {/* Head */}
      <ellipse cx="100" cy="35" rx="21" ry="25"
        fill="url(#bodyGrad)" stroke="var(--accent-2)" strokeWidth="1.4" opacity="0.7" />

      {/* Neck */}
      <path d="M 91 59 L 91 74 Q 100 78 109 74 L 109 59"
        fill="url(#bodyGrad)" stroke="var(--accent-2)" strokeWidth="1.4" opacity="0.7" />

      {/* Torso + arms combined outline */}
      <path
        d="
          M 68 78
          Q 50 80 42 100 L 38 120 L 32 175 Q 30 183 34 188 L 44 188 Q 48 183 46 175 L 52 130

          L 62 110
          L 63 200 Q 65 222 74 232
          L 74 315 Q 74 323 78 328 L 82 342 L 90 342 L 90 325
          Q 93 310 96 282 L 100 262
          L 104 282 Q 107 310 110 325 L 110 342 L 118 342 L 122 328
          Q 126 323 126 315 L 126 232
          Q 135 222 137 200 L 138 110
          L 148 130 L 154 175 Q 152 183 156 188 L 166 188 Q 170 183 168 175 L 162 120
          Q 158 100 140 78
          Z
        "
        fill="url(#bodyGrad)"
        stroke="var(--accent-2)"
        strokeWidth="1.4"
        strokeLinejoin="round"
        opacity="0.7"
      />

      {/* ── Measurement callouts ── */}
      {MEASURE_POINTS.map(({ type, label, bodyY, side }) => {
        const data = latest[type];
        const bodyX = side === 'left' ? 45 : 155;
        const lineEnd = side === 'left' ? -30 : 230;
        const boxX = side === 'left' ? -90 : 235;
        const boxWidth = 80;

        const changeColor = !data || data.change === null
          ? 'var(--text-faint)'
          : data.change < 0
            ? 'var(--good)'
            : data.change > 0
              ? 'var(--warn)'
              : 'var(--text-3)';

        const changeText = data?.change !== null && data?.change !== undefined
          ? (data.change > 0 ? `+${data.change.toFixed(1)}` : data.change.toFixed(1))
          : null;

        return (
          <g key={type}>
            {/* Connector line */}
            <line
              x1={bodyX} y1={bodyY}
              x2={lineEnd} y2={bodyY}
              stroke="var(--accent)" strokeWidth="0.7" opacity="0.35"
            />
            {/* Tick at body */}
            <line
              x1={bodyX} y1={bodyY - 5}
              x2={bodyX} y2={bodyY + 5}
              stroke="var(--accent)" strokeWidth="1.2" opacity="0.6"
            />
            {/* Glowing dot */}
            <circle
              cx={bodyX} cy={bodyY} r="3.5"
              fill="var(--accent)" filter="url(#dotGlow)" opacity="0.9"
            />

            {/* Label box background */}
            <rect
              x={boxX} y={bodyY - 22}
              width={boxWidth} height={44}
              rx="7"
              fill="var(--surface-hi)" stroke="var(--line-soft)" strokeWidth="0.8"
              opacity="0.95"
            />

            {/* Label */}
            <text
              x={boxX + boxWidth / 2} y={bodyY - 8}
              textAnchor="middle"
              fill="var(--text-3)"
              fontSize="9"
              fontFamily="var(--font-mono)"
              letterSpacing="0.08em"
            >
              {label.toUpperCase()}
            </text>

            {/* Value */}
            {data ? (
              <>
                <text
                  x={boxX + boxWidth / 2} y={bodyY + 7}
                  textAnchor="middle"
                  fill="var(--text)"
                  fontSize="13"
                  fontFamily="var(--font-mono)"
                  fontWeight="700"
                  letterSpacing="-0.02em"
                >
                  {data.value}
                  <tspan fontSize="9" fill="var(--text-faint)" dx="2">cm</tspan>
                </text>
                {changeText && (
                  <text
                    x={boxX + boxWidth / 2} y={bodyY + 20}
                    textAnchor="middle"
                    fontSize="9"
                    fontFamily="var(--font-mono)"
                    fill={changeColor}
                  >
                    {changeText}
                  </text>
                )}
              </>
            ) : (
              <text
                x={boxX + boxWidth / 2} y={bodyY + 7}
                textAnchor="middle"
                fill="var(--text-faint)"
                fontSize="11"
                fontFamily="var(--font-mono)"
              >
                —
              </text>
            )}
          </g>
        );
      })}

      {!hasData && (
        <text x="100" y="375" textAnchor="middle" fill="var(--text-faint)" fontSize="11" fontFamily="var(--font-body)">
          Log measurements to see them here
        </text>
      )}
    </svg>
  );
}
