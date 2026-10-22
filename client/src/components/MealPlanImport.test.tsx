import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('../lib/apiClient', () => ({
  apiClient: { post: vi.fn(async () => ({ recipesCreated: 3, mealsScheduled: 21, plan: { id: 'p1' } })) },
}));

import MealPlanImport from './MealPlanImport';

describe('MealPlanImport', () => {
  it('passes the plan and import counts to onImported so the parent can refresh and toast', async () => {
    const onImported = vi.fn();
    render(<MealPlanImport weekStartDate="2026-10-19" onImported={onImported} />);
    fireEvent.change(screen.getByPlaceholderText('{ "recipes": [...], "schedule": [...] }'), {
      target: { value: JSON.stringify({ recipes: [], schedule: [] }) },
    });
    const btn = screen.getAllByRole('button').find((b) => /^import/i.test(b.textContent?.trim() ?? ''))!;
    fireEvent.click(btn);
    await waitFor(() => expect(onImported).toHaveBeenCalledWith({ id: 'p1' }, { recipesCreated: 3, mealsScheduled: 21 }));
  });
});
