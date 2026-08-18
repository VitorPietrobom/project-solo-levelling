import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HabitRow from './HabitRow';
import type { Quest } from './QuestList';

const habit: Quest = {
  id: 'h1', title: 'Drink water', description: null, xpReward: 25,
  priority: 'medium', dueDate: null, linkedSkillId: null, recurrence: 'daily', completed: false, steps: [],
};

const skills = [{ id: 'sk1', name: 'Hydration', totalXP: 0, level: 0, progress: { current: 0, required: 100, percentage: 0 } }];

const noop = () => {};

describe('HabitRow', () => {
  it('toggles complete/undo', async () => {
    const onToggle = vi.fn();
    render(<HabitRow habit={habit} skills={[]} onToggle={onToggle} onSave={noop} onDelete={noop} />);
    await userEvent.click(screen.getByTitle('Mark complete'));
    expect(onToggle).toHaveBeenCalledWith('h1', true);
  });

  it('shows undo once completed', () => {
    render(<HabitRow habit={{ ...habit, completed: true }} skills={[]} onToggle={noop} onSave={noop} onDelete={noop} />);
    expect(screen.getByTitle('Click to undo')).toBeInTheDocument();
  });

  it('shows the linked skill name', () => {
    render(<HabitRow habit={{ ...habit, linkedSkillId: 'sk1' }} skills={skills} onToggle={noop} onSave={noop} onDelete={noop} />);
    expect(screen.getByText(/Hydration/)).toBeInTheDocument();
  });

  it('edits and saves the title, XP, recurrence, and linked skill', async () => {
    const onSave = vi.fn();
    render(<HabitRow habit={habit} skills={skills} onToggle={noop} onSave={onSave} onDelete={noop} />);

    await userEvent.click(screen.getByLabelText('Edit habit "Drink water"'));
    const input = screen.getByLabelText('Habit title');
    await userEvent.clear(input);
    await userEvent.type(input, 'Drink 3L water');
    await userEvent.selectOptions(screen.getByLabelText('Recurrence'), 'weekly');
    await userEvent.selectOptions(screen.getByLabelText('Linked skill'), 'sk1');
    await userEvent.click(screen.getByText('Save'));

    expect(onSave).toHaveBeenCalledWith('h1', { title: 'Drink 3L water', xpReward: 25, recurrence: 'weekly', linkedSkillId: 'sk1' });
  });

  it('cancels edit without saving', async () => {
    const onSave = vi.fn();
    render(<HabitRow habit={habit} skills={[]} onToggle={noop} onSave={onSave} onDelete={noop} />);
    await userEvent.click(screen.getByLabelText('Edit habit "Drink water"'));
    await userEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByLabelText('Habit title')).not.toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('deletes', async () => {
    const onDelete = vi.fn();
    render(<HabitRow habit={habit} skills={[]} onToggle={noop} onSave={noop} onDelete={onDelete} />);
    await userEvent.click(screen.getByLabelText('Delete habit "Drink water"'));
    expect(onDelete).toHaveBeenCalledWith('h1', 'Drink water');
  });
});
