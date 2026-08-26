import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GymSessionForm from './GymSessionForm';

describe('GymSessionForm', () => {
  it('requires at least one named exercise', async () => {
    const onCreated = vi.fn();
    render(<GymSessionForm onCreated={onCreated} />);

    await userEvent.click(screen.getByText('Save Session'));

    expect(screen.getByText('At least one exercise with a name is required')).toBeInTheDocument();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('submits a session with sets/reps/weight and toggled muscle groups', async () => {
    const onCreated = vi.fn();
    render(<GymSessionForm onCreated={onCreated} />);

    await userEvent.type(screen.getByLabelText('Exercise 1 name'), 'Bench Press');
    const sets = screen.getByLabelText('Exercise 1 sets');
    await userEvent.clear(sets);
    await userEvent.type(sets, '4');
    const reps = screen.getByLabelText('Exercise 1 reps');
    await userEvent.clear(reps);
    await userEvent.type(reps, '8');
    const weight = screen.getByLabelText('Exercise 1 weight in kg — 0 for bodyweight');
    await userEvent.clear(weight);
    await userEvent.type(weight, '80');
    await userEvent.click(screen.getByText('chest'));
    await userEvent.click(screen.getByText('triceps'));

    await userEvent.click(screen.getByText('Save Session'));

    expect(onCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        exercises: [expect.objectContaining({ name: 'Bench Press', sets: 4, reps: 8, weight: 80 })],
      }),
      expect.objectContaining({
        exercises: [{ name: 'Bench Press', sets: 4, reps: 8, weight: 80, muscleGroups: ['chest', 'triceps'] }],
      }),
    );
  });

  it('supports multiple exercises and removing one', async () => {
    const onCreated = vi.fn();
    render(<GymSessionForm onCreated={onCreated} />);

    await userEvent.type(screen.getByLabelText('Exercise 1 name'), 'Squat');
    await userEvent.click(screen.getByText('+ Add exercise'));
    await userEvent.type(screen.getByLabelText('Exercise 2 name'), 'Leg Press');
    await userEvent.click(screen.getByLabelText('Remove exercise 2'));

    await userEvent.click(screen.getByText('Save Session'));

    expect(onCreated).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ exercises: [expect.objectContaining({ name: 'Squat' })] }),
    );
  });

  it('defaults weight to 0 for a bodyweight exercise left blank', async () => {
    const onCreated = vi.fn();
    render(<GymSessionForm onCreated={onCreated} />);

    await userEvent.type(screen.getByLabelText('Exercise 1 name'), 'Pull-up');
    const weight = screen.getByLabelText('Exercise 1 weight in kg — 0 for bodyweight');
    await userEvent.clear(weight);
    await userEvent.click(screen.getByText('Save Session'));

    expect(onCreated).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ exercises: [expect.objectContaining({ weight: 0 })] }),
    );
  });
});
