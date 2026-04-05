import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CalorieTracker from './CalorieTracker';
import type { FoodEntry } from './CalorieTracker';

const entries: FoodEntry[] = [
  { id: '1', foodName: 'Oatmeal', calories: 300, mealType: 'breakfast', date: '2024-01-15' },
  { id: '2', foodName: 'Chicken Salad', calories: 500, mealType: 'lunch', date: '2024-01-15' },
  { id: '3', foodName: 'Steak', calories: 700, mealType: 'dinner', date: '2024-01-15' },
  { id: '4', foodName: 'Apple', calories: 100, mealType: 'snack', date: '2024-01-15' },
];

describe('CalorieTracker', () => {
  const onGoalChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders total calories and goal', () => {
    render(<CalorieTracker entries={entries} calorieGoal={2000} onGoalChange={onGoalChange} />);
    expect(screen.getByTestId('total-calories')).toHaveTextContent('1600');
    expect(screen.getByText('/ 2000 kcal')).toBeInTheDocument();
  });

  it('shows remaining calories when under goal', () => {
    render(<CalorieTracker entries={entries} calorieGoal={2000} onGoalChange={onGoalChange} />);
    expect(screen.getByTestId('remaining-calories')).toHaveTextContent('400 left');
  });

  it('shows over calories when exceeding goal', () => {
    render(<CalorieTracker entries={entries} calorieGoal={1000} onGoalChange={onGoalChange} />);
    expect(screen.getByTestId('remaining-calories')).toHaveTextContent('600 over');
  });

  it('displays breakdown by meal type', () => {
    render(<CalorieTracker entries={entries} calorieGoal={2000} onGoalChange={onGoalChange} />);
    expect(screen.getByTestId('breakfast-calories')).toHaveTextContent('300 kcal');
    expect(screen.getByTestId('lunch-calories')).toHaveTextContent('500 kcal');
    expect(screen.getByTestId('dinner-calories')).toHaveTextContent('700 kcal');
    expect(screen.getByTestId('snack-calories')).toHaveTextContent('100 kcal');
  });

  it('shows zero breakdown for empty entries', () => {
    render(<CalorieTracker entries={[]} calorieGoal={2000} onGoalChange={onGoalChange} />);
    expect(screen.getByTestId('total-calories')).toHaveTextContent('0');
    expect(screen.getByTestId('breakfast-calories')).toHaveTextContent('0 kcal');
    expect(screen.getByTestId('remaining-calories')).toHaveTextContent('2000 left');
  });

  it('renders editable goal input', () => {
    render(<CalorieTracker entries={entries} calorieGoal={2000} onGoalChange={onGoalChange} />);
    expect(screen.getByLabelText('Daily calorie goal')).toHaveValue(2000);
  });

  it('calls onGoalChange when goal is updated', async () => {
    render(<CalorieTracker entries={entries} calorieGoal={2000} onGoalChange={onGoalChange} />);
    const input = screen.getByLabelText('Daily calorie goal');
    // Type a digit — since the input is controlled, it appends to the existing value
    await userEvent.type(input, '5');
    expect(onGoalChange).toHaveBeenCalledWith(20005);
  });

  it('renders a progress bar', () => {
    render(<CalorieTracker entries={entries} calorieGoal={2000} onGoalChange={onGoalChange} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});
