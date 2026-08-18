import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TaskForm from './TaskForm';

describe('TaskForm', () => {
  const onCreated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders form fields', () => {
    render(<TaskForm onCreated={onCreated} />);
    expect(screen.getByLabelText('Task title')).toBeInTheDocument();
    expect(screen.getByLabelText('Daily')).toBeInTheDocument();
    expect(screen.getByLabelText('Weekly')).toBeInTheDocument();
    expect(screen.getByText('Create Task')).toBeInTheDocument();
  });

  it('calls onCreated with optimistic task on submit', async () => {
    render(<TaskForm onCreated={onCreated} />);

    await userEvent.type(screen.getByLabelText('Task title'), 'Morning run');
    await userEvent.click(screen.getByText('Create Task'));

    expect(onCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Morning run',
        recurrence: 'daily',
        xpReward: 25,
        completedToday: false,
        lastCompletedAt: null,
      }),
      { title: 'Morning run', recurrence: 'daily', xpReward: 25 },
    );
  });

  it('shows validation error when title is empty', async () => {
    render(<TaskForm onCreated={onCreated} />);
    await userEvent.click(screen.getByText('Create Task'));

    expect(screen.getByText('Title is required')).toBeInTheDocument();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('can select weekly recurrence', async () => {
    render(<TaskForm onCreated={onCreated} />);

    await userEvent.type(screen.getByLabelText('Task title'), 'Weekly review');
    await userEvent.click(screen.getByLabelText('Weekly'));
    await userEvent.click(screen.getByText('Create Task'));

    expect(onCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Weekly review',
        recurrence: 'weekly',
      }),
      expect.objectContaining({ recurrence: 'weekly' }),
    );
  });

  it('resets form after successful submit', async () => {
    render(<TaskForm onCreated={onCreated} />);

    await userEvent.type(screen.getByLabelText('Task title'), 'Test task');
    await userEvent.click(screen.getByText('Create Task'));

    expect((screen.getByLabelText('Task title') as HTMLInputElement).value).toBe('');
  });

  describe('edit mode', () => {
    const existing = {
      id: 't1', title: 'Morning run', recurrence: 'daily' as const, xpReward: 25,
      completedToday: false, lastCompletedAt: null, linkedSkillId: null,
    };

    it('prefills the fields from the given task', () => {
      render(<TaskForm task={existing} onSave={vi.fn()} onCancel={vi.fn()} />);
      expect((screen.getByLabelText('Task title') as HTMLInputElement).value).toBe('Morning run');
      expect(screen.getByLabelText('Daily')).toBeChecked();
      expect(screen.getByText('Save')).toBeInTheDocument();
    });

    it('calls onSave with the edited fields, not onCreated', async () => {
      const onSave = vi.fn();
      render(<TaskForm task={existing} onSave={onSave} onCancel={vi.fn()} onCreated={onCreated} />);

      const input = screen.getByLabelText('Task title');
      await userEvent.clear(input);
      await userEvent.type(input, 'Evening run');
      await userEvent.click(screen.getByText('Save'));

      expect(onSave).toHaveBeenCalledWith('t1', { title: 'Evening run', recurrence: 'daily', xpReward: 25, linkedSkillId: null });
      expect(onCreated).not.toHaveBeenCalled();
    });

    it('calls onCancel', async () => {
      const onCancel = vi.fn();
      render(<TaskForm task={existing} onSave={vi.fn()} onCancel={onCancel} />);
      await userEvent.click(screen.getByText('Cancel'));
      expect(onCancel).toHaveBeenCalled();
    });
  });
});
