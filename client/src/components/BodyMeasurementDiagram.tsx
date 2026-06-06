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

// anchorX/Y = where the dot sits on the body edge; side = which way the callout box goes
const MEASURE_POINTS: {
  type: string; label: string; anchorX: number; anchorY: number; side: 'left' | 'right';
}[] = [
  { type: 'chest',  label: 'Chest',  anchorX: 135, anchorY: 132, side: 'right' },
  { type: 'arms',   label: 'Arms',   anchorX: 52,  anchorY: 150, side: 'left'  },
  { type: 'waist',  label: 'Waist',  anchorX: 72,  anchorY: 178, side: 'left'  },
  { type: 'hips',   label: 'Hips',   anchorX: 132, anchorY: 205, side: 'right' },
  { type: 'thighs', label: 'Thighs', anchorX: 72,  anchorY: 262, side: 'left'  },
];

export default function BodyMeasurementDiagram({ measurements }: BodyMeasurementDiagramProps) {
  const latest = getLatest(measurements);
  const hasData = Object.keys(latest).length > 0;

  return (
    <svg viewBox="-95 0 390 400" style={{ width: '100%', maxWidth: 400, display: 'block', margin: '0 auto' }}>
      <defs>
        <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.14" />
          <stop offset="55%" stopColor="var(--accent-2)" stopOpacity="0.08" />
          <stop offset="100%" stopColor="var(--accent-2)" stopOpacity="0.03" />
        </linearGradient>
        <linearGradient id="bodyStroke" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" />
          <stop offset="100%" stopColor="var(--accent-2)" />
        </linearGradient>
        <filter id="dotGlow" x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur stdDeviation="2.4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Centre guide line */}
      <line x1="100" y1="66" x2="100" y2="378" stroke="var(--line-soft)" strokeWidth="0.6" strokeDasharray="2 5" opacity="0.5" />

      {/* ── Head ── */}
      <ellipse cx="100" cy="36" rx="19" ry="23"
        fill="url(#bodyGrad)" stroke="url(#bodyStroke)" strokeWidth="1.6" />

      {/* ── Body (symmetric athletic silhouette) ── */}
      <path
        d="
          M 92 58
          C 92 66, 88 70, 80 73
          C 68 77, 60 86, 56 100
          C 53 110, 51 122, 49 138
          C 47 152, 45 168, 43 182
          C 42 190, 46 192, 50 191
          C 54 190, 56 184, 57 176
          C 59 160, 61 142, 64 126
          C 65 134, 65 146, 65 158
          C 65 172, 67 186, 71 198
          C 67 214, 66 230, 67 248
          C 68 274, 71 308, 74 344
          C 75 356, 77 368, 80 378
          L 92 378
          C 93 366, 94 350, 95 332
          C 96 310, 98 286, 100 268
          C 102 286, 104 310, 105 332
          C 106 350, 107 366, 108 378
          L 120 378
          C 123 368, 125 356, 126 344
          C 129 308, 132 274, 133 248
          C 134 230, 133 214, 129 198
          C 133 186, 135 172, 135 158
          C 135 146, 135 134, 136 126
          C 139 142, 141 160, 143 176
          C 144 184, 146 190, 150 191
          C 154 192, 158 190, 157 182
          C 155 168, 153 152, 151 138
          C 149 122, 147 110, 144 100
          C 140 86, 132 77, 120 73
          C 112 70, 108 66, 108 58
          C 105 61, 95 61, 92 58
          Z
        "
        fill="url(#bodyGrad)"
        stroke="url(#bodyStroke)"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />

      {/* ── Measurement callouts ── */}
      {MEASURE_POINTS.map(({ type, label, anchorX, anchorY, side }) => {
        const data = latest[type];
        const boxW = 78;
        const boxX = side === 'left' ? -92 : 232;
        const lineEnd = side === 'left' ? boxX + boxW : boxX; // edge of box facing body

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
            {/* Connector: body anchor -> box edge */}
            <line
              x1={anchorX} y1={anchorY}
              x2={lineEnd} y2={anchorY}
              stroke="var(--accent)" strokeWidth="0.8" opacity="0.4"
            />
            {/* Glowing dot on body */}
            <circle cx={anchorX} cy={anchorY} r="2.6" fill="var(--bg-0)" />
            <circle cx={anchorX} cy={anchorY} r="3.6" fill="none" stroke="var(--accent)" strokeWidth="1.6" filter="url(#dotGlow)" />

            {/* Callout box */}
            <rect
              x={boxX} y={anchorY - 22}
              width={boxW} height={44} rx="8"
              fill="var(--surface-hi)" stroke="var(--line-soft)" strokeWidth="0.9"
            />
            {/* Label */}
            <text
              x={boxX + boxW / 2} y={anchorY - 7}
              textAnchor="middle" fill="var(--text-3)"
              fontSize="8.5" fontFamily="var(--font-mono)" letterSpacing="0.12em"
            >
              {label.toUpperCase()}
            </text>
            {/* Value / change */}
            {data ? (
              <>
                <text
                  x={boxX + boxW / 2} y={anchorY + 8}
                  textAnchor="middle" fill="var(--text)"
                  fontSize="14" fontFamily="var(--font-mono)" fontWeight="700" letterSpacing="-0.02em"
                >
                  {data.value}
                  <tspan fontSize="8.5" fill="var(--text-faint)" dx="2">cm</tspan>
                </text>
                {changeText && (
                  <text
                    x={boxX + boxW / 2} y={anchorY + 19}
                    textAnchor="middle" fontSize="8.5" fontFamily="var(--font-mono)" fill={changeColor}
                  >
                    {changeText} cm
                  </text>
                )}
              </>
            ) : (
              <text
                x={boxX + boxW / 2} y={anchorY + 8}
                textAnchor="middle" fill="var(--text-faint)"
                fontSize="12" fontFamily="var(--font-mono)"
              >
                —
              </text>
            )}
          </g>
        );
      })}

      {!hasData && (
        <text x="100" y="396" textAnchor="middle" fill="var(--text-faint)" fontSize="11" fontFamily="var(--font-body)">
          Log measurements to see them here
        </text>
      )}
    </svg>
  );
}
