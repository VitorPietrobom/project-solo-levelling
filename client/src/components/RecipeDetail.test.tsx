import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RecipeDetail from './RecipeDetail';
import type { Recipe } from './RecipeList';

const sampleRecipe: Recipe = {
  id: 'r1',
  name: 'Chicken Salad',
  steps: '1. Cook chicken\n2. Chop lettuce\n3. Mix together',
  caloriesPerServing: 350,
  ingredients: [
    { id: 'i1', name: 'Chicken', quantity: '200', unit: 'g' },
    { id: 'i2', name: 'Lettuce', quantity: '100', unit: 'g' },
    { id: 'i3', name: 'Dressing', quantity: '2', unit: 'tbsp' },
  ],
};

describe('RecipeDetail', () => {
  it('renders full recipe details', () => {
    render(<RecipeDetail recipe={sampleRecipe} onClose={vi.fn()} />);
    expect(screen.getByText('Chicken Salad')).toBeInTheDocument();
    expect(screen.getByText('350 kcal/serving')).toBeInTheDocument();
    expect(screen.getByText('200 g Chicken')).toBeInTheDocument();
    expect(screen.getByText('100 g Lettuce')).toBeInTheDocument();
    expect(screen.getByText('2 tbsp Dressing')).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes('Cook chicken') && content.includes('Mix together'))).toBeInTheDocument();
  });

  it('shows not-found state when recipe is null', () => {
    render(<RecipeDetail recipe={null} onClose={vi.fn()} />);
    expect(screen.getByText('Recipe not found.')).toBeInTheDocument();
  });

  it('calls onClose when clicking back button', async () => {
    const onClose = vi.fn();
    render(<RecipeDetail recipe={sampleRecipe} onClose={onClose} />);
    await userEvent.click(screen.getByLabelText('Close recipe detail'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('shows empty ingredients message when recipe has no ingredients', () => {
    const emptyRecipe: Recipe = { ...sampleRecipe, ingredients: [] };
    render(<RecipeDetail recipe={emptyRecipe} onClose={vi.fn()} />);
    expect(screen.getByText('No ingredients listed.')).toBeInTheDocument();
  });
});
