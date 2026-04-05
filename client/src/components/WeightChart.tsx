import { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export interface WeightEntry {
  id: string;
  weight: number;
  date: string;
}

interface WeightChartProps {
  entries: WeightEntry[];
}

type TimeRange = '7d' | '30d' | '90d' | 'all';

export default function WeightChart({ entries }: WeightChartProps) {
  const [range, setRange] = useState<TimeRange>('30d');

  const filtered = useMemo(() => {
    if (range === 'all') return entries;
    const now = new Date();
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return entries.filter((e) => new Date(e.date) >= cutoff);
  }, [entries, range]);

  const chartData = filtered.map((e) => ({
    date: new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    weight: e.weight,
  }));

  const latest = entries.length > 0 ? entries[entries.length - 1] : null;
  const previous = entries.length > 1 ? entries[entries.length - 2] : null;
  const change = latest && previous ? latest.weight - previous.weight : null;

  const ranges: { label: string; value: TimeRange }[] = [
    { label: '7D', value: '7d' },
    { label: '30D', value: '30d' },
    { label: '90D', value: '90d' },
    { label: 'All', value: 'all' },
  ];

  return (
    <div className="bg-card rounded-lg p-4 border border-border">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-text-primary font-semibold">Weight</h3>
        <div className="flex gap-1">
          {ranges.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={`px-2 py-0.5 text-xs rounded ${
                range === r.value
                  ? 'bg-accent-primary text-primary font-semibold'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
              aria-label={`Show ${r.label} range`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {latest && (
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-2xl font-bold text-text-primary">{latest.weight}</span>
          <span className="text-text-secondary text-sm">kg</span>
          {change !== null && (
            <span
              className={`text-sm font-semibold ${
                change < 0 ? 'text-accent-success' : change > 0 ? 'text-accent-warning' : 'text-text-secondary'
              }`}
            >
              {change > 0 ? '+' : ''}
              {change.toFixed(1)}
            </span>
          )}
        </div>
      )}

      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
            <XAxis
              dataKey="date"
              tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
              stroke="var(--border-color)"
            />
            <YAxis
              domain={['auto', 'auto']}
              tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
              stroke="var(--border-color)"
              width={40}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                color: 'var(--text-primary)',
              }}
            />
            <Line
              type="monotone"
              dataKey="weight"
              stroke="var(--accent-info)"
              strokeWidth={2}
              dot={{ fill: 'var(--accent-info)', r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-text-secondary text-sm text-center py-8">
          No weight entries yet. Log your first entry to see the chart.
        </p>
      )}
    </div>
  );
}
