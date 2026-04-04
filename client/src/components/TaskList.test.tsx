import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TaskList from './TaskList';
import type { Task } from './TaskList';

const sampleTasks: Task[] = [
  {
    id: 't1',
    title: 'Morning meditation',
    recurrence: 'daily',
    xpReward: 25,
    completedToday: false,
    lastCompletedAt: null,
  },
  {
    id: 't2',
    title: 'Read 30 minutes',
    recurrence: 'daily',
    xpReward: 30,
    completedToday: true,
    lastCompletedAt: '2024-01-15T08:00:00Z',
  },
  {
    id: 't3',
    title: 'Weekly review',
    recurrence: 'weekly',
    xpReward: 50,
    completedToday: false,
    lastCompletedAt: null,
  },
];

describe('TaskList', () => {
  it('renders daily and weekly sections', () => {
    render(<TaskList tasks={sampleTasks} onToggle={vi.fn()} />);
    expect(screen.getByText('Daily')).toBeInTheDocument();
    expect(screen.getByText('Weekly')).toBeInTheDocument();
  });

  it('renders task titles and XP rewards', () => {
    render(<TaskList tasks={sampleTasks} onToggle={vi.fn()} />);
    expect(screen.getByText('Morning meditation')).toBeInTheDocument();
    expect(screen.getByText('25 XP')).toBeInTheDocument();
    expect(screen.getByText('Weekly review')).toBeInTheDocument();
    expect(screen.getByText('50 XP')).toBeInTheDocument();
  });

  it('shows empty state when no tasks', () => {
    render(<TaskList tasks={[]} onToggle={vi.fn()} />);
    expect(screen.getByText('No tasks yet. Create one to get started.')).toBeInTheDocument();
  });

  it('calls onToggle when clicking an incomplete task', async () => {
    const onToggle = vi.fn();
    render(<TaskList tasks={sampleTasks} onToggle={onToggle} />);

    await userEvent.click(screen.getByLabelText('Mark "Morning meditation" as complete'));
    expect(onToggle).toHaveBeenCalledWith('t1');
  });

  it('disables completed tasks', () => {
    render(<TaskList tasks={sampleTasks} onToggle={vi.fn()} />);
    const btn = screen.getByLabelText('"Read 30 minutes" already completed');
    expect(btn).toBeDisabled();
  });

  it('applies line-through style to completed tasks', () => {
    render(<TaskList tasks={sampleTasks} onToggle={vi.fn()} />);
    const completedText = screen.getByText('Read 30 minutes');
    expect(completedText.className).toContain('line-through');
  });
});
