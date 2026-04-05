import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RecipeForm from './RecipeForm';

describe('RecipeForm', () => {
  it('submits a valid recipe with optimistic object', async () => {
    const onCreated = vi.fn();
    render(<RecipeForm onCreated={onCreated} />);

    await userEvent.type(screen.getByLabelText('Recipe name'), 'Pasta');
    await userEvent.type(screen.getByLabelText('Preparation steps'), 'Boil water. Cook pasta.');
    await userEvent.type(screen.getByLabelText('Calories per serving'), '400');
    await userEvent.type(screen.getByLabelText('Ingredient 1 name'), 'Pasta');
    await userEvent.type(screen.getByLabelText('Ingredient 1 quantity'), '200');
    await userEvent.type(screen.getByLabelText('Ingredient 1 unit'), 'g');

    await userEvent.click(screen.getByText('Create Recipe'));

    expect(onCreated).toHaveBeenCalledOnce();
    const [optimistic, body] = onCreated.mock.calls[0];

    expect(optimistic.id).toMatch(/^temp-/);
    expect(optimistic.name).toBe('Pasta');
    expect(optimistic.steps).toBe('Boil water. Cook pasta.');
    expect(optimistic.caloriesPerServing).toBe(400);
    expect(optimistic.ingredients).toHaveLength(1);
    expect(optimistic.ingredients[0].name).toBe('Pasta');

    expect(body.name).toBe('Pasta');
    expect(body.ingredients).toHaveLength(1);
  });

  it('shows error when name is empty', async () => {
    render(<RecipeForm onCreated={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('Preparation steps'), 'Some steps');
    await userEvent.type(screen.getByLabelText('Calories per serving'), '100');
    await userEvent.click(screen.getByText('Create Recipe'));
    expect(screen.getByText('Recipe name is required')).toBeInTheDocument();
  });

  it('shows error when steps are empty', async () => {
    render(<RecipeForm onCreated={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('Recipe name'), 'Test');
    await userEvent.type(screen.getByLabelText('Calories per serving'), '100');
    await userEvent.click(screen.getByText('Create Recipe'));
    expect(screen.getByText('Steps are required')).toBeInTheDocument();
  });

  it('shows error when calories is invalid', async () => {
    render(<RecipeForm onCreated={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('Recipe name'), 'Test');
    await userEvent.type(screen.getByLabelText('Preparation steps'), 'Steps');
    await userEvent.click(screen.getByText('Create Recipe'));
    expect(screen.getByText('Calories per serving must be a non-negative number')).toBeInTheDocument();
  });

  it('can add and remove ingredient rows', async () => {
    render(<RecipeForm onCreated={vi.fn()} />);

    // Starts with 1 ingredient row
    expect(screen.getByLabelText('Ingredient 1 name')).toBeInTheDocument();

    // Add another
    await userEvent.click(screen.getByText('+ Add ingredient'));
    expect(screen.getByLabelText('Ingredient 2 name')).toBeInTheDocument();

    // Remove the first
    await userEvent.click(screen.getByLabelText('Remove ingredient 1'));
    expect(screen.queryByLabelText('Ingredient 2 name')).not.toBeInTheDocument();
  });

  it('filters out empty ingredient rows on submit', async () => {
    const onCreated = vi.fn();
    render(<RecipeForm onCreated={onCreated} />);

    await userEvent.type(screen.getByLabelText('Recipe name'), 'Test');
    await userEvent.type(screen.getByLabelText('Preparation steps'), 'Steps');
    await userEvent.type(screen.getByLabelText('Calories per serving'), '100');
    // Leave ingredient 1 name empty
    await userEvent.click(screen.getByText('Create Recipe'));

    const [optimistic] = onCreated.mock.calls[0];
    expect(optimistic.ingredients).toHaveLength(0);
  });

  it('resets form after successful submit', async () => {
    render(<RecipeForm onCreated={vi.fn()} />);

    await userEvent.type(screen.getByLabelText('Recipe name'), 'Pasta');
    await userEvent.type(screen.getByLabelText('Preparation steps'), 'Cook it');
    await userEvent.type(screen.getByLabelText('Calories per serving'), '400');
    await userEvent.click(screen.getByText('Create Recipe'));

    expect(screen.getByLabelText('Recipe name')).toHaveValue('');
    expect(screen.getByLabelText('Preparation steps')).toHaveValue('');
    expect(screen.getByLabelText('Calories per serving')).toHaveValue(null);
  });
});
