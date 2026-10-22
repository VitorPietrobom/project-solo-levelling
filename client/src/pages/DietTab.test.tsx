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
vi.mock('../components/MealPrepPlan', () => ({ default: () => <div /> }));
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
