export interface Skill {
  id: string;
  name: string;
  totalXP: number;
  level: number;
  progress: { current: number; required: number; percentage: number };
}

interface SkillListProps {
  skills: Skill[];
  onLog: (skillId: string, xp: number) => void;
}

function SkillRadar({ skills }: { skills: Skill[] }) {
  const size = 280;
  const cx = size / 2;
  const cy = size / 2;
  const maxLevel = Math.max(...skills.map((s) => s.level), 5);
  const rings = 5;
  const radius = (size - 80) / 2;

  const n = skills.length;
  const angleStep = (2 * Math.PI) / n;

  function getPoint(index: number, value: number): [number, number] {
    const angle = angleStep * index - Math.PI / 2;
    const r = (value / maxLevel) * radius;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  }

  // Grid rings
  const gridRings = Array.from({ length: rings }, (_, i) => {
    const r = ((i + 1) / rings) * radius;
    const points = Array.from({ length: n }, (_, j) => {
      const angle = angleStep * j - Math.PI / 2;
      return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
    }).join(' ');
    return points;
  });

  // Skill polygon — use level + progress fraction for smoother shape
  const skillPoints = skills
    .map((s, i) => {
      const value = s.level + s.progress.percentage / 100;
      const [x, y] = getPoint(i, value);
      return `${x},${y}`;
    })
    .join(' ');

  // Axis lines
  const axes = skills.map((_, i) => {
    const [x, y] = getPoint(i, maxLevel);
    return { x, y };
  });

  return (
    <svg viewBox="-20 -20 320 320" className="w-full max-w-[320px] mx-auto">
      {/* Grid rings */}
      {gridRings.map((points, i) => (
        <polygon
          key={i}
          points={points}
          fill="none"
          stroke="var(--border-color)"
          strokeWidth={i === rings - 1 ? 1.5 : 0.5}
          opacity={0.5}
        />
      ))}
      {/* Axis lines */}
      {axes.map((a, i) => (
        <line key={i} x1={cx} y1={cy} x2={a.x} y2={a.y} stroke="var(--border-color)" strokeWidth={0.5} opacity={0.4} />
      ))}
      {/* Skill polygon */}
      <polygon
        points={skillPoints}
        fill="var(--accent-primary)"
        fillOpacity={0.15}
        stroke="var(--accent-primary)"
        strokeWidth={2}
      />
      {/* Skill dots + labels */}
      {skills.map((s, i) => {
        const value = s.level + s.progress.percentage / 100;
        const [x, y] = getPoint(i, value);
        const [lx, ly] = getPoint(i, maxLevel + 0.8);
        return (
          <g key={s.id}>
            <circle cx={x} cy={y} r={3.5} fill="var(--accent-primary)" />
            <text
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="var(--text-secondary)"
              fontSize={10}
            >
              {s.name}
            </text>
            <text
              x={lx}
              y={ly + 12}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="var(--accent-secondary)"
              fontSize={9}
              fontWeight="bold"
            >
              Lv.{s.level}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function SkillList({ skills = [], onLog }: SkillListProps) {
  if (skills.length === 0) {
    return <p className="text-text-secondary text-sm">No skills yet. Create one to get started.</p>;
  }

  return (
    <div className="space-y-4">
      {skills.length >= 3 && <SkillRadar skills={skills} />}
      <div className="space-y-2">
        {skills.map((skill) => (
          <div key={skill.id} className="bg-card rounded-lg p-3 border border-border">
            <div className="flex items-center justify-between mb-1">
              <span className="text-text-primary font-semibold text-sm">{skill.name}</span>
              <span className="text-accent-secondary text-xs font-bold">Lv.{skill.level}</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-1.5 mb-1 overflow-hidden">
              <div
                className="bg-accent-primary h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${skill.progress.percentage}%` }}
                role="progressbar"
                aria-valuenow={skill.progress.current}
                aria-valuemin={0}
                aria-valuemax={skill.progress.required}
                aria-label={`${skill.name} XP progress: ${skill.progress.current} of ${skill.progress.required}`}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-secondary text-xs">
                {skill.progress.current} / {skill.progress.required} XP
              </span>
              <button
                onClick={() => onLog(skill.id, 10)}
                className="text-accent-info text-xs hover:opacity-80"
                aria-label={`Log XP for ${skill.name}`}
              >
                + Log XP
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
