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
});
