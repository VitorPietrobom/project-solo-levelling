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
  linkedSkillId: null,
  recurrence: null,
  completed: false,
  steps: [
    { id: 's1', description: 'Buy a guitar', sortOrder: 0, completed: true },
    { id: 's2', description: 'Learn three chords', sortOrder: 1, completed: false },
  ],
};

const noop = () => {};

describe('QuestCard', () => {
  it('shows progress but not step text while collapsed', () => {
    render(<QuestCard quest={baseQuest} dragging={false} onDragStart={noop} onDragEnd={noop} onToggleStep={noop} onDelete={noop} onUpdate={noop} onSetCompleted={noop} />);
    expect(screen.getByText('1/2')).toBeInTheDocument();
    expect(screen.queryByText('Buy a guitar')).not.toBeInTheDocument();
  });

  it('expands to reveal the description and every step by its real text', async () => {
    render(<QuestCard quest={baseQuest} dragging={false} onDragStart={noop} onDragEnd={noop} onToggleStep={noop} onDelete={noop} onUpdate={noop} onSetCompleted={noop} />);
    await userEvent.click(screen.getByLabelText('Expand quest "Learn Guitar"'));
    expect(screen.getByText('Practice every day')).toBeInTheDocument();
    expect(screen.getByText('Buy a guitar')).toBeInTheDocument();
    expect(screen.getByText('Learn three chords')).toBeInTheDocument();
  });

  it('lets a completed step be unchecked, not just checked once', async () => {
    const onToggleStep = vi.fn();
    render(<QuestCard quest={baseQuest} dragging={false} onDragStart={noop} onDragEnd={noop} onToggleStep={onToggleStep} onDelete={noop} onUpdate={noop} onSetCompleted={noop} />);
    await userEvent.click(screen.getByLabelText('Expand quest "Learn Guitar"'));

    await userEvent.click(screen.getByLabelText('Buy a guitar')); // was completed
    expect(onToggleStep).toHaveBeenCalledWith('q1', 's1', false);

    await userEvent.click(screen.getByLabelText('Learn three chords')); // was not
    expect(onToggleStep).toHaveBeenCalledWith('q1', 's2', true);
  });

  it('calls onUpdate when a priority pill is picked', async () => {
    const onUpdate = vi.fn();
    render(<QuestCard quest={baseQuest} dragging={false} onDragStart={noop} onDragEnd={noop} onToggleStep={noop} onDelete={noop} onUpdate={onUpdate} onSetCompleted={noop} />);
    await userEvent.click(screen.getByLabelText('Expand quest "Learn Guitar"'));
    await userEvent.click(screen.getByRole('radio', { name: 'High' }));
    expect(onUpdate).toHaveBeenCalledWith('q1', { priority: 'high' });
  });

  it('taps to mark every step done, without needing to drag (no touch drag-and-drop)', async () => {
    const onSetCompleted = vi.fn();
    render(<QuestCard quest={baseQuest} dragging={false} onDragStart={noop} onDragEnd={noop} onToggleStep={noop} onDelete={noop} onUpdate={noop} onSetCompleted={onSetCompleted} />);
    await userEvent.click(screen.getByLabelText('Mark quest "Learn Guitar" done'));
    expect(onSetCompleted).toHaveBeenCalledWith('q1', true);
  });

  it('taps a done quest to reopen it', async () => {
    const onSetCompleted = vi.fn();
    const done = { ...baseQuest, completed: true };
    render(<QuestCard quest={done} dragging={false} onDragStart={noop} onDragEnd={noop} onToggleStep={noop} onDelete={noop} onUpdate={noop} onSetCompleted={onSetCompleted} />);
    await userEvent.click(screen.getByLabelText('Reopen quest "Learn Guitar"'));
    expect(onSetCompleted).toHaveBeenCalledWith('q1', false);
  });

  it('the complete/reopen tap does not also expand the card', async () => {
    render(<QuestCard quest={baseQuest} dragging={false} onDragStart={noop} onDragEnd={noop} onToggleStep={noop} onDelete={noop} onUpdate={noop} onSetCompleted={noop} />);
    await userEvent.click(screen.getByLabelText('Mark quest "Learn Guitar" done'));
    expect(screen.queryByText('Practice every day')).not.toBeInTheDocument();
  });

  it('deleting does not also expand the card', async () => {
    const onDelete = vi.fn();
    render(<QuestCard quest={baseQuest} dragging={false} onDragStart={noop} onDragEnd={noop} onToggleStep={noop} onDelete={onDelete} onUpdate={noop} onSetCompleted={noop} />);
    await userEvent.click(screen.getByLabelText('Delete quest "Learn Guitar"'));
    expect(onDelete).toHaveBeenCalledWith('q1', 'Learn Guitar');
    expect(screen.queryByText('Practice every day')).not.toBeInTheDocument();
  });

  it('flags a past due date as overdue when the quest is not done', () => {
    const overdue = { ...baseQuest, dueDate: '2020-01-01', completed: false };
    render(<QuestCard quest={overdue} dragging={false} onDragStart={noop} onDragEnd={noop} onToggleStep={noop} onDelete={noop} onUpdate={noop} onSetCompleted={noop} />);
    expect(screen.getByText('Overdue')).toBeInTheDocument();
  });

  it('does not flag a past due date as overdue once the quest is done', () => {
    const done = { ...baseQuest, dueDate: '2020-01-01', completed: true };
    render(<QuestCard quest={done} dragging={false} onDragStart={noop} onDragEnd={noop} onToggleStep={noop} onDelete={noop} onUpdate={noop} onSetCompleted={noop} />);
    expect(screen.queryByText('Overdue')).not.toBeInTheDocument();
  });

  const skills = [{ id: 'sk1', name: 'Guitar', totalXP: 0, level: 0, progress: { current: 0, required: 100, percentage: 0 } }];

  it('shows the linked skill name on the collapsed card', () => {
    const linked = { ...baseQuest, linkedSkillId: 'sk1' };
    render(<QuestCard quest={linked} skills={skills} dragging={false} onDragStart={noop} onDragEnd={noop} onToggleStep={noop} onDelete={noop} onUpdate={noop} onSetCompleted={noop} />);
    expect(screen.getByText('Guitar')).toBeInTheDocument();
  });

  it('shows no skill badge when nothing is linked', () => {
    render(<QuestCard quest={baseQuest} skills={skills} dragging={false} onDragStart={noop} onDragEnd={noop} onToggleStep={noop} onDelete={noop} onUpdate={noop} onSetCompleted={noop} />);
    expect(screen.queryByText('Guitar')).not.toBeInTheDocument();
  });

  it('calls onUpdate when a skill is linked from the expanded picker', async () => {
    const onUpdate = vi.fn();
    render(<QuestCard quest={baseQuest} skills={skills} dragging={false} onDragStart={noop} onDragEnd={noop} onToggleStep={noop} onDelete={noop} onUpdate={onUpdate} onSetCompleted={noop} />);
    await userEvent.click(screen.getByLabelText('Expand quest "Learn Guitar"'));
    await userEvent.selectOptions(screen.getByLabelText('Linked skill'), 'sk1');
    expect(onUpdate).toHaveBeenCalledWith('q1', { linkedSkillId: 'sk1' });
  });

  it('lets the title and description be edited from the expanded card', async () => {
    const onUpdate = vi.fn();
    render(<QuestCard quest={baseQuest} dragging={false} onDragStart={noop} onDragEnd={noop} onToggleStep={noop} onDelete={noop} onUpdate={onUpdate} onSetCompleted={noop} />);
    await userEvent.click(screen.getByLabelText('Expand quest "Learn Guitar"'));

    await userEvent.click(screen.getByLabelText('Edit quest "Learn Guitar"'));
    const titleInput = screen.getByLabelText('Quest title');
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, 'Master Guitar');
    const descInput = screen.getByLabelText('Quest description');
    await userEvent.clear(descInput);
    await userEvent.type(descInput, 'Practice weekly');
    await userEvent.click(screen.getByText('Save'));

    expect(onUpdate).toHaveBeenCalledWith('q1', { title: 'Master Guitar', description: 'Practice weekly' });
  });
});
