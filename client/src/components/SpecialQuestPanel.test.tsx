import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SpecialQuestPanel from './SpecialQuestPanel';

const mockGet = vi.fn();
const mockPatch = vi.fn();
const mockShowToast = vi.fn();
vi.mock('../lib/apiClient', () => ({
  apiClient: {
    get: (...args: any[]) => mockGet(...args),
    patch: (...args: any[]) => mockPatch(...args),
  },
  errorMessage: (_err: any, fallback: string) => fallback,
}));
vi.mock('../contexts/ToastContext', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

const board = {
  daily: [
    { id: 'd-water', category: 'daily', title: 'Drink enough water', description: 'Stay hydrated', xpReward: 10, periodKey: '2026-08-24', completed: false },
  ],
  weekly: [
    { id: 'w-gym-3x', category: 'weekly', title: 'Hit the gym 3 times this week', description: 'Log 3 sessions', xpReward: 50, periodKey: '2026-W35', completed: false },
  ],
  monthly: [
    { id: 'm-finish-book', category: 'monthly', title: 'Read a full book', description: 'Finish a book', xpReward: 120, periodKey: '2026-08', completed: true },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SpecialQuestPanel', () => {
  it('renders daily, weekly, and monthly quests from the board', async () => {
    mockGet.mockResolvedValue(board);
    render(<SpecialQuestPanel />);

    await waitFor(() => expect(screen.getByText('Drink enough water')).toBeInTheDocument());
    expect(screen.getByText('Hit the gym 3 times this week')).toBeInTheDocument();
    expect(screen.getByText('Read a full book')).toBeInTheDocument();
    expect(mockGet).toHaveBeenCalledWith('/api/special-quests');
  });

  it('toggles a quest complete, awards XP via onXpChange, and PATCHes the server', async () => {
    mockGet.mockResolvedValue(board);
    mockPatch.mockResolvedValue({});
    const onXpChange = vi.fn();
    render(<SpecialQuestPanel onXpChange={onXpChange} />);

    await waitFor(() => expect(screen.getByText('Drink enough water')).toBeInTheDocument());
    await userEvent.click(screen.getByLabelText('Mark "Drink enough water" complete'));

    expect(onXpChange).toHaveBeenCalledWith(10, 'Drink enough water');
    expect(mockPatch).toHaveBeenCalledWith('/api/special-quests/d-water', { body: { completed: true } });
    expect(screen.getByLabelText('Mark "Drink enough water" incomplete')).toBeInTheDocument();
  });

  it('un-completing a quest revokes XP', async () => {
    mockGet.mockResolvedValue(board);
    mockPatch.mockResolvedValue({});
    const onXpChange = vi.fn();
    render(<SpecialQuestPanel onXpChange={onXpChange} />);

    await waitFor(() => expect(screen.getByText('Read a full book')).toBeInTheDocument());
    await userEvent.click(screen.getByLabelText('Mark "Read a full book" incomplete'));

    expect(onXpChange).toHaveBeenCalledWith(-120, 'Read a full book');
    expect(mockPatch).toHaveBeenCalledWith('/api/special-quests/m-finish-book', { body: { completed: false } });
  });

  it('reverts optimistic state and shows a toast on failure', async () => {
    mockGet.mockResolvedValue(board);
    mockPatch.mockRejectedValue(new Error('fail'));
    render(<SpecialQuestPanel />);

    await waitFor(() => expect(screen.getByText('Drink enough water')).toBeInTheDocument());
    await userEvent.click(screen.getByLabelText('Mark "Drink enough water" complete'));

    await waitFor(() => expect(screen.getByLabelText('Mark "Drink enough water" complete')).toBeInTheDocument());
  });
});
