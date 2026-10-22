import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MealPrepForm from './MealPrepForm';
import type { Recipe } from './RecipeList';
import type { MealPrepPlanData } from './MealPrepPlan';
import { currentMonday } from '../lib/localDate';

const sampleRecipes: Recipe[] = [
  { id: 'r1', name: 'Oatmeal', steps: 'Cook oats', caloriesPerServing: 300, ingredients: [] },
  { id: 'r2', name: 'Chicken Salad', steps: 'Mix', caloriesPerServing: 450, ingredients: [] },
];

describe('MealPrepForm', () => {
  it('renders the form with week start date and recipe dropdowns', () => {
    render(<MealPrepForm recipes={sampleRecipes} onCreated={vi.fn()} />);
    expect(screen.getByLabelText('Week start date')).toBeInTheDocument();
    expect(screen.getByText('Create Plan')).toBeInTheDocument();
    // Should have dropdowns for each day × meal type (7 × 4 = 28)
    expect(screen.getByLabelText('Mon Breakfast recipe')).toBeInTheDocument();
    expect(screen.getByLabelText('Sun Snack recipe')).toBeInTheDocument();
  });

  it('shows error when no recipes are assigned', async () => {
    render(<MealPrepForm recipes={sampleRecipes} onCreated={vi.fn()} />);
    await userEvent.click(screen.getByText('Create Plan'));
    expect(screen.getByText('Assign at least one recipe to a meal slot')).toBeInTheDocument();
  });

  it('submits with selected recipes', async () => {
    const onCreated = vi.fn();
    render(<MealPrepForm recipes={sampleRecipes} onCreated={onCreated} />);

    await userEvent.selectOptions(screen.getByLabelText('Mon Breakfast recipe'), 'r1');
    await userEvent.click(screen.getByText('Create Plan'));

    expect(onCreated).toHaveBeenCalledOnce();
    const body = onCreated.mock.calls[0][0];
    expect(body.entries).toHaveLength(1);
    expect(body.entries[0]).toEqual({ dayOfWeek: 'mon', mealType: 'breakfast', recipeId: 'r1' });
    expect(body.weekStartDate).toBeTruthy();
  });

  it('shows message when no recipes exist', () => {
    render(<MealPrepForm recipes={[]} onCreated={vi.fn()} />);
    expect(screen.getByText(/Create some recipes first/)).toBeInTheDocument();
  });

  it('pre-fills from the existing plan so adding a slot keeps the others', async () => {
    const plan: MealPrepPlanData = {
      id: 'p1',
      weekStartDate: `${currentMonday()}T00:00:00.000Z`,
      entries: [
        { id: 'e1', dayOfWeek: 'tue', mealType: 'lunch', recipeId: 'r2', recipe: { id: 'r2', name: 'Chicken Salad', caloriesPerServing: 450, ingredients: [] } },
      ],
    };
    const onCreated = vi.fn();
    render(<MealPrepForm recipes={sampleRecipes} existingPlan={plan} onCreated={onCreated} />);
    expect(screen.getByLabelText('Tue Lunch recipe')).toHaveValue('r2');

    await userEvent.selectOptions(screen.getByLabelText('Mon Breakfast recipe'), 'r1');
    await userEvent.click(screen.getByText('Create Plan'));
    expect(onCreated.mock.calls[0][0].entries).toHaveLength(2);
  });

  it('snaps a picked date to that week\'s Monday', () => {
    render(<MealPrepForm recipes={sampleRecipes} onCreated={vi.fn()} />);
    const input = screen.getByLabelText('Week start date');
    fireEvent.change(input, { target: { value: '2026-10-22' } });
    expect(input).toHaveValue('2026-10-19');
  });
});
