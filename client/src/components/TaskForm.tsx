import { useState } from 'react';
import type { Task } from './TaskList';

interface TaskFormProps {
  onCreated: (optimistic: Task, body: { title: string; recurrence: string; xpReward: number }) => void;
}

export default function TaskForm({ onCreated }: TaskFormProps) {
  const [title, setTitle] = useState('');
  const [recurrence, setRecurrence] = useState<'daily' | 'weekly'>('daily');
  const [xpReward, setXpReward] = useState(25);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    const optimistic: Task = {
      id: `temp-${Date.now()}`,
      title: title.trim(),
      recurrence,
      xpReward,
      completedToday: false,
      lastCompletedAt: null,
    };

    onCreated(optimistic, {
      title: optimistic.title,
      recurrence,
      xpReward,
    });

    setTitle('');
    setRecurrence('daily');
    setXpReward(25);
  }

  return (
    <form onSubmit={handleSubmit} className="bg-card rounded-lg p-4 border border-border space-y-3">
      <h3 className="text-text-primary font-semibold">New Task</h3>
      {error && <p className="text-accent-warning text-sm">{error}</p>}
      <input
        type="text"
        placeholder="Task title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full bg-secondary text-text-primary border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-accent-primary"
        aria-label="Task title"
      />
      <div className="flex items-center gap-4">
        <label className="text-text-secondary text-sm flex items-center gap-2">
          <input
            type="radio"
            name="recurrence"
            value="daily"
            checked={recurrence === 'daily'}
            onChange={() => setRecurrence('daily')}
            className="accent-accent-primary"
          />
          Daily
        </label>
        <label className="text-text-secondary text-sm flex items-center gap-2">
          <input
            type="radio"
            name="recurrence"
            value="weekly"
            checked={recurrence === 'weekly'}
            onChange={() => setRecurrence('weekly')}
            className="accent-accent-primary"
          />
          Weekly
        </label>
      </div>
      <div className="flex items-center gap-2">
        <label htmlFor="task-xp-reward" className="text-text-secondary text-sm">XP Reward:</label>
        <input
          id="task-xp-reward"
          type="number"
          min={0}
          value={xpReward}
          onChange={(e) => setXpReward(Number(e.target.value))}
          className="w-24 bg-secondary text-text-primary border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-accent-primary"
        />
      </div>
      <button
        type="submit"
        className="w-full bg-accent-primary text-primary font-semibold py-2 rounded hover:opacity-90 transition-opacity"
      >
        Create Task
      </button>
    </form>
  );
}
