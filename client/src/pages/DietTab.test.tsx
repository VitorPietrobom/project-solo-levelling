import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DietTab from './DietTab';
import { localISODate } from '../lib/localDate';

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockDelete = vi.fn();
vi.mock('../lib/apiClient', () => ({
  apiClient: {
    get: (...args: any[]) => mockGet(...args),
    post: (...args: any[]) => mockPost(...args),
    delete: (...args: any[]) => mockDelete(...args),
  },
  errorMessage: (_err: any, fallback: string) => fallback,
}));

// Stable across renders: DietTab's fetch callbacks depend on showToast.
const toast = { showToast: vi.fn() };
vi.mock('../contexts/ToastContext', () => ({
  useToast: () => toast,
}));

const today = localISODate();
const optimistic = {
  id: 'temp-1', foodName: 'Oats', calories: 300, protein: 0, carbs: 0, fat: 0,
  mealType: 'breakfast', date: today,
};
vi.mock('../components/FoodEntryForm', () => ({
  default: ({ onCreated }: any) => (
    <button onClick={() => onCreated(optimistic, { foodName: 'Oats', calories: 300, mealType: 'breakfast', date: today })}>
      submit-food
    </button>
  ),
}));
vi.mock('../components/FoodEntryImport', () => ({ default: () => <div /> }));
vi.mock('../components/BarcodeFoodForm', () => ({ default: () => <div /> }));
vi.mock('../components/MealPrepPlan', () => ({
  default: ({ plan, onRemoveEntry }: any) => (
    <div>
      {plan?.entries.map((e: any) => (
        <button key={e.id} onClick={() => onRemoveEntry?.(e.id)}>remove-{e.recipeId}</button>
      ))}
    </div>
  ),
}));
vi.mock('../components/MealPrepForm', () => ({ default: () => <div /> }));
vi.mock('../components/MealPlanImport', () => ({ default: () => <div /> }));
vi.mock('../components/GroceryList', () => ({ default: () => <div /> }));
vi.mock('../components/WeeklyNutritionChart', () => ({ default: () => <div /> }));
vi.mock('../components/NutritionAiPrompt', () => ({ default: () => <div /> }));

beforeEach(() => {
  vi.clearAllMocks();
  mockGet.mockImplementation((url: string) => Promise.resolve(url.startsWith('/api/food-entries') ? [] : null));
  mockDelete.mockResolvedValue({});
});

describe('DietTab optimistic food entries', () => {
  it('disables delete on a temp row until the real id arrives', async () => {
    let resolvePost!: (v: any) => void;
    mockPost.mockReturnValue(new Promise((r) => { resolvePost = r; }));
    render(<DietTab />);
    await userEvent.click(await screen.findByText('+ Log Food'));
    await userEvent.click(screen.getByText('submit-food'));

    const del = await screen.findByLabelText('Delete Oats');
    expect(del).toBeDisabled();
    await userEvent.click(del);
    expect(mockDelete).not.toHaveBeenCalled();

    resolvePost({ ...optimistic, id: 'real-1' });
    await waitFor(() => expect(screen.getByLabelText('Delete Oats')).not.toBeDisabled());
    await userEvent.click(screen.getByLabelText('Delete Oats'));
    expect(mockDelete).toHaveBeenCalledWith('/api/food-entries/real-1');
  });
});

describe('DietTab meal-prep removals (OE-040)', () => {
  const entry = (id: string, recipeId: string) => ({ id, dayOfWeek: 'monday', mealType: 'lunch', recipeId });
  const plan = { id: 'p1', weekStartDate: '2026-10-19', entries: [entry('e1', 'a'), entry('e2', 'b'), entry('e3', 'c')] };

  beforeEach(() => {
    mockGet.mockImplementation((url: string) =>
      Promise.resolve(url.startsWith('/api/food-entries') ? [] : url === '/api/meal-prep' ? plan : null));
  });

  it('serializes rapid removals and ignores a stale response', async () => {
    const resolvers: ((v: any) => void)[] = [];
    mockPost.mockImplementation(() => new Promise((r) => { resolvers.push(r); }));
    render(<DietTab />);
    await userEvent.click(await screen.findByText('remove-a'));
    await userEvent.click(screen.getByText('remove-b'));

    // The second POST waits for the first.
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('remove-b')).toBeNull();

    resolvers[0]({ ...plan, entries: [entry('n2', 'b'), entry('n3', 'c')] });
    await waitFor(() => expect(mockPost).toHaveBeenCalledTimes(2));
    // The stale first response must not bring "b" back.
    expect(screen.queryByText('remove-b')).toBeNull();
    expect(mockPost.mock.calls[1][1].body.entries.map((e: any) => e.recipeId)).toEqual(['c']);

    resolvers[1]({ ...plan, entries: [entry('n4', 'c')] });
    await waitFor(() => expect(screen.getByText('remove-c')).toBeInTheDocument());
    expect(screen.queryByText('remove-a')).toBeNull();
  });

  it('refetches the plan on failure instead of restoring a stale snapshot', async () => {
    mockPost.mockRejectedValue(new Error('boom'));
    render(<DietTab />);
    await userEvent.click(await screen.findByText('remove-a'));
    await waitFor(() => expect(toast.showToast).toHaveBeenCalledWith('Failed to remove meal'));
    expect(mockGet.mock.calls.filter((c) => c[0] === '/api/meal-prep')).toHaveLength(2);
  });
});
