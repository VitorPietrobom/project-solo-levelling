export interface QuestStep {
  id: string;
  description: string;
  sortOrder: number;
  completed: boolean;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  completed: boolean;
  steps: QuestStep[];
}

interface QuestListProps {
  quests: Quest[];
  onToggleStep: (questId: string, stepId: string) => void;
}

function QuestCard({
  quest,
  onToggleStep,
}: {
  quest: Quest;
  onToggleStep: (questId: string, stepId: string) => void;
}) {
  const doneCount = quest.steps.filter((s) => s.completed).length;
  const pct = quest.steps.length > 0 ? (doneCount / quest.steps.length) * 100 : 0;

  return (
    <div className="bg-secondary rounded-lg p-3 border border-border">
      <div className="flex items-center justify-between mb-1">
        <span className="text-text-primary font-semibold text-sm">{quest.title}</span>
        <span className="text-accent-primary text-xs">{quest.xpReward} XP</span>
      </div>
      {quest.description && (
        <p className="text-text-secondary text-xs mb-2 line-clamp-2">{quest.description}</p>
      )}
      <div className="w-full bg-primary rounded-full h-1.5 mb-2 overflow-hidden">
        <div
          className="bg-accent-primary h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={doneCount}
          aria-valuemin={0}
          aria-valuemax={quest.steps.length}
          aria-label={`Quest progress: ${doneCount} of ${quest.steps.length} steps`}
        />
      </div>
      <ul className="space-y-1">
        {quest.steps.map((step) => (
          <li key={step.id}>
            <button
              onClick={() => onToggleStep(quest.id, step.id)}
              disabled={step.completed || quest.completed}
              className="flex items-center gap-2 text-xs w-full text-left disabled:opacity-60"
              aria-label={`Mark "${step.description}" as complete`}
            >
              <span
                className={`w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center text-[10px] ${
                  step.completed
                    ? 'bg-accent-success border-accent-success text-primary'
                    : 'border-border text-transparent'
                }`}
              >
                ✓
              </span>
              <span className={step.completed ? 'text-text-secondary line-through' : 'text-text-primary'}>
                {step.description}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function KanbanColumn({
  title,
  count,
  accent,
  children,
}: {
  title: string;
  count: number;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex-1 min-w-[250px]">
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-2 h-2 rounded-full ${accent}`} />
        <h4 className="text-text-secondary text-sm font-semibold">{title}</h4>
        <span className="text-text-secondary text-xs bg-secondary rounded-full px-2 py-0.5">{count}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

export default function QuestList({ quests = [], onToggleStep }: QuestListProps) {
  const active = quests.filter((q) => !q.completed);
  const completed = quests.filter((q) => q.completed);

  if (active.length === 0 && completed.length === 0) {
    return <p className="text-text-secondary text-sm">No quests yet. Create one to get started.</p>;
  }

  // Split active into "In Progress" (has at least one step done) and "To Do" (no steps done)
  const inProgress = active.filter((q) => q.steps.some((s) => s.completed));
  const todo = active.filter((q) => !q.steps.some((s) => s.completed));

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      <KanbanColumn title="To Do" count={todo.length} accent="bg-accent-info">
        {todo.map((q) => (
          <QuestCard key={q.id} quest={q} onToggleStep={onToggleStep} />
        ))}
      </KanbanColumn>
      <KanbanColumn title="In Progress" count={inProgress.length} accent="bg-accent-primary">
        {inProgress.map((q) => (
          <QuestCard key={q.id} quest={q} onToggleStep={onToggleStep} />
        ))}
      </KanbanColumn>
      <KanbanColumn title="Done" count={completed.length} accent="bg-accent-success">
        {completed.map((q) => (
          <div key={q.id} className="bg-secondary rounded-lg p-3 border border-border opacity-50">
            <div className="flex items-center justify-between">
              <span className="text-text-primary text-sm font-semibold line-through">{q.title}</span>
              <span className="text-accent-success text-xs">✓ {q.xpReward} XP</span>
            </div>
          </div>
        ))}
      </KanbanColumn>
    </div>
  );
}
