interface LineChartDataPoint {
  [key: string]: number | string;
}

interface LineChartProps {
  data: LineChartDataPoint[];
  goal?: number;
  height?: number;
  accessor?: string;
  labelKey?: string;
  unit?: string;
}

export default function LineChart({
  data,
  goal,
  height = 240,
  accessor = 'w',
  labelKey = 'd',
  unit = 'kg',
}: LineChartProps) {
  const W = 720;
  const H = height;
  const padX = 16;
  const padT = 24;
  const padB = 30;

  const vals = data.map((d) => d[accessor] as number);
  const lo = Math.min(...vals, goal ?? Infinity) - 0.6;
  const hi = Math.max(...vals, goal ?? -Infinity) + 0.6;

  const x = (i: number) => padX + (i / (data.length - 1)) * (W - padX * 2);
  const y = (v: number) => padT + (1 - (v - lo) / (hi - lo)) * (H - padT - padB);

  const line = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(d[accessor] as number)}`).join(' ');
  const area = `${line} L${x(data.length - 1)},${H - padB} L${x(0)},${H - padB} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
      <defs>
        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {goal != null && (
        <>
          <line
            x1={padX} y1={y(goal)} x2={W - padX} y2={y(goal)}
            stroke="var(--accent-2)" strokeWidth="1.5" strokeDasharray="5 5" opacity="0.7"
          />
          <text
            x={W - padX} y={y(goal) - 7}
            textAnchor="end" fontSize="11" fontFamily="var(--font-mono)" fill="var(--accent-2)"
          >
            goal {goal}{unit}
          </text>
        </>
      )}
      <path d={area} fill="url(#areaFill)" />
      <path
        d={line} fill="none" stroke="var(--accent)" strokeWidth="2.5"
        strokeLinejoin="round" strokeLinecap="round"
        style={{ filter: 'drop-shadow(0 1px 8px var(--accent-soft))' }}
      />
      {data.map((d, i) => (
        <g key={i}>
          <circle
            cx={x(i)} cy={y(d[accessor] as number)}
            r={i === data.length - 1 ? 5 : 3}
            fill="var(--bg-0)" stroke="var(--accent)" strokeWidth="2.5"
          />
          {(i === 0 || i === data.length - 1 || i % 2 === 0) && (
            <text
              x={x(i)} y={H - 10}
              textAnchor="middle" fontSize="10.5" fontFamily="var(--font-mono)" fill="var(--text-faint)"
            >
              {d[labelKey] as string}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
