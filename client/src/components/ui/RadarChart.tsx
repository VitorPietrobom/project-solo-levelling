import { useId, useState } from 'react';

export interface RadarDataPoint {
  name: string;
  /** Value plotted on this axis. */
  axis: number;
  /** Optional secondary figure shown next to the label (e.g. "Lv 4"). */
  detail?: string;
}

interface RadarChartProps {
  data: RadarDataPoint[];
  size?: number;
  /** Upper bound of the scale. Defaults to a rounded-up bound over the data. */
  max?: number;
  /** Index to emphasise, e.g. the row the user is hovering in the skill list. */
  highlightIndex?: number | null;
  onHighlight?: (index: number | null) => void;
}

/**
 * Rounds a maximum up to a friendly tick so the outer ring means something
 * absolute. Without this the strongest skill always touches the edge and the
 * chart can never show "everything is still low".
 */
export function niceMax(values: number[], floor = 4): number {
  const peak = Math.max(floor, ...values);
  if (peak <= 5) return 5;
  if (peak <= 10) return 10;
  const step = peak <= 50 ? 5 : peak <= 200 ? 25 : 100;
  return Math.ceil(peak / step) * step;
}

/**
 * Where a label sits for axis `i` of `n`. Below the rotation threshold labels
 * stay upright and are anchored by which side of the circle they fall on; past
 * it they rotate to lie along their own spoke, which is the only way a dozen
 * or more names fit without colliding.
 */
export function labelPlacement(i: number, n: number, rotateFrom = 9): {
  angle: number;
  anchor: 'start' | 'middle' | 'end';
  rotate: number | null;
} {
  const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
  if (n >= rotateFrom) {
    // Normalise to (-180, 180] first, otherwise the flip below can hand back
    // angles like 378° — equivalent on screen, but impossible to reason about.
    const raw = (angle * 180) / Math.PI;
    const deg = ((((raw + 180) % 360) + 360) % 360) - 180;
    // Flip labels on the left half so none of them read upside-down. Rotate
    // toward zero so the result always lands back inside [-90, 90].
    if (deg > 90) return { angle, anchor: 'end', rotate: deg - 180 };
    if (deg < -90) return { angle, anchor: 'end', rotate: deg + 180 };
    return { angle, anchor: 'start', rotate: deg };
  }
  const cos = Math.cos(angle);
  const anchor = cos > 0.25 ? 'start' : cos < -0.25 ? 'end' : 'middle';
  return { angle, anchor, rotate: null };
}

/** Shortens a name to fit the space an axis label gets. */
export function fitLabel(name: string, n: number): string {
  const budget = n <= 8 ? 14 : n <= 16 ? 12 : 9;
  return name.length > budget ? `${name.slice(0, budget - 1)}…` : name;
}

