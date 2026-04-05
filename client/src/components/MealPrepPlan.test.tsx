import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MealPrepPlan from './MealPrepPlan';
import type { MealPrepPlanData } from './MealPrepPlan';

const samplePlan: MealPrepPlanData = {
  id: 'plan-1',
  weekStartDate: '2024-01-08',
  entries: [
    {
      id: 'e1',
      dayOfWeek: 'mon',
      mealType: 'breakfast',
      recipeId: 'r1',
      recipe: { id: 'r1', name: 'Oatmeal', caloriesPerServing: 300, ingredients: [] },
    },
    {
      id: 'e2',
      dayOfWeek: 'mon',
      mealType: 'lunch',
      recipeId: 'r2',
      recipe: { id: 'r2', name: 'Chicken Salad', caloriesPerServing: 450, ingredients: [] },
    },
    {
      id: 'e3',
      dayOfWeek: 'wed',
      mealType: 'dinner',
      recipeId: 'r3',
      recipe: { id: 'r3', name: 'Pasta', caloriesPerServing: 600, ingredients: [] },
    },
  ],
};

describe('MealPrepPlan', () => {
  it('shows empty state when plan is null', () => {
    render(<MealPrepPlan plan={null} onSelectDay={vi.fn()} selectedDay={null} />);
    expect(screen.getByText(/No meal prep plan for this week/)).toBeInTheDocument();
  });

  it('renders recipe names in the correct grid cells', () => {
    render(<MealPrepPlan plan={samplePlan} onSelectDay={vi.fn()} selectedDay={null} />);
    expect(screen.getByTestId('cell-mon-breakfast')).toHaveTextContent('Oatmeal');
    expect(screen.getByTestId('cell-mon-lunch')).toHaveTextContent('Chicken Salad');
    expect(screen.getByTestId('cell-wed-dinner')).toHaveTextContent('Pasta');
    // Empty cell shows dash
    expect(screen.getByTestId('cell-tue-breakfast')).toHaveTextContent('—');
  });

  it('displays daily calorie totals', () => {
    render(<MealPrepPlan plan={samplePlan} onSelectDay={vi.fn()} selectedDay={null} />);
    // Mon: 300 + 450 = 750
    expect(screen.getByTestId('calories-mon')).toHaveTextContent('750');
    // Wed: 600
    expect(screen.getByTestId('calories-wed')).toHaveTextContent('600');
    // Tue: 0
    expect(screen.getByTestId('calories-tue')).toHaveTextContent('0');
  });

  it('calls onSelectDay when clicking a day header', async () => {
    const onSelectDay = vi.fn();
    render(<MealPrepPlan plan={samplePlan} onSelectDay={onSelectDay} selectedDay={null} />);
    await userEvent.click(screen.getByLabelText('Select Mon'));
    expect(onSelectDay).toHaveBeenCalledWith('mon');
  });

  it('highlights the selected day column', () => {
    render(<MealPrepPlan plan={samplePlan} onSelectDay={vi.fn()} selectedDay="mon" />);
    const monHeader = screen.getByLabelText('Select Mon');
    expect(monHeader.className).toContain('text-accent-primary');
  });

  it('renders all 7 day columns', () => {
    render(<MealPrepPlan plan={samplePlan} onSelectDay={vi.fn()} selectedDay={null} />);
    for (const day of ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']) {
      expect(screen.getByLabelText(`Select ${day}`)).toBeInTheDocument();
    }
  });
});
