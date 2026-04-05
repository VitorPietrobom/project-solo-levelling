import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GymSessionForm from './GymSessionForm';

describe('GymSessionForm', () => {
  const onCreated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders form fields', () => {
    render(<GymSessionForm onCreated={onCreated} />);
    expect(screen.getByLabelText('Session date')).toBeInTheDocument();
    expect(screen.getByLabelText('Session notes')).toBeInTheDocument();
    expect(screen.getByLabelText('Exercise 1 name')).toBeInTheDocument();
    expect(screen.getByLabelText('Exercise 1 sets')).toBeInTheDocument();
    expect(screen.getByLabelText('Exercise 1 reps')).toBeInTheDocument();
    expect(screen.getByLabelText('Exercise 1 weight')).toBeInTheDocument();
    expect(screen.getByText('Log Session')).toBeInTheDocument();
  });

  it('renders muscle group toggle buttons', () => {
    render(<GymSessionForm onCreated={onCreated} />);
    expect(screen.getByLabelText('Toggle chest for exercise 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Toggle back for exercise 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Toggle abs for exercise 1')).toBeInTheDocument();
  });

  it('adds and removes exercise rows', async () => {
    render(<GymSessionForm onCreated={onCreated} />);

    await userEvent.click(screen.getByText('+ Add Exercise'));
    expect(screen.getByLabelText('Exercise 2 name')).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText('Remove exercise 2'));
    expect(screen.queryByLabelText('Exercise 2 name')).not.toBeInTheDocument();
  });

  it('calls onCreated with optimistic session on valid submit', async () => {
    render(<GymSessionForm onCreated={onCreated} />);

    await userEvent.type(screen.getByLabelText('Exercise 1 name'), 'Bench Press');
    await userEvent.type(screen.getByLabelText('Exercise 1 sets'), '4');
    await userEvent.type(screen.getByLabelText('Exercise 1 reps'), '8');
    await userEvent.type(screen.getByLabelText('Exercise 1 weight'), '80');
    await userEvent.click(screen.getByLabelText('Toggle chest for exercise 1'));
    await userEvent.click(screen.getByText('Log Session'));

    expect(onCreated).toHaveBeenCalledTimes(1);
    const [optimistic, body] = onCreated.mock.calls[0];
    expect(optimistic.id).toMatch(/^temp-/);
    expect(optimistic.exercises).toHaveLength(1);
    expect(optimistic.exercises[0].name).toBe('Bench Press');
    expect(optimistic.exercises[0].muscleGroups).toEqual([{ muscleGroup: 'chest' }]);
    expect(body.exercises[0].muscleGroups).toEqual(['chest']);
  });

  it('shows error when exercise name is empty', async () => {
    render(<GymSessionForm onCreated={onCreated} />);

    await userEvent.type(screen.getByLabelText('Exercise 1 sets'), '4');
    await userEvent.type(screen.getByLabelText('Exercise 1 reps'), '8');
    await userEvent.type(screen.getByLabelText('Exercise 1 weight'), '80');
    await userEvent.click(screen.getByText('Log Session'));

    expect(screen.getByText('All exercises must have a name')).toBeInTheDocument();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('generates optimistic id with temp prefix', async () => {
    render(<GymSessionForm onCreated={onCreated} />);

    await userEvent.type(screen.getByLabelText('Exercise 1 name'), 'Squat');
    await userEvent.type(screen.getByLabelText('Exercise 1 sets'), '5');
    await userEvent.type(screen.getByLabelText('Exercise 1 reps'), '5');
    await userEvent.type(screen.getByLabelText('Exercise 1 weight'), '100');
    await userEvent.click(screen.getByText('Log Session'));

    const optimistic = onCreated.mock.calls[0][0];
    expect(optimistic.id).toMatch(/^temp-/);
    expect(optimistic.exercises[0].id).toMatch(/^temp-ex-/);
  });

  it('toggles muscle groups on and off', async () => {
    render(<GymSessionForm onCreated={onCreated} />);

    const chestBtn = screen.getByLabelText('Toggle chest for exercise 1');
    expect(chestBtn).toHaveAttribute('aria-pressed', 'false');

    await userEvent.click(chestBtn);
    expect(chestBtn).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(chestBtn);
    expect(chestBtn).toHaveAttribute('aria-pressed', 'false');
  });

  it('resets form after successful submit', async () => {
    render(<GymSessionForm onCreated={onCreated} />);

    await userEvent.type(screen.getByLabelText('Session notes'), 'Great workout');
    await userEvent.type(screen.getByLabelText('Exercise 1 name'), 'Deadlift');
    await userEvent.type(screen.getByLabelText('Exercise 1 sets'), '3');
    await userEvent.type(screen.getByLabelText('Exercise 1 reps'), '5');
    await userEvent.type(screen.getByLabelText('Exercise 1 weight'), '140');
    await userEvent.click(screen.getByText('Log Session'));

    expect((screen.getByLabelText('Session notes') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('Exercise 1 name') as HTMLInputElement).value).toBe('');
  });
});
