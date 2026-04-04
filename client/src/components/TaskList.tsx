export interface Task {
  id: string;
  title: string;
  recurrence: 'daily' | 'weekly';
  xpReward: number;
  completedToday: boolean;
  lastCompletedAt: string | null;
}

interface TaskListProps {
  tasks: Task[];
  onToggle: (taskId: string) => void;
}

export default function TaskList({ tasks = [], onToggle }: TaskListProps) {
  const daily = tasks.filter((t) => t.recurrence === 'daily');
  const weekly = tasks.filter((t) => t.recurrence === 'weekly');

  if (daily.length === 0 && weekly.length === 0) {
    return <p className="text-text-secondary text-sm">No tasks yet. Create one to get started.</p>;
  }

  function renderTask(task: Task) {
    return (
      <div key={task.id} className="bg-card rounded-lg p-3 border border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onToggle(task.id)}
            disabled={task.completedToday}
            className="flex items-center justify-center w-5 h-5 rounded border disabled:opacity-60"
            aria-label={task.completedToday ? `"${task.title}" already completed` : `Mark "${task.title}" as complete`}
          >
            <span
              className={`w-5 h-5 rounded border flex items-center justify-center text-xs ${
                task.completedToday
                  ? 'bg-accent-success border-accent-success text-primary'
                  : 'border-border text-transparent'
              }`}
            >
              ✓
            </span>
          </button>
          <span className={task.completedToday ? 'text-text-secondary line-through' : 'text-text-primary'}>
            {task.title}
          </span>
        </div>
        <span className="text-accent-primary text-xs">{task.xpReward} XP</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {daily.length > 0 && (
        <div>
          <h4 className="text-text-secondary text-sm font-semibold mb-2">Daily</h4>
          <div className="space-y-2">{daily.map(renderTask)}</div>
        </div>
      )}
      {weekly.length > 0 && (
        <div>
          <h4 className="text-text-secondary text-sm font-semibold mb-2">Weekly</h4>
          <div className="space-y-2">{weekly.map(renderTask)}</div>
        </div>
      )}
    </div>
  );
}
