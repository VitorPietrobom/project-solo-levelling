import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WeeklyNutritionChart from './WeeklyNutritionChart';

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPut = vi.fn();
vi.mock('../lib/apiClient', () => ({
  apiClient: {
    get: (...args: any[]) => mockGet(...args),
    post: (...args: any[]) => mockPost(...args),
    put: (...args: any[]) => mockPut(...args),
  },
}));

// A Wednesday, so the week runs Mon 2026-08-17 .. Sun 2026-08-23.
const WED = '2026-08-19';

function targetResponse(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    date: WED,
    weekStart: '2026-08-17',
    weekEnd: '2026-08-23',
    nextRecalibration: '2026-08-24',
    tdee: 2500,
    source: 'adaptive',
    daysOfData: 14,
    goal: 'cut',
    calorieDelta: -500,
    weightKg: 82,
    target: { calories: 2000, protein: 150, carbs: 200, fat: 70 },
    adherence: { proteinMet: false, caloriesOk: true, eligible: false, claimed: false, xp: 25 },
    suggestion: null,
    ...overrides,
  };
}

function mockWeek(
  entriesByDate: Record<string, { calories: number; protein: number; carbs: number; fat: number }[]>,
  target = targetResponse(),
  settings = { goal: 'cut', adjust: 'steady', calorieDelta: -500, proteinPerKg: 1.8, fallbackCalories: 2200 },
) {
  mockGet.mockImplementation((url: string) => {
    if (url.startsWith('/api/nutrition/target')) return Promise.resolve(target);
    if (url === '/api/nutrition/settings') return Promise.resolve(settings);
    const date = url.split('date=')[1];
    return Promise.resolve(entriesByDate[date] ?? []);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPost.mockResolvedValue({ awarded: false });
  mockPut.mockResolvedValue({});
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

  it('shows the goal chip and week range', async () => {
    mockWeek({});
    render(<WeeklyNutritionChart selectedDate={WED} onSelectDate={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Cut')).toBeInTheDocument());
    expect(screen.getByText(/Aug 17.*Aug 23/)).toBeInTheDocument();
  });

  it('shows the adaptive TDEE line', async () => {
    mockWeek({});
    render(<WeeklyNutritionChart selectedDate={WED} onSelectDate={vi.fn()} />);
    await waitFor(() => expect(screen.getByText(/Adaptive TDEE 2500 kcal/)).toBeInTheDocument());
  });

  it('prompts to hit targets when not yet eligible for the XP claim', async () => {
    mockWeek({});
    render(<WeeklyNutritionChart selectedDate={WED} onSelectDate={vi.fn()} />);
    await waitFor(() => expect(screen.getByText(/Hit ~90% protein/)).toBeInTheDocument());
    expect(screen.getByText('Claim XP')).toBeDisabled();
  });

  it('claims XP when eligible and targets are met', async () => {
    mockWeek({}, targetResponse({ adherence: { proteinMet: true, caloriesOk: true, eligible: true, claimed: false, xp: 25 } }));
    mockPost.mockResolvedValue({ awarded: true, xp: 25 });
    render(<WeeklyNutritionChart selectedDate={WED} onSelectDate={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Claim XP')).toBeInTheDocument());

    await userEvent.click(screen.getByText('Claim XP'));

    await waitFor(() => expect(mockPost).toHaveBeenCalledWith('/api/nutrition/claim', { body: { date: WED } }));
  });

  it('shows claimed status once the day\'s XP has been claimed', async () => {
    mockWeek({}, targetResponse({ adherence: { proteinMet: true, caloriesOk: true, eligible: true, claimed: true, xp: 25 } }));
    render(<WeeklyNutritionChart selectedDate={WED} onSelectDate={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Done')).toBeInTheDocument());
    expect(screen.queryByText('Claim XP')).not.toBeInTheDocument();
  });

  it('refetches the week and the target when refreshKey changes, without waiting for a remount', async () => {
    mockWeek({ [WED]: [{ calories: 1500, protein: 100, carbs: 150, fat: 50 }] });
    const { rerender } = render(<WeeklyNutritionChart selectedDate={WED} onSelectDate={vi.fn()} refreshKey={0} />);
    await waitFor(() => expect(screen.getByText('1500')).toBeInTheDocument());

    mockWeek({ [WED]: [{ calories: 1800, protein: 130, carbs: 150, fat: 50 }] });
    rerender(<WeeklyNutritionChart selectedDate={WED} onSelectDate={vi.fn()} refreshKey={1} />);

    await waitFor(() => expect(screen.getByText('1800')).toBeInTheDocument());
  });

  it('opens the settings panel and saves a goal change', async () => {
    mockWeek({});
    mockPut.mockResolvedValue({ goal: 'bulk', adjust: 'steady', calorieDelta: 300, proteinPerKg: 1.8, fallbackCalories: 2200 });
    render(<WeeklyNutritionChart selectedDate={WED} onSelectDate={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Adjust')).toBeInTheDocument());

    await userEvent.click(screen.getByText('Adjust'));
    await userEvent.click(await screen.findByText('Bulk'));

    await waitFor(() => expect(mockPut).toHaveBeenCalledWith('/api/nutrition/settings', { body: { goal: 'bulk', calorieDelta: 300 } }));
  });
});
