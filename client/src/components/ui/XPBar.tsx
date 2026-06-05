interface XPBarProps {
  value: number;
  max?: number;
  color?: string;
  height?: number;
}

export default function XPBar({ value, max = 100, color = 'var(--accent)', height = 8 }: XPBarProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div style={{ background: 'var(--surface-inset)', borderRadius: 99, height, overflow: 'hidden' }}>
      <div
        style={{
          width: pct + '%',
          height: '100%',
          borderRadius: 99,
          background: color,
          transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)',
          boxShadow: '0 0 12px -2px ' + color,
        }}
      />
    </div>
  );
}
