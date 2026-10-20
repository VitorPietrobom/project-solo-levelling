import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FoodEntryImport, { normalizeFoodEntry } from './FoodEntryImport';

function importJson(json: string) {
  const onImport = vi.fn();
  render(<FoodEntryImport onImport={onImport} defaultDate="2026-01-02" />);
  fireEvent.change(screen.getByLabelText('Food JSON import'), { target: { value: json } });
  fireEvent.click(screen.getByRole('button', { name: 'Import Food Entries' }));
  return onImport;
}

describe('normalizeFoodEntry', () => {
  it('rounds calories, coerces macros and lowercases mealType', () => {
    expect(normalizeFoodEntry({ foodName: ' Rice ', calories: '212.5', protein: '4.3', carbs: 45, mealType: 'Lunch' })).toEqual({
      fields: { foodName: 'Rice', calories: 213, protein: 4.3, carbs: 45, fat: 0, mealType: 'lunch' },
    });
  });

  it('defaults mealType to snack and maps synonyms', () => {
    expect(normalizeFoodEntry({ foodName: 'A', calories: 1 })).toMatchObject({ fields: { mealType: 'snack' } });
    expect(normalizeFoodEntry({ foodName: 'A', calories: 1, mealType: 'Supper' })).toMatchObject({ fields: { mealType: 'dinner' } });
  });

  it('rejects missing names, bad numbers and unknown meal types', () => {
    expect(normalizeFoodEntry({ calories: 100 })).toHaveProperty('error');
    expect(normalizeFoodEntry({ foodName: 'A', calories: 'lots' })).toHaveProperty('error');
    expect(normalizeFoodEntry({ foodName: 'A', calories: -5 })).toHaveProperty('error');
    expect(normalizeFoodEntry({ foodName: 'A', calories: 1, mealType: 'elevenses' })).toHaveProperty('error');
  });
});

describe('FoodEntryImport', () => {
  it('accepts a top-level array and posts normalized bodies', () => {
    const onImport = importJson(JSON.stringify([
      { foodName: 'Rice', calories: 212.5, mealType: 'Lunch' },
      { foodName: 'Egg', calories: 70 },
    ]));
    expect(onImport).toHaveBeenCalledTimes(1);
    const rows = onImport.mock.calls[0][0];
    expect(rows).toHaveLength(2);
    expect(rows[0].body).toMatchObject({ foodName: 'Rice', calories: 213, mealType: 'lunch', date: '2026-01-02' });
    expect(rows[1].body).toMatchObject({ mealType: 'snack' });
  });

  it('shows invalid entries in the error area and posts nothing', () => {
    const onImport = importJson(JSON.stringify({ entries: [{ foodName: 'Ok', calories: 1 }, { calories: 100 }] }));
    expect(onImport).not.toHaveBeenCalled();
    expect(screen.getByText(/Entry 2: missing foodName/)).toBeInTheDocument();
  });
});
