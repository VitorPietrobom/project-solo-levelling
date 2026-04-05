import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TrainingProgramForm from './TrainingProgramForm';

describe('TrainingProgramForm', () => {
  it('renders form with name input and one day by default', () => {
    render(<TrainingProgramForm onCreated={vi.fn()} />);
    expect(screen.getByLabelText('Program name')).toBeInTheDocument();
    expect(screen.getByLabelText('Day 1 of week')).toBeInTheDocument();
    expect(screen.getByLabelText('Exercise 1 name')).toBeInTheDocument();
  });

  it('shows error when name is empty', async () => {
    render(<TrainingProgramForm onCreated={vi.fn()} />);
    await userEvent.click(screen.getByText('Create Program'));
    expect(screen.getByText('Program name is required')).toBeInTheDocument();
  });

  it('shows error when no exercises have names', async () => {
    render(<TrainingProgramForm onCreated={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('Program name'), 'My Program');
    await userEvent.click(screen.getByText('Create Program'));
    expect(screen.getByText('At least one day with at least one exercise is required')).toBeInTheDocument();
  });

  it('calls onCreated with optimistic program and body on valid submit', async () => {
    const onCreated = vi.fn();
    render(<TrainingProgramForm onCreated={onCreated} />);

    await userEvent.type(screen.getByLabelText('Program name'), 'PPL');
    await userEvent.type(screen.getByLabelText('Exercise 1 name'), 'Bench Press');

    await userEvent.click(screen.getByText('Create Program'));

    expect(onCreated).toHaveBeenCalledTimes(1);
    const [optimistic, body] = onCreated.mock.calls[0];

    expect(optimistic.name).toBe('PPL');
    expect(optimistic.id).toMatch(/^temp-/);
    expect(optimistic.active).toBe(false);
    expect(optimistic.days).toHaveLength(1);
    expect(optimistic.days[0].dayOfWeek).toBe('mon');
    expect(optimistic.days[0].exercises[0].name).toBe('Bench Press');

    expect(body.name).toBe('PPL');
    expect(body.days[0].exercises[0].sets).toBe(3);
    expect(body.days[0].exercises[0].reps).toBe(10);
  });

  it('can add and remove days', async () => {
    render(<TrainingProgramForm onCreated={vi.fn()} />);

    await userEvent.click(screen.getByText('+ Add day'));
    expect(screen.getAllByText('Remove day')).toHaveLength(2);

    await userEvent.click(screen.getAllByText('Remove day')[0]);
    expect(screen.queryAllByText('Remove day')).toHaveLength(0);
  });

  it('can add and remove exercises within a day', async () => {
    render(<TrainingProgramForm onCreated={vi.fn()} />);

    await userEvent.click(screen.getByText('+ Add exercise'));
    expect(screen.getByLabelText('Exercise 2 name')).toBeInTheDocument();

    await userEvent.click(screen.getAllByLabelText(/Remove exercise/)[0]);
    expect(screen.queryByLabelText('Exercise 2 name')).not.toBeInTheDocument();
  });

  it('resets form after successful submit', async () => {
    render(<TrainingProgramForm onCreated={vi.fn()} />);

    await userEvent.type(screen.getByLabelText('Program name'), 'PPL');
    await userEvent.type(screen.getByLabelText('Exercise 1 name'), 'Squat');
    await userEvent.click(screen.getByText('Create Program'));

    expect(screen.getByLabelText('Program name')).toHaveValue('');
  });
});
