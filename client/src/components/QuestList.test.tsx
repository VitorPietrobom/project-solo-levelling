import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuestList from './QuestList';
import type { Quest } from './QuestList';

const sampleQuests: Quest[] = [
  {
    id: 'q1',
    title: 'Learn TypeScript',
    description: 'Master TS basics',
    xpReward: 100,
    completed: false,
    steps: [
      { id: 's1', description: 'Read docs', sortOrder: 0, completed: true },
      { id: 's2', description: 'Build project', sortOrder: 1, completed: false },
    ],
  },
  {
    id: 'q2',
    title: 'Done Quest',
    description: 'Already finished',
    xpReward: 50,
    completed: true,
    steps: [{ id: 's3', description: 'Only step', sortOrder: 0, completed: true }],
  },
];

describe('QuestList', () => {
  it('renders active quests with progress', () => {
    render(<QuestList quests={sampleQuests} onToggleStep={vi.fn()} />);
    expect(screen.getByText('Learn TypeScript')).toBeInTheDocument();
    expect(screen.getByText('1 / 2 steps')).toBeInTheDocument();
    expect(screen.getByText('100 XP')).toBeInTheDocument();
  });

  it('renders completed quests section', () => {
    render(<QuestList quests={sampleQuests} onToggleStep={vi.fn()} />);
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Done Quest')).toBeInTheDocument();
  });

  it('shows empty state when no quests', () => {
    render(<QuestList quests={[]} onToggleStep={vi.fn()} />);
    expect(screen.getByText('No quests yet. Create one to get started.')).toBeInTheDocument();
  });

  it('calls onToggleStep when clicking an incomplete step', async () => {
    const onToggle = vi.fn();
    render(<QuestList quests={sampleQuests} onToggleStep={onToggle} />);

    await userEvent.click(screen.getByLabelText('Mark "Build project" as complete'));
    expect(onToggle).toHaveBeenCalledWith('q1', 's2');
  });

  it('disables completed steps', () => {
    render(<QuestList quests={sampleQuests} onToggleStep={vi.fn()} />);
    const btn = screen.getByLabelText('Mark "Read docs" as complete');
    expect(btn).toBeDisabled();
  });
});
