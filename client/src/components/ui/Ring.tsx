import type { ReactNode } from 'react';

interface RingProps {
  value: number;
  max?: number;
  size?: number;
  thick?: number;
  color?: string;
  track?: string;
  glow?: boolean;
  children?: ReactNode;
}

export default function Ring({
  value,
  max = 100,
  size = 132,
  thick = 11,
  color = 'var(--accent)',
  track = 'var(--surface-inset)',
  glow = true,
  children,
}: RingProps) {
  const r = (size - thick) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / max));

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg
        width={size}
        height={size}
        style={{
          transform: 'rotate(-90deg)',
          filter: glow ? 'drop-shadow(0 0 8px var(--accent-soft))' : 'none',
        }}
      >
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={thick} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={thick}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{
            transition: 'stroke-dashoffset 0.9s cubic-bezier(0.16,1,0.3,1)',
            strokeLinecap: 'round',
          }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}
      >
        {children}
      </div>
    </div>
  );
}
