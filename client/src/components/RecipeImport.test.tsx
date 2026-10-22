import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RecipeImport from './RecipeImport';

function importJson(json: string) {
  const onImport = vi.fn();
  render(<RecipeImport onImport={onImport} />);
  fireEvent.change(screen.getByLabelText('Recipe JSON import'), { target: { value: json } });
  fireEvent.click(screen.getByRole('button', { name: 'Import Recipe' }));
  return onImport;
}

describe('RecipeImport', () => {
  it('rounds calories and cleans ingredients', () => {
    const onImport = importJson(JSON.stringify({
      name: 'Pasta', steps: '1. Cook', caloriesPerServing: '412.5',
      ingredients: [{ name: 'Flour', quantity: 200, unit: 'g' }, { quantity: '1' }, { name: 5 }, null, { name: 'Salt' }],
    }));
    const [optimistic, body] = onImport.mock.calls[0];
    expect(body.caloriesPerServing).toBe(413);
    expect(optimistic.caloriesPerServing).toBe(413);
    expect(body.ingredients).toEqual([
      { name: 'Flour', quantity: '200', unit: 'g' },
      { name: 'Salt', quantity: '', unit: '' },
    ]);
    expect(optimistic.ingredients).toHaveLength(2);
  });

  it('defaults invalid calories to 0', () => {
    const onImport = importJson(JSON.stringify({ name: 'A', steps: 'x', caloriesPerServing: 'lots' }));
    expect(onImport.mock.calls[0][1]).toMatchObject({ caloriesPerServing: 0, ingredients: [] });
  });
});
