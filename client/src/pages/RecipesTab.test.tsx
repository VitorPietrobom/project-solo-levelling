import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RecipesTab from './RecipesTab';

const mockGet = vi.fn();
const mockPost = vi.fn();
vi.mock('../lib/apiClient', () => ({
  apiClient: {
    get: (...args: any[]) => mockGet(...args),
    post: (...args: any[]) => mockPost(...args),
  },
  errorMessage: (_err: any, fallback: string) => fallback,
}));

const mockShowToast = vi.fn();
vi.mock('../contexts/ToastContext', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

vi.mock('../components/RecipeForm', () => ({ default: () => <div /> }));
vi.mock('../components/RecipeImport', () => ({ default: () => <div /> }));
vi.mock('../lib/recipeShare', () => ({ shareRecipe: vi.fn() }));

const recipe = {
  id: 'r1', name: 'Chicken Bowl', steps: 'Cook', caloriesPerServing: 500,
  protein: 40, carbs: 50, fat: 10, ingredients: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGet.mockResolvedValue([recipe]);
});

async function openModal() {
  render(<RecipesTab />);
  await userEvent.click(await screen.findByText('View recipe'));
}

describe('RecipesTab log as eaten', () => {
  it('posts the chosen meal type in lowercase and the local date', async () => {
    mockPost.mockResolvedValue({});
    await openModal();
    await userEvent.selectOptions(screen.getByLabelText('Meal type'), 'Dinner');
    await userEvent.click(screen.getByText('Log as eaten'));

    await waitFor(() => expect(mockPost).toHaveBeenCalled());
    const [url, { body }] = mockPost.mock.calls[0];
    expect(url).toBe('/api/food-entries');
    expect(body.mealType).toBe('dinner');
    const d = new Date();
    const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    expect(body.date).toBe(local);
    expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('Chicken Bowl'));
  });

  it('defaults to a valid lowercase meal type', async () => {
    mockPost.mockResolvedValue({});
    await openModal();
    await userEvent.click(screen.getByText('Log as eaten'));
    await waitFor(() => expect(mockPost).toHaveBeenCalled());
    expect(['breakfast', 'lunch', 'dinner', 'snack']).toContain(mockPost.mock.calls[0][1].body.mealType);
  });

  it('shows a toast and re-enables the button on failure', async () => {
    mockPost.mockRejectedValue(new Error('400'));
    await openModal();
    await userEvent.click(screen.getByText('Log as eaten'));
    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('Failed to log recipe'));
    expect(screen.getByText('Log as eaten').closest('button')).not.toBeDisabled();
  });
});
