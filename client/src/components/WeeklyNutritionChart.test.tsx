import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WeeklyNutritionChart from './WeeklyNutritionChart';

const mockGet = vi.fn();
vi.mock('../lib/apiClient', () => ({
  apiClient: { get: (...args: any[]) => mockGet(...args) },
}));

// A Wednesday, so the week runs Mon 2026-08-17 .. Sun 2026-08-23.
const WED = '2026-08-19';

function mockWeek(entriesByDate: Record<string, { calories: number; protein: number; carbs: number; fat: number }[]>, target = { calories: 2000, protein: 150, carbs: 200, fat: 70 }) {
  mockGet.mockImplementation((url: string) => {
    if (url.startsWith('/api/nutrition/target')) return Promise.resolve({ target });
    const date = url.split('date=')[1];
    return Promise.resolve(entriesByDate[date] ?? []);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('WeeklyNutritionChart', () => {
  it('shows the selected day\'s totals against the weekly target', async () => {
    mockWeek({ [WED]: [{ calories: 1500, protein: 100, carbs: 150, fat: 50 }] });
    render(<WeeklyNutritionChart selectedDate={WED} onSelectDate={vi.fn()} />);

    await waitFor(() => expect(screen.getByText('1500')).toBeInTheDocument());
    expect(screen.getByText('of 2000')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('of 150')).toBeInTheDocument();
  });

  it('switches to remaining budget when the toggle is clicked', async () => {
    mockWeek({ [WED]: [{ calories: 1500, protein: 100, carbs: 140, fat: 40 }] });
    render(<WeeklyNutritionChart selectedDate={WED} onSelectDate={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('1500')).toBeInTheDocument());

    await userEvent.click(screen.getByText('Remaining'));

    expect(screen.getByText('500')).toBeInTheDocument(); // 2000 - 1500 calories
    expect(screen.getByText('50')).toBeInTheDocument(); // 150 - 100 protein
    expect(screen.getByText('60')).toBeInTheDocument(); // 200 - 140 carbs
    expect(screen.getByText('30')).toBeInTheDocument(); // 70 - 40 fat
  });

  it('calls onSelectDate when a day column is clicked', async () => {
    mockWeek({});
    const onSelectDate = vi.fn();
    render(<WeeklyNutritionChart selectedDate={WED} onSelectDate={onSelectDate} />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());

    await userEvent.click(screen.getByLabelText('Select Aug 17'));
    expect(onSelectDate).toHaveBeenCalledWith('2026-08-17');
  });

  it('fetches all seven days of the week containing selectedDate', async () => {
    mockWeek({});
    render(<WeeklyNutritionChart selectedDate={WED} onSelectDate={vi.fn()} />);
    await waitFor(() => expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('2026-08-23')));
    for (const d of ['2026-08-17', '2026-08-18', '2026-08-19', '2026-08-20', '2026-08-21', '2026-08-22', '2026-08-23']) {
      expect(mockGet).toHaveBeenCalledWith(`/api/food-entries?date=${d}`);
    }
  });
});
