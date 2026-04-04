import { useState } from 'react';
import type { Quest } from './QuestList';

interface QuestFormProps {
  onCreated: (optimistic: Quest, validSteps: string[], xpReward: number) => void;
}

export default function QuestForm({ onCreated }: QuestFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [xpReward, setXpReward] = useState(50);
  const [steps, setSteps] = useState<string[]>(['']);
  const [error, setError] = useState<string | null>(null);

  function addStep() {
    setSteps([...steps, '']);
  }

  function removeStep(index: number) {
    setSteps(steps.filter((_, i) => i !== index));
  }

  function updateStep(index: number, value: string) {
    const updated = [...steps];
    updated[index] = value;
    setSteps(updated);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const validSteps = steps.filter((s) => s.trim() !== '');
    if (!title.trim() || !description.trim() || validSteps.length === 0) {
      setError('Title, description, and at least one step are required');
      return;
    }

    const optimistic: Quest = {
      id: `temp-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      xpReward,
      completed: false,
      steps: validSteps.map((desc, i) => ({
        id: `temp-step-${i}`,
        description: desc,
        sortOrder: i,
        completed: false,
      })),
    };

    onCreated(optimistic, validSteps, xpReward);
    setTitle('');
    setDescription('');
    setXpReward(50);
    setSteps(['']);
  }

  return (
    <form onSubmit={handleSubmit} className="bg-card rounded-lg p-4 border border-border space-y-3">
      <h3 className="text-text-primary font-semibold">New Quest</h3>
      {error && <p className="text-accent-warning text-sm">{error}</p>}
      <input
        type="text"
        placeholder="Quest title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full bg-secondary text-text-primary border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-accent-primary"
        aria-label="Quest title"
      />
      <textarea
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full bg-secondary text-text-primary border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-accent-primary"
        rows={2}
        aria-label="Quest description"
      />
      <div className="flex items-center gap-2">
        <label htmlFor="xp-reward" className="text-text-secondary text-sm">XP Reward:</label>
        <input
          id="xp-reward"
          type="number"
          min={0}
          value={xpReward}
          onChange={(e) => setXpReward(Number(e.target.value))}
          className="w-24 bg-secondary text-text-primary border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-accent-primary"
        />
      </div>
      <div className="space-y-2">
        <span className="text-text-secondary text-sm">Steps:</span>
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="text"
              placeholder={`Step ${i + 1}`}
              value={step}
              onChange={(e) => updateStep(i, e.target.value)}
              className="flex-1 bg-secondary text-text-primary border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-accent-primary"
              aria-label={`Step ${i + 1}`}
            />
            {steps.length > 1 && (
              <button
                type="button"
                onClick={() => removeStep(i)}
                className="text-accent-warning text-sm hover:opacity-80"
                aria-label={`Remove step ${i + 1}`}
              >
                ✕
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={addStep}
          className="text-accent-info text-sm hover:opacity-80"
        >
          + Add step
        </button>
      </div>
      <button
        type="submit"
        className="w-full bg-accent-primary text-primary font-semibold py-2 rounded hover:opacity-90 transition-opacity"
      >
        Create Quest
      </button>
    </form>
  );
}
