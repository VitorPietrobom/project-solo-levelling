import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FoodEntryForm from './FoodEntryForm';

describe('FoodEntryForm', () => {
  const onCreated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all form fields', () => {
    render(<FoodEntryForm onCreated={onCreated} />);
    expect(screen.getByLabelText('Food name')).toBeInTheDocument();
    expect(screen.getByLabelText('Calories')).toBeInTheDocument();
    expect(screen.getByLabelText('Meal type')).toBeInTheDocument();
    expect(screen.getByLabelText('Entry date')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log Food' })).toBeInTheDocument();
  });

  it('calls onCreated with optimistic entry on valid submit', async () => {
    render(<FoodEntryForm onCreated={onCreated} />);

    await userEvent.type(screen.getByLabelText('Food name'), 'Chicken Breast');
    await userEvent.type(screen.getByLabelText('Calories'), '250');
    await userEvent.click(screen.getByRole('button', { name: 'Log Food' }));

    expect(onCreated).toHaveBeenCalledTimes(1);
    const [optimistic, body] = onCreated.mock.calls[0];
    expect(optimistic.id).toMatch(/^temp-/);
    expect(optimistic.foodName).toBe('Chicken Breast');
    expect(optimistic.calories).toBe(250);
    expect(optimistic.mealType).toBe('breakfast');
    expect(body.foodName).toBe('Chicken Breast');
    expect(body.calories).toBe(250);
    expect(body.mealType).toBe('breakfast');
  });

  it('shows error when food name is empty', async () => {
    render(<FoodEntryForm onCreated={onCreated} />);
    await userEvent.type(screen.getByLabelText('Calories'), '100');
    await userEvent.click(screen.getByRole('button', { name: 'Log Food' }));

    expect(screen.getByText('Food name is required')).toBeInTheDocument();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('shows error when calories is empty', async () => {
    render(<FoodEntryForm onCreated={onCreated} />);
    await userEvent.type(screen.getByLabelText('Food name'), 'Rice');
    await userEvent.click(screen.getByRole('button', { name: 'Log Food' }));

    expect(screen.getByText('Calories must be a non-negative number')).toBeInTheDocument();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('allows selecting different meal types', async () => {
    render(<FoodEntryForm onCreated={onCreated} />);

    await userEvent.selectOptions(screen.getByLabelText('Meal type'), 'dinner');
    await userEvent.type(screen.getByLabelText('Food name'), 'Pasta');
    await userEvent.type(screen.getByLabelText('Calories'), '400');
    await userEvent.click(screen.getByRole('button', { name: 'Log Food' }));

    const [optimistic] = onCreated.mock.calls[0];
    expect(optimistic.mealType).toBe('dinner');
  });

  it('resets food name and calories after submit', async () => {
    render(<FoodEntryForm onCreated={onCreated} />);

    await userEvent.type(screen.getByLabelText('Food name'), 'Banana');
    await userEvent.type(screen.getByLabelText('Calories'), '90');
    await userEvent.click(screen.getByRole('button', { name: 'Log Food' }));

    expect((screen.getByLabelText('Food name') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('Calories') as HTMLInputElement).value).toBe('');
  });

  it('generates optimistic id with temp prefix', async () => {
    render(<FoodEntryForm onCreated={onCreated} />);

    await userEvent.type(screen.getByLabelText('Food name'), 'Yogurt');
    await userEvent.type(screen.getByLabelText('Calories'), '150');
    await userEvent.click(screen.getByRole('button', { name: 'Log Food' }));

    const optimistic = onCreated.mock.calls[0][0];
    expect(optimistic.id).toMatch(/^temp-/);
  });
});
