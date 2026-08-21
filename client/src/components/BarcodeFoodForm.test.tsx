import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BarcodeFoodForm from './BarcodeFoodForm';

const mockGet = vi.fn();
const mockPost = vi.fn();
vi.mock('../lib/apiClient', () => ({
  apiClient: {
    get: (...args: any[]) => mockGet(...args),
    post: (...args: any[]) => mockPost(...args),
  },
  errorMessage: (_err: any, fallback: string) => fallback,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('BarcodeFoodForm', () => {
  it('looks up the barcode and prefills the product name and scaled macros', async () => {
    mockGet.mockResolvedValue({
      found: true, foodName: 'Peanut Butter',
      caloriesPer100g: 588, proteinPer100g: 25, carbsPer100g: 20, fatPer100g: 50,
      servingGrams: 32,
    });
    render(<BarcodeFoodForm code="0123456789012" onCreated={vi.fn()} onCancel={vi.fn()} />);

    expect(mockGet).toHaveBeenCalledWith('/api/food-entries/barcode/0123456789012');
    await waitFor(() => expect(screen.getByLabelText('Food name')).toHaveValue('Peanut Butter'));
    expect(screen.getByLabelText('Grams eaten')).toHaveValue(32);
    // 588 * 0.32 ≈ 188 kcal, 25 * 0.32 = 8g protein
    expect(screen.getByText(/188 kcal/)).toBeInTheDocument();
    expect(screen.getByText(/P 8g/)).toBeInTheDocument();
  });

  it('rescales macros when the gram amount is edited', async () => {
    mockGet.mockResolvedValue({
      found: true, foodName: 'Rice', caloriesPer100g: 130, proteinPer100g: 3, carbsPer100g: 28, fatPer100g: 0.3,
      servingGrams: null,
    });
    render(<BarcodeFoodForm code="111" onCreated={vi.fn()} onCancel={vi.fn()} />);
    await waitFor(() => expect(screen.getByLabelText('Grams eaten')).toHaveValue(100));

    const gramsInput = screen.getByLabelText('Grams eaten');
    await userEvent.clear(gramsInput);
    await userEvent.type(gramsInput, '200');

    expect(screen.getByText(/260 kcal/)).toBeInTheDocument();
  });

  it('shows a not-found message for an unknown barcode', async () => {
    mockGet.mockResolvedValue({ found: false });
    render(<BarcodeFoodForm code="999" onCreated={vi.fn()} onCancel={vi.fn()} />);
    await waitFor(() => expect(screen.getByText(/Product not found/)).toBeInTheDocument());
  });

  it('lets the user add an unrecognized product (per-100g label) and continue straight to logging it', async () => {
    mockGet.mockResolvedValue({ found: false });
    mockPost.mockResolvedValue({
      found: true, source: 'custom', foodName: 'Homemade Bread',
      caloriesPer100g: 265, proteinPer100g: 9, carbsPer100g: 49, fatPer100g: 3.2, servingGrams: null,
    });
    render(<BarcodeFoodForm code="0123456789012" onCreated={vi.fn()} onCancel={vi.fn()} />);
    await waitFor(() => expect(screen.getByText(/Product not found/)).toBeInTheDocument());

    await userEvent.click(screen.getByText('+ Add this product'));
    await userEvent.type(screen.getByLabelText('Product name'), 'Homemade Bread');
    // Serving size defaults to 100g, so entered values pass straight through.
    await userEvent.type(screen.getByLabelText('Calories per serving'), '265');
    await userEvent.type(screen.getByLabelText('Protein per serving'), '9');
    await userEvent.type(screen.getByLabelText('Carbs per serving'), '49');
    await userEvent.type(screen.getByLabelText('Fat per serving'), '3.2');
    await userEvent.click(screen.getByText('Save & Continue'));

    expect(mockPost).toHaveBeenCalledWith('/api/food-entries/barcode/0123456789012', {
      body: { foodName: 'Homemade Bread', caloriesPer100g: 265, proteinPer100g: 9, carbsPer100g: 49, fatPer100g: 3.2 },
    });
    // Falls through to the normal found-product flow, ready to log.
    await waitFor(() => expect(screen.getByText('Log Food')).toBeInTheDocument());
    expect(screen.getByLabelText('Food name')).toHaveValue('Homemade Bread');
  });

  it('scales a per-serving label (not per-100g) up to per-100g before saving', async () => {
    mockGet.mockResolvedValue({ found: false });
    mockPost.mockResolvedValue({
      found: true, source: 'custom', foodName: 'Protein Bar',
      caloriesPer100g: 400, proteinPer100g: 40, carbsPer100g: 30, fatPer100g: 13.3, servingGrams: null,
    });
    render(<BarcodeFoodForm code="555" onCreated={vi.fn()} onCancel={vi.fn()} />);
    await waitFor(() => expect(screen.getByText(/Product not found/)).toBeInTheDocument());

    await userEvent.click(screen.getByText('+ Add this product'));
    await userEvent.type(screen.getByLabelText('Product name'), 'Protein Bar');
    // Label says: per 30g bar — 120 kcal, 12g protein, 9g carbs, 4g fat.
    const servingInput = screen.getByLabelText('Serving size in grams');
    await userEvent.clear(servingInput);
    await userEvent.type(servingInput, '30');
    await userEvent.type(screen.getByLabelText('Calories per serving'), '120');
    await userEvent.type(screen.getByLabelText('Protein per serving'), '12');
    await userEvent.type(screen.getByLabelText('Carbs per serving'), '9');
    await userEvent.type(screen.getByLabelText('Fat per serving'), '4');
    await userEvent.click(screen.getByText('Save & Continue'));

    // Scaled to per-100g: x(100/30) ≈ 400 kcal, 40g protein, 30g carbs, 13.3g fat.
    expect(mockPost).toHaveBeenCalledWith('/api/food-entries/barcode/555', {
      body: { foodName: 'Protein Bar', caloriesPer100g: 400, proteinPer100g: 40, carbsPer100g: 30, fatPer100g: 13.3 },
    });
  });

  it('requires a food name before saving a new product', async () => {
    mockGet.mockResolvedValue({ found: false });
    render(<BarcodeFoodForm code="999" onCreated={vi.fn()} onCancel={vi.fn()} />);
    await waitFor(() => expect(screen.getByText(/Product not found/)).toBeInTheDocument());

    await userEvent.click(screen.getByText('+ Add this product'));
    await userEvent.type(screen.getByLabelText('Calories per serving'), '200');
    await userEvent.click(screen.getByText('Save & Continue'));

    expect(screen.getByText('Food name is required')).toBeInTheDocument();
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('requires a positive serving size before saving a new product', async () => {
    mockGet.mockResolvedValue({ found: false });
    render(<BarcodeFoodForm code="999" onCreated={vi.fn()} onCancel={vi.fn()} />);
    await waitFor(() => expect(screen.getByText(/Product not found/)).toBeInTheDocument());

    await userEvent.click(screen.getByText('+ Add this product'));
    await userEvent.type(screen.getByLabelText('Product name'), 'X');
    const servingInput = screen.getByLabelText('Serving size in grams');
    await userEvent.clear(servingInput);
    await userEvent.type(screen.getByLabelText('Calories per serving'), '200');
    await userEvent.click(screen.getByText('Save & Continue'));

    expect(screen.getByText('Serving size must be a positive number of grams')).toBeInTheDocument();
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('calls onCreated with the scaled macros on submit', async () => {
    mockGet.mockResolvedValue({
      found: true, foodName: 'Peanut Butter',
      caloriesPer100g: 588, proteinPer100g: 25, carbsPer100g: 20, fatPer100g: 50,
      servingGrams: 32,
    });
    const onCreated = vi.fn();
    render(<BarcodeFoodForm code="0123456789012" defaultDate="2026-08-20" onCreated={onCreated} onCancel={vi.fn()} />);
    await waitFor(() => expect(screen.getByLabelText('Food name')).toHaveValue('Peanut Butter'));

    await userEvent.click(screen.getByText('Log Food'));

    expect(onCreated).toHaveBeenCalledWith(
      expect.objectContaining({ foodName: 'Peanut Butter', calories: 188, protein: 8, mealType: 'breakfast', date: '2026-08-20' }),
      expect.objectContaining({ foodName: 'Peanut Butter', calories: 188, protein: 8 }),
    );
  });

  it('calls onCancel when Cancel is clicked', async () => {
    mockGet.mockResolvedValue({ found: false });
    const onCancel = vi.fn();
    render(<BarcodeFoodForm code="999" onCreated={vi.fn()} onCancel={onCancel} />);
    await waitFor(() => expect(screen.getByText(/Product not found/)).toBeInTheDocument());

    await userEvent.click(screen.getByLabelText('Cancel barcode entry'));
    expect(onCancel).toHaveBeenCalled();
  });
});
