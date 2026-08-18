import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuestCard from './QuestCard';
import type { Quest } from './QuestList';

const baseQuest: Quest = {
  id: 'q1',
  title: 'Learn Guitar',
  description: 'Practice every day',
  xpReward: 100,
  priority: 'medium',
  dueDate: null,
  completed: false,
  steps: [
    { id: 's1', description: 'Buy a guitar', sortOrder: 0, completed: true },
    { id: 's2', description: 'Learn three chords', sortOrder: 1, completed: false },
  ],
};

const noop = () => {};

describe('QuestCard', () => {
  it('shows progress but not step text while collapsed', () => {
    render(<QuestCard quest={baseQuest} dragging={false} onDragStart={noop} onDragEnd={noop} onToggleStep={noop} onDelete={noop} onUpdate={noop} />);
    expect(screen.getByText('1/2')).toBeInTheDocument();
    expect(screen.queryByText('Buy a guitar')).not.toBeInTheDocument();
  });

  it('expands to reveal the description and every step by its real text', async () => {
    render(<QuestCard quest={baseQuest} dragging={false} onDragStart={noop} onDragEnd={noop} onToggleStep={noop} onDelete={noop} onUpdate={noop} />);
    await userEvent.click(screen.getByLabelText('Expand quest "Learn Guitar"'));
    expect(screen.getByText('Practice every day')).toBeInTheDocument();
    expect(screen.getByText('Buy a guitar')).toBeInTheDocument();
    expect(screen.getByText('Learn three chords')).toBeInTheDocument();
  });

  it('lets a completed step be unchecked, not just checked once', async () => {
    const onToggleStep = vi.fn();
    render(<QuestCard quest={baseQuest} dragging={false} onDragStart={noop} onDragEnd={noop} onToggleStep={onToggleStep} onDelete={noop} onUpdate={noop} />);
    await userEvent.click(screen.getByLabelText('Expand quest "Learn Guitar"'));

    await userEvent.click(screen.getByLabelText('Buy a guitar')); // was completed
    expect(onToggleStep).toHaveBeenCalledWith('q1', 's1', false);

    await userEvent.click(screen.getByLabelText('Learn three chords')); // was not
    expect(onToggleStep).toHaveBeenCalledWith('q1', 's2', true);
  });

  it('calls onUpdate when a priority pill is picked', async () => {
    const onUpdate = vi.fn();
    render(<QuestCard quest={baseQuest} dragging={false} onDragStart={noop} onDragEnd={noop} onToggleStep={noop} onDelete={noop} onUpdate={onUpdate} />);
    await userEvent.click(screen.getByLabelText('Expand quest "Learn Guitar"'));
    await userEvent.click(screen.getByRole('radio', { name: 'High' }));
    expect(onUpdate).toHaveBeenCalledWith('q1', { priority: 'high' });
  });

  it('deleting does not also expand the card', async () => {
    const onDelete = vi.fn();
    render(<QuestCard quest={baseQuest} dragging={false} onDragStart={noop} onDragEnd={noop} onToggleStep={noop} onDelete={onDelete} onUpdate={noop} />);
    await userEvent.click(screen.getByLabelText('Delete quest "Learn Guitar"'));
    expect(onDelete).toHaveBeenCalledWith('q1', 'Learn Guitar');
    expect(screen.queryByText('Practice every day')).not.toBeInTheDocument();
  });

  it('flags a past due date as overdue when the quest is not done', () => {
    const overdue = { ...baseQuest, dueDate: '2020-01-01', completed: false };
    render(<QuestCard quest={overdue} dragging={false} onDragStart={noop} onDragEnd={noop} onToggleStep={noop} onDelete={noop} onUpdate={noop} />);
    expect(screen.getByText('Overdue')).toBeInTheDocument();
  });

  it('does not flag a past due date as overdue once the quest is done', () => {
    const done = { ...baseQuest, dueDate: '2020-01-01', completed: true };
    render(<QuestCard quest={done} dragging={false} onDragStart={noop} onDragEnd={noop} onToggleStep={noop} onDelete={noop} onUpdate={noop} />);
    expect(screen.queryByText('Overdue')).not.toBeInTheDocument();
  });
});
