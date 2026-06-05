interface RadarDataPoint {
  name: string;
  axis: number;
}

interface RadarChartProps {
  data: RadarDataPoint[];
  size?: number;
  max?: number;
}

export default function RadarChart({ data, size = 300, max = 100 }: RadarChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 44;
  const n = data.length;

  const pt = (i: number, rad: number): [number, number] => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + Math.cos(a) * rad, cy + Math.sin(a) * rad];
  };

  const rings = [0.25, 0.5, 0.75, 1];
  const poly = data.map((d, i) => pt(i, R * (d.axis / max)).join(',')).join(' ');

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ width: '100%', height: 'auto' }}>
      {rings.map((rr, idx) => (
        <polygon
          key={idx}
          points={data.map((_, i) => pt(i, R * rr).join(',')).join(' ')}
          fill="none"
          stroke="var(--line-soft)"
          strokeWidth="1"
        />
      ))}
      {data.map((_, i) => {
        const [x, y] = pt(i, R);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--line-soft)" strokeWidth="1" />;
      })}
      <polygon
        points={poly}
        fill="var(--accent-2-soft)"
        stroke="var(--accent-2)"
        strokeWidth="2"
        style={{ filter: 'drop-shadow(0 0 10px var(--accent-2-soft))' }}
      />
      {data.map((d, i) => {
        const [x, y] = pt(i, R * (d.axis / max));
        return (
          <circle key={i} cx={x} cy={y} r="3.5" fill="var(--accent-2)" stroke="var(--bg-0)" strokeWidth="1.5" />
        );
      })}
      {data.map((d, i) => {
        const [x, y] = pt(i, R + 24);
        return (
          <text
            key={i}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="11.5"
            fontFamily="var(--font-mono)"
            fill="var(--text-3)"
            style={{ letterSpacing: '0.04em' }}
          >
            {d.name}
          </text>
        );
      })}
    </svg>
  );
}
