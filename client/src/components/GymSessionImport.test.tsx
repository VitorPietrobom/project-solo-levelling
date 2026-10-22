import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GymSessionImport, { validateHevyImport } from './GymSessionImport';

const valid = {
  date: '2026-10-01',
  notes: 'Push',
  exercises: [{ name: 'Bench', sets: '3', reps: 10, weight: 80, muscleGroups: 'Chest' }],
};

function paste(text: string) {
  fireEvent.change(screen.getByLabelText('Hevy JSON import'), { target: { value: text } });
  fireEvent.click(screen.getByText('Import Session'));
}

describe('validateHevyImport', () => {
  it('coerces numeric strings and a single muscle-group string', () => {
    expect(validateHevyImport(valid)).toEqual({
      ok: true,
      body: {
        date: '2026-10-01',
        notes: 'Push',
        exercises: [{ name: 'Bench', sets: 3, reps: 10, weight: 80, muscleGroups: ['chest'] }],
      },
    });
  });

  it.each([
    [{ ...valid, date: 'yesterday' }, /date/],
    [{ ...valid, exercises: [{ ...valid.exercises[0], sets: 0 }] }, /"sets"/],
    [{ ...valid, exercises: [{ ...valid.exercises[0], reps: 2.5 }] }, /"reps"/],
    [{ ...valid, exercises: [{ ...valid.exercises[0], weight: -1 }] }, /"weight"/],
    [{ ...valid, exercises: [{ ...valid.exercises[0], muscleGroups: ['pecs'] }] }, /unknown muscle group "pecs"/],
    [{ ...valid, exercises: [{ ...valid.exercises[0], muscleGroups: { a: 1 } }] }, /"muscleGroups" must be a list/],
    [{ ...valid, exercises: [{ ...valid.exercises[0], name: ' ' }] }, /"name" is required/],
  ])('rejects invalid input %#', (input, msg) => {
    const r = validateHevyImport(input);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(msg);
  });
});

describe('GymSessionImport', () => {
  it('shows a specific inline error and keeps the pasted JSON', () => {
    const onImport = vi.fn();
    render(<GymSessionImport onImport={onImport} />);
    const text = JSON.stringify({ ...valid, exercises: [{ ...valid.exercises[0], muscleGroups: 42 }] });
    paste(text);
    expect(screen.getByText(/"muscleGroups" must be a list/)).toBeInTheDocument();
    expect(screen.queryByText(/Invalid JSON/)).toBeNull();
    expect(screen.getByLabelText('Hevy JSON import')).toHaveValue(text);
    expect(onImport).not.toHaveBeenCalled();
  });

  it('submits the coerced body', () => {
    const onImport = vi.fn();
    render(<GymSessionImport onImport={onImport} />);
    paste(JSON.stringify(valid));
    expect(onImport).toHaveBeenCalledTimes(1);
    expect(onImport.mock.calls[0][1].exercises[0]).toEqual({
      name: 'Bench', sets: 3, reps: 10, weight: 80, muscleGroups: ['chest'],
    });
  });
});