export default function RadarChart({
  data,
  size = 300,
  max,
  highlightIndex = null,
  onHighlight,
}: RadarChartProps) {
  const gradientId = useId();
  const [hovered, setHovered] = useState<number | null>(null);
  const active = highlightIndex ?? hovered;

  const n = data.length;
  if (n === 0) return null;

  const scaleMax = max ?? niceMax(data.map((d) => d.axis));

  // Labels live outside the rings. Rather than shrinking the plot to fit them,
  // the viewBox is padded and the whole thing scales down to its container —
  // otherwise long skill names get clipped by the card.
  const rotating = n >= 9;
  const pad = rotating ? 52 : 62;
  const R = size / 2 - 22;
  const cx = size / 2;
  const cy = size / 2;

  const pt = (i: number, rad: number): [number, number] => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + Math.cos(a) * rad, cy + Math.sin(a) * rad];
  };

  const rings = [0.25, 0.5, 0.75, 1];
  const poly = data.map((d, i) => pt(i, R * Math.min(1, d.axis / scaleMax)).join(',')).join(' ');

  // Below ~16 axes every spoke is drawn; past that they turn into visual mud,
  // so only the ones carrying a label keep their line.
  const showAllSpokes = n <= 16;
  // Dots get in each other's way once the axes are dense.
  const dotRadius = n <= 10 ? 3.5 : n <= 18 ? 2.6 : 2;
  const labelSize = n <= 6 ? 11.5 : n <= 12 ? 10.5 : 9.5;

  return (
    <svg
      width={size} height={size} viewBox={`${-pad} ${-pad} ${size + pad * 2} ${size + pad * 2}`}
      role="img" aria-label={`Skill radar across ${n} skills`}
      style={{ width: '100%', height: 'auto', overflow: 'visible' }}
      onPointerLeave={() => { setHovered(null); onHighlight?.(null); }}
    >
      <defs>
        <radialGradient id={gradientId}>
          <stop offset="0%" stopColor="var(--accent-2)" stopOpacity="0.34" />
          <stop offset="100%" stopColor="var(--accent-2)" stopOpacity="0.10" />
        </radialGradient>
      </defs>

      {rings.map((rr, idx) => (
        <polygon
          key={idx}
          points={data.map((_, i) => pt(i, R * rr).join(',')).join(' ')}
          fill="none"
          stroke="var(--line-soft)"
          strokeWidth={rr === 1 ? 1.4 : 1}
        />
      ))}

      {data.map((_, i) => {
        if (!showAllSpokes && i % 2 !== 0) return null;
        const [x, y] = pt(i, R);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--line-soft)" strokeWidth="1" />;
      })}

      {/* Scale marker just inside the outer ring, so the shape means something
          absolute. Sits inside rather than outside to stay clear of the label. */}
      <text
        x={cx + 5} y={cy - R + 11} fontSize="9" fontFamily="var(--font-mono)"
        fill="var(--text-faint)" textAnchor="start"
      >
        {scaleMax}
      </text>

      <polygon
        points={poly}
        fill={`url(#${gradientId})`}
        stroke="var(--accent-2)"
        strokeWidth="2"
        strokeLinejoin="round"
        style={{ filter: 'drop-shadow(0 0 10px var(--accent-2-soft))' }}
      />

      {data.map((d, i) => {
        const [x, y] = pt(i, R * Math.min(1, d.axis / scaleMax));
        const on = active === i;
        return (
          <circle
            key={i} cx={x} cy={y} r={on ? dotRadius + 2 : dotRadius}
            fill={on ? 'var(--accent)' : 'var(--accent-2)'}
            stroke="var(--bg-0)" strokeWidth="1.5"
          />
        );
      })}

      {data.map((d, i) => {
        const { anchor, rotate } = labelPlacement(i, n);
        const [x, y] = pt(i, R + (rotate === null ? 20 : 12));
        const on = active === i;
        const transform = rotate === null ? undefined : `rotate(${rotate} ${x} ${y})`;
        return (
          <g
            key={i}
            style={{ cursor: onHighlight ? 'pointer' : 'default' }}
            onPointerEnter={() => { setHovered(i); onHighlight?.(i); }}
            onClick={() => onHighlight?.(i)}
          >
            <title>{d.detail ? `${d.name} — ${d.detail}` : d.name}</title>
            {/* Invisible hit area so thin text is still easy to hit on a phone. */}
            <circle cx={x} cy={y} r={13} fill="transparent" />
            <text
              x={x} y={y} transform={transform}
              textAnchor={anchor} dominantBaseline="middle"
              fontSize={labelSize} fontFamily="var(--font-mono)"
              fill={on ? 'var(--accent)' : 'var(--text-3)'}
              fontWeight={on ? 700 : 400}
              style={{ letterSpacing: '0.03em' }}
            >
              {fitLabel(d.name, n)}
            </text>
            {/* Only show the per-axis detail when there's room for it. */}
            {d.detail && rotate === null && n <= 8 && (
              <text
                x={x} y={y + 12}
                textAnchor={anchor} dominantBaseline="middle"
                fontSize="9" fontFamily="var(--font-mono)"
                fill={on ? 'var(--accent)' : 'var(--text-faint)'}
              >
                {d.detail}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
