import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuestForm from './QuestForm';

describe('QuestForm', () => {
  const onCreated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders one-time quest fields by default', () => {
    render(<QuestForm onCreated={onCreated} />);
    expect(screen.getByLabelText('Quest title')).toBeInTheDocument();
    expect(screen.getByLabelText('Quest description')).toBeInTheDocument();
    expect(screen.getByLabelText('Step 1')).toBeInTheDocument();
    expect(screen.getByText('Create Quest')).toBeInTheDocument();
  });

  it('calls onCreated with the optimistic quest and body on submit', async () => {
    render(<QuestForm onCreated={onCreated} />);

    await userEvent.type(screen.getByLabelText('Quest title'), 'My Quest');
    await userEvent.type(screen.getByLabelText('Quest description'), 'A description');
    await userEvent.type(screen.getByLabelText('Step 1'), 'First step');
    await userEvent.click(screen.getByText('Create Quest'));

    expect(onCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'My Quest',
        description: 'A description',
        xpReward: 50,
        priority: 'medium',
        dueDate: null,
        recurrence: null,
        completed: false,
        linkedSkillId: null,
        steps: [expect.objectContaining({ description: 'First step', completed: false })],
      }),
      expect.objectContaining({
        title: 'My Quest',
        description: 'A description',
        steps: ['First step'],
        xpReward: 50,
        priority: 'medium',
        recurrence: null,
      }),
    );
  });

  it('submits the chosen priority and due date', async () => {
    render(<QuestForm onCreated={onCreated} />);

    await userEvent.type(screen.getByLabelText('Quest title'), 'My Quest');
    await userEvent.type(screen.getByLabelText('Quest description'), 'A description');
    await userEvent.type(screen.getByLabelText('Step 1'), 'First step');
    await userEvent.click(screen.getByRole('radio', { name: 'High' }));
    await userEvent.click(screen.getByText('Create Quest'));

    expect(onCreated).toHaveBeenCalledWith(
      expect.objectContaining({ priority: 'high' }),
      expect.objectContaining({ priority: 'high' }),
    );
  });

  it('submits a linked skill when one is chosen', async () => {
    const skills = [{ id: 'sk1', name: 'Guitar', totalXP: 0, level: 0, progress: { current: 0, required: 100, percentage: 0 } }];
    render(<QuestForm onCreated={onCreated} skills={skills} />);

    await userEvent.type(screen.getByLabelText('Quest title'), 'My Quest');
    await userEvent.type(screen.getByLabelText('Quest description'), 'A description');
    await userEvent.type(screen.getByLabelText('Step 1'), 'First step');
    await userEvent.selectOptions(screen.getByLabelText(/Link to skill/), 'sk1');
    await userEvent.click(screen.getByText('Create Quest'));

    expect(onCreated).toHaveBeenCalledWith(
      expect.objectContaining({ linkedSkillId: 'sk1' }),
      expect.objectContaining({ linkedSkillId: 'sk1' }),
    );
  });

  it('shows validation error when title is empty', async () => {
    render(<QuestForm onCreated={onCreated} />);
    await userEvent.type(screen.getByLabelText('Step 1'), 'A step');
    await userEvent.click(screen.getByText('Create Quest'));

    expect(screen.getByText('Title is required')).toBeInTheDocument();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('shows validation error when a one-time quest has no steps', async () => {
    render(<QuestForm onCreated={onCreated} />);
    await userEvent.type(screen.getByLabelText('Quest title'), 'My Quest');
    await userEvent.click(screen.getByText('Create Quest'));

    expect(screen.getByText('One-time quests need a description and at least one step')).toBeInTheDocument();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('can add and remove steps', async () => {
    render(<QuestForm onCreated={onCreated} />);
    await userEvent.click(screen.getByText('+ Add step'));

    expect(screen.getByLabelText('Step 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Step 2')).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText('Remove step 2'));
    expect(screen.queryByLabelText('Step 2')).not.toBeInTheDocument();
  });

  describe('recurring (habit) mode', () => {
    it('hides description, steps, priority, and due date once Daily/Weekly is picked', async () => {
      render(<QuestForm onCreated={onCreated} />);
      await userEvent.click(screen.getByRole('radio', { name: 'Daily' }));

      expect(screen.queryByLabelText('Quest description')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Step 1')).not.toBeInTheDocument();
      expect(screen.queryByRole('radiogroup', { name: 'Priority' })).not.toBeInTheDocument();
      expect(screen.getByText('Create Habit')).toBeInTheDocument();
    });

    it('creates a recurring habit with no description or steps required', async () => {
      render(<QuestForm onCreated={onCreated} />);
      await userEvent.type(screen.getByLabelText('Quest title'), 'Drink water');
      await userEvent.click(screen.getByRole('radio', { name: 'Weekly' }));
      await userEvent.click(screen.getByText('Create Habit'));

      expect(onCreated).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Drink water', recurrence: 'weekly', description: null, steps: [] }),
        expect.objectContaining({ title: 'Drink water', recurrence: 'weekly' }),
      );
      const body = onCreated.mock.calls[0][1];
      expect(body.description).toBeUndefined();
      expect(body.steps).toBeUndefined();
    });
  });
});
