import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import GroceryList from './GroceryList';
import type { GroceryListData } from './GroceryList';

const sampleData: GroceryListData = {
  ingredients: [
    { name: 'Chicken', quantity: '200', unit: 'g' },
    { name: 'Rice', quantity: '1', unit: 'cup' },
    { name: 'Broccoli', quantity: '150', unit: 'g' },
  ],
  totalCalories: 850,
};

describe('GroceryList', () => {
  it('shows empty state when data is null', () => {
    render(<GroceryList data={null} day="mon" />);
    expect(screen.getByText(/Select a day from the meal plan/)).toBeInTheDocument();
  });

  it('renders ingredient list and total calories', () => {
    render(<GroceryList data={sampleData} day="mon" />);
    expect(screen.getByText(/200 g Chicken/)).toBeInTheDocument();
    expect(screen.getByText(/1 cup Rice/)).toBeInTheDocument();
    expect(screen.getByText(/150 g Broccoli/)).toBeInTheDocument();
    expect(screen.getByTestId('grocery-total-calories')).toHaveTextContent('850 kcal');
  });

  it('shows day label in the header', () => {
    render(<GroceryList data={sampleData} day="wed" />);
    expect(screen.getByText(/Wednesday/)).toBeInTheDocument();
  });

  it('shows empty ingredients message when list is empty', () => {
    const emptyData: GroceryListData = { ingredients: [], totalCalories: 0 };
    render(<GroceryList data={emptyData} day="fri" />);
    expect(screen.getByText('No ingredients for this day.')).toBeInTheDocument();
  });
});
