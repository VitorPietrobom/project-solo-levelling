import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RecipeList from './RecipeList';
import type { Recipe } from './RecipeList';

const sampleRecipes: Recipe[] = [
  {
    id: 'r1',
    name: 'Chicken Salad',
    steps: 'Mix ingredients together.',
    caloriesPerServing: 350,
    ingredients: [
      { id: 'i1', name: 'Chicken', quantity: '200', unit: 'g' },
      { id: 'i2', name: 'Lettuce', quantity: '100', unit: 'g' },
    ],
  },
  {
    id: 'r2',
    name: 'Protein Shake',
    steps: 'Blend all ingredients.',
    caloriesPerServing: 200,
    ingredients: [
      { id: 'i3', name: 'Whey Protein', quantity: '1', unit: 'scoop' },
    ],
  },
];

describe('RecipeList', () => {
  it('renders recipe cards with name, calories, and ingredient count', () => {
    render(
      <RecipeList recipes={sampleRecipes} onSelect={vi.fn()} onDelete={vi.fn()} searchTerm="" onSearchChange={vi.fn()} />,
    );
    expect(screen.getByText('Chicken Salad')).toBeInTheDocument();
    expect(screen.getByText('350 kcal/serving')).toBeInTheDocument();
    expect(screen.getByText('2 ingredients')).toBeInTheDocument();
    expect(screen.getByText('Protein Shake')).toBeInTheDocument();
    expect(screen.getByText('1 ingredient')).toBeInTheDocument();
  });

  it('shows empty state when no recipes and no search', () => {
    render(
      <RecipeList recipes={[]} onSelect={vi.fn()} onDelete={vi.fn()} searchTerm="" onSearchChange={vi.fn()} />,
    );
    expect(screen.getByText('No recipes yet. Create one to get started.')).toBeInTheDocument();
  });

  it('shows search-specific empty state when no results', () => {
    render(
      <RecipeList recipes={[]} onSelect={vi.fn()} onDelete={vi.fn()} searchTerm="xyz" onSearchChange={vi.fn()} />,
    );
    expect(screen.getByText('No recipes match your search.')).toBeInTheDocument();
  });

  it('calls onSelect when clicking a recipe card', async () => {
    const onSelect = vi.fn();
    render(
      <RecipeList recipes={sampleRecipes} onSelect={onSelect} onDelete={vi.fn()} searchTerm="" onSearchChange={vi.fn()} />,
    );
    await userEvent.click(screen.getByLabelText('View recipe: Chicken Salad'));
    expect(onSelect).toHaveBeenCalledWith('r1');
  });

  it('calls onDelete when clicking delete button', async () => {
    const onDelete = vi.fn();
    render(
      <RecipeList recipes={sampleRecipes} onSelect={vi.fn()} onDelete={onDelete} searchTerm="" onSearchChange={vi.fn()} />,
    );
    await userEvent.click(screen.getByLabelText('Delete recipe: Chicken Salad'));
    expect(onDelete).toHaveBeenCalledWith('r1');
  });

  it('calls onSearchChange when typing in search input', async () => {
    const onSearchChange = vi.fn();
    render(
      <RecipeList recipes={sampleRecipes} onSelect={vi.fn()} onDelete={vi.fn()} searchTerm="" onSearchChange={onSearchChange} />,
    );
    await userEvent.type(screen.getByLabelText('Search recipes'), 'chicken');
    expect(onSearchChange).toHaveBeenCalled();
  });

  it('renders search input with current search term', () => {
    render(
      <RecipeList recipes={sampleRecipes} onSelect={vi.fn()} onDelete={vi.fn()} searchTerm="salad" onSearchChange={vi.fn()} />,
    );
    expect(screen.getByLabelText('Search recipes')).toHaveValue('salad');
  });
});
