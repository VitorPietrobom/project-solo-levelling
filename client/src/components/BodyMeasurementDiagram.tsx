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
  chest: { x: 100, y: 112 },
  arms: { x: 50, y: 124 },
  waist: { x: 100, y: 166 },
  hips: { x: 100, y: 202 },
  thighs: { x: 84, y: 256 },
};

const BODY_PATH = `
  M 90 55 C 90 62 86 66 78 69 C 62 74 52 83 48 97
  C 45 107 44 118 42 132 C 41 145 39 156 36 166 C 34 172 38 175 42 173
  C 46 171 48 162 50 152 C 52 139 54 126 58 116
  C 60 128 61 142 63 156 C 65 172 68 186 74 198 C 76 206 76 214 77 222
  C 74 250 73 285 76 320 C 78 344 80 366 84 382 L 94 382
  C 95 362 96 336 97 308 C 98 280 99 250 100 230
  C 101 250 102 280 103 308 C 104 336 105 362 106 382 L 116 382
  C 120 366 122 344 124 320 C 127 285 126 250 123 222
  C 124 214 124 206 126 198 C 132 186 135 172 137 156 C 139 142 140 128 142 116
  C 146 126 148 139 150 152 C 152 162 154 171 158 173 C 162 175 166 172 164 166
  C 161 156 159 145 158 132 C 156 118 155 107 152 97 C 148 83 138 74 122 69
  C 114 66 110 62 110 55 C 106 59 94 59 90 55 Z`;

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
