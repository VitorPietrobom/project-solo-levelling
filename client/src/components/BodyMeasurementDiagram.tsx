import { useState, useMemo } from 'react';
import type { Measurement } from './MeasurementList';

interface BodyMeasurementDiagramProps {
  measurements: Measurement[];
}

type MType = Measurement['type'];

const TYPES: MType[] = ['chest', 'arms', 'waist', 'hips', 'thighs'];
const LABEL: Record<MType, string> = { chest: 'Chest', arms: 'Arms', waist: 'Waist', hips: 'Hips', thighs: 'Thighs' };

// Where each dot sits on the silhouette (viewBox 0 0 200 400).
const ANCHOR: Record<MType, { x: number; y: number }> = {
  chest: { x: 100, y: 118 },
  arms: { x: 56, y: 150 },
  waist: { x: 100, y: 176 },
  hips: { x: 100, y: 206 },
  thighs: { x: 82, y: 258 },
};

const BODY_PATH = `
  M 92 58 C 92 66, 88 70, 80 73 C 68 77, 60 86, 56 100 C 53 110, 51 122, 49 138
  C 47 152, 45 168, 43 182 C 42 190, 46 192, 50 191 C 54 190, 56 184, 57 176
  C 59 160, 61 142, 64 126 C 65 134, 65 146, 65 158 C 65 172, 67 186, 71 198
  C 67 214, 66 230, 67 248 C 68 274, 71 308, 74 344 C 75 356, 77 368, 80 378
  L 92 378 C 93 366, 94 350, 95 332 C 96 310, 98 286, 100 268
  C 102 286, 104 310, 105 332 C 106 350, 107 366, 108 378 L 120 378
  C 123 368, 125 356, 126 344 C 129 308, 132 274, 133 248 C 134 230, 133 214, 129 198
  C 133 186, 135 172, 135 158 C 135 146, 135 134, 136 126 C 139 142, 141 160, 143 176
  C 144 184, 146 190, 150 191 C 154 192, 158 190, 157 182 C 155 168, 153 152, 151 138
  C 149 122, 147 110, 144 100 C 140 86, 132 77, 120 73 C 112 70, 108 66, 108 58
  C 105 61, 95 61, 92 58 Z`;

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const W = 260;
  const H = 56;
  const PAD = 6;
  if (values.length < 2) {
    return <div style={{ height: H, display: 'flex', alignItems: 'center', color: 'var(--text-faint)', fontSize: 12 }}>Log again to see a trend</div>;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = (W - PAD * 2) / (values.length - 1);
  const pts = values.map((v, i) => [PAD + i * stepX, PAD + (H - PAD * 2) * (1 - (v - min) / range)]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const area = `${line} L ${pts[pts.length - 1][0].toFixed(1)} ${H} L ${pts[0][0].toFixed(1)} ${H} Z`;
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H, display: 'block' }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#sparkFill)" />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={last[0]} cy={last[1]} r="3.2" fill={color} />
    </svg>
  );
}

