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

export default function QuestList({ quests = [], onToggleStep }: QuestListProps) {
  const active = quests.filter((q) => !q.completed);
  const completed = quests.filter((q) => q.completed);

  return (
    <div className="space-y-3">
      {active.length === 0 && completed.length === 0 && (
        <p className="text-text-secondary text-sm">No quests yet. Create one to get started.</p>
      )}
      {active.map((quest) => {
        const doneCount = quest.steps.filter((s) => s.completed).length;
        const pct = quest.steps.length > 0 ? (doneCount / quest.steps.length) * 100 : 0;
        return (
          <div key={quest.id} className="bg-card rounded-lg p-4 border border-border">
            <div className="flex items-center justify-between mb-1">
              <span className="text-text-primary font-semibold">{quest.title}</span>
              <span className="text-accent-primary text-xs">{quest.xpReward} XP</span>
            </div>
            <p className="text-text-secondary text-sm mb-2">{quest.description}</p>
            <div className="w-full bg-secondary rounded-full h-2 mb-2 overflow-hidden">
              <div
                className="bg-accent-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${pct}%` }}
                role="progressbar"
                aria-valuenow={doneCount}
                aria-valuemin={0}
                aria-valuemax={quest.steps.length}
                aria-label={`Quest progress: ${doneCount} of ${quest.steps.length} steps`}
              />
            </div>
            <p className="text-text-secondary text-xs mb-2">
              {doneCount} / {quest.steps.length} steps
            </p>
            <ul className="space-y-1">
              {quest.steps.map((step) => (
                <li key={step.id} className="flex items-center gap-2">
                  <button
                    onClick={() => onToggleStep(quest.id, step.id)}
                    disabled={step.completed}
                    className="flex items-center gap-2 text-sm disabled:opacity-60"
                    aria-label={`Mark "${step.description}" as complete`}
                  >
                    <span
                      className={`w-4 h-4 rounded border flex items-center justify-center text-xs ${
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
      })}
      {completed.length > 0 && (
        <div>
          <h4 className="text-text-secondary text-sm font-semibold mb-2">Completed</h4>
          {completed.map((quest) => (
            <div key={quest.id} className="bg-card rounded-lg p-3 border border-border opacity-60 mb-2">
              <div className="flex items-center justify-between">
                <span className="text-text-primary font-semibold line-through">{quest.title}</span>
                <span className="text-accent-success text-xs">✓ {quest.xpReward} XP</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
