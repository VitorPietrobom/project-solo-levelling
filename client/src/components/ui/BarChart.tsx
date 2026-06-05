interface BarChartDataPoint {
  [key: string]: number | string;
}

interface BarChartProps {
  data: BarChartDataPoint[];
  height?: number;
  color?: string;
  accessor?: string;
  labelKey?: string;
}

export default function BarChart({
  data,
  height = 200,
  color = 'var(--accent)',
  accessor = 'v',
  labelKey = 'd',
}: BarChartProps) {
  const W = 560;
  const H = height;
  const padB = 26;
  const padT = 14;
  const gap = 14;

  const max = Math.max(...data.map((d) => d[accessor] as number));
  const bw = (W - gap * (data.length - 1)) / data.length;
  const y = (v: number) => padT + (1 - v / max) * (H - padT - padB);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
      <defs>
        <linearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.95" />
          <stop offset="100%" stopColor={color} stopOpacity="0.35" />
        </linearGradient>
      </defs>
      {data.map((d, i) => {
        const bx = i * (bw + gap);
        const by = y(d[accessor] as number);
        return (
          <g key={i}>
            <rect x={bx} y={by} width={bw} height={H - padB - by} rx="6" fill="url(#barFill)" />
            <text
              x={bx + bw / 2} y={H - 8}
              textAnchor="middle" fontSize="11" fontFamily="var(--font-mono)" fill="var(--text-faint)"
            >
              {d[labelKey] as string}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