export default function BodyMeasurementDiagram({ measurements }: BodyMeasurementDiagramProps) {
  // Group by type → chronological series.
  const series = useMemo(() => {
    const m = new Map<MType, Measurement[]>();
    for (const x of measurements) {
      const arr = m.get(x.type) ?? [];
      arr.push(x);
      m.set(x.type, arr);
    }
    for (const arr of m.values()) arr.sort((a, b) => a.date.localeCompare(b.date));
    return m;
  }, [measurements]);

  const firstWithData = TYPES.find((t) => series.has(t));
  const [selected, setSelected] = useState<MType>(firstWithData ?? 'waist');

  const sel = series.get(selected) ?? [];
  const latest = sel[sel.length - 1] ?? null;
  const prev = sel.length > 1 ? sel[sel.length - 2] : null;
  const change = latest && prev ? latest.value - prev.value : null;
  const overall = latest && sel.length > 1 ? latest.value - sel[0].value : null;

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* Figure */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <svg viewBox="0 0 200 400" style={{ width: '100%', maxWidth: 200 }}>
          <defs>
            <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.12" />
              <stop offset="100%" stopColor="var(--accent-2)" stopOpacity="0.04" />
            </linearGradient>
            <linearGradient id="bodyStroke" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" />
              <stop offset="100%" stopColor="var(--accent-2)" />
            </linearGradient>
            <filter id="dotGlow" x="-150%" y="-150%" width="400%" height="400%">
              <feGaussianBlur stdDeviation="2.6" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          <ellipse cx="100" cy="36" rx="19" ry="23" fill="url(#bodyGrad)" stroke="url(#bodyStroke)" strokeWidth="1.5" opacity="0.85" />
          <path d={BODY_PATH} fill="url(#bodyGrad)" stroke="url(#bodyStroke)" strokeWidth="1.5" strokeLinejoin="round" opacity="0.85" />

          {TYPES.map((t) => {
            const a = ANCHOR[t];
            const has = series.has(t);
            const isSel = t === selected;
            const val = has ? series.get(t)![series.get(t)!.length - 1].value : null;
            return (
              <g key={t} style={{ cursor: 'pointer' }} onClick={() => setSelected(t)}>
                {/* larger invisible hit area */}
                <circle cx={a.x} cy={a.y} r="16" fill="transparent" />
                {isSel && <circle cx={a.x} cy={a.y} r="8" fill="none" stroke="var(--accent)" strokeWidth="1.5" opacity="0.5" />}
                <circle
                  cx={a.x} cy={a.y} r={isSel ? 5 : 4}
                  fill={isSel ? 'var(--accent)' : has ? 'var(--accent-2)' : 'var(--surface-hi)'}
                  stroke={isSel ? 'var(--accent)' : 'var(--line)'} strokeWidth="1.5"
                  filter={isSel ? 'url(#dotGlow)' : undefined}
                />
                {val != null && (
                  <text
                    x={a.x} y={a.y - 11} textAnchor="middle"
                    fontSize="9" fontFamily="var(--font-mono)"
                    fill={isSel ? 'var(--text)' : 'var(--text-3)'} fontWeight={isSel ? 700 : 500}
                  >{val}</text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Selected detail */}
      <div style={{ background: 'var(--surface-inset)', borderRadius: 'var(--r)', padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
          <span className="eyebrow">{LABEL[selected]}</span>
          {overall != null && (
            <span className="mono" style={{ fontSize: 11, color: 'var(--text-faint)' }}>
              {overall > 0 ? '+' : ''}{overall.toFixed(1)} cm all-time
            </span>
          )}
        </div>
        {latest ? (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
              <span className="mono" style={{ fontSize: 32, fontWeight: 700, lineHeight: 1 }}>{latest.value}</span>
              <span style={{ fontSize: 13, color: 'var(--text-faint)' }}>cm</span>
              {change != null && (
                <span className="mono" style={{ fontSize: 13, color: change === 0 ? 'var(--text-3)' : change < 0 ? 'var(--good)' : 'var(--accent-2)' }}>
                  {change < 0 ? '▼' : change > 0 ? '▲' : '—'} {Math.abs(change).toFixed(1)}
                </span>
              )}
            </div>
            <Sparkline values={sel.map((s) => s.value)} color="var(--accent)" />
          </>
        ) : (
          <p style={{ fontSize: 13, color: 'var(--text-faint)', padding: '8px 0' }}>No {LABEL[selected]} logged yet.</p>
        )}
      </div>

      {/* Selectable chips */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(72px, 1fr))', gap: 8 }}>
        {TYPES.map((t) => {
          const arr = series.get(t) ?? [];
          const v = arr[arr.length - 1]?.value ?? null;
          const p = arr.length > 1 ? arr[arr.length - 2].value : null;
          const d = v != null && p != null ? v - p : null;
          const isSel = t === selected;
          return (
            <button
              key={t}
              onClick={() => setSelected(t)}
              style={{
                background: isSel ? 'var(--accent-soft)' : 'var(--surface-inset)',
                border: `1px solid ${isSel ? 'var(--accent)' : 'var(--line-soft)'}`,
                borderRadius: 'var(--r-sm)', padding: '8px 6px', cursor: 'pointer', textAlign: 'center',
                transition: 'all .15s',
              }}
            >
              <div className="eyebrow" style={{ fontSize: 9, marginBottom: 3 }}>{LABEL[t]}</div>
              <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: v != null ? 'var(--text)' : 'var(--text-faint)' }}>
                {v != null ? v : '—'}
              </div>
              {d != null && d !== 0 && (
                <div className="mono" style={{ fontSize: 10, color: d < 0 ? 'var(--good)' : 'var(--accent-2)' }}>
                  {d < 0 ? '▼' : '▲'}{Math.abs(d).toFixed(1)}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {measurements.length === 0 && (
        <p style={{ fontSize: 12.5, color: 'var(--text-faint)', textAlign: 'center' }}>
          Log measurements to track each body part over time.
        </p>
      )}
    </div>
  );
}
