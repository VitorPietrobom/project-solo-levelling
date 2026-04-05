import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MealPrepForm from './MealPrepForm';
import type { Recipe } from './RecipeList';

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
});
