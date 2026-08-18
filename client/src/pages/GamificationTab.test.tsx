import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GamificationTab from './GamificationTab';

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();
const mockDelete = vi.fn();
vi.mock('../lib/apiClient', () => ({
  apiClient: {
    get: (...args: any[]) => mockGet(...args),
    post: (...args: any[]) => mockPost(...args),
    patch: (...args: any[]) => mockPatch(...args),
    delete: (...args: any[]) => mockDelete(...args),
  },
}));

const addXP = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useOutletContext: () => ({
      status: { level: 4, totalXP: 900, streak: 5, hunterName: 'Shadow', progress: { current: 100, required: 500, percentage: 20 } },
      addXP,
    }),
  };
});

const quest = {
  id: 'q1', title: 'Learn Guitar', description: 'Practice daily', xpReward: 100,
  priority: 'medium', dueDate: null, completed: false,
  steps: [
    { id: 's1', description: 'Buy a guitar', sortOrder: 0, completed: false },
    { id: 's2', description: 'Learn chords', sortOrder: 1, completed: false },
  ],
};
const task = { id: 't1', title: 'Morning run', recurrence: 'daily', xpReward: 25, completedToday: false, lastCompletedAt: null, linkedSkillId: null };

beforeEach(() => {
  vi.clearAllMocks();
  mockGet.mockImplementation((url: string) => {
    if (url === '/api/quests') return Promise.resolve([quest]);
    if (url === '/api/tasks') return Promise.resolve([task]);
    if (url === '/api/skills') return Promise.resolve([]);
    if (url === '/api/gamification/status') return Promise.resolve({ level: 4, totalXP: 900, streak: 5, hunterName: 'Shadow', progress: { current: 100, required: 500, percentage: 20 } });
    return Promise.resolve([]);
  });
  mockPost.mockResolvedValue({});
  mockPatch.mockResolvedValue({});
  mockDelete.mockResolvedValue({});
});

describe('GamificationTab', () => {
  it('shows the personalized hunter name, rank, and real streak on the hero card', async () => {
    render(<GamificationTab />);
    await waitFor(() => expect(screen.getByText('Shadow')).toBeInTheDocument());
    expect(screen.getByText('E-Rank')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument(); // streak stat
  });

  it('renders quest cards collapsed — step text is not visible until expanded', async () => {
    render(<GamificationTab />);
    await waitFor(() => expect(screen.getByText('Learn Guitar')).toBeInTheDocument());
    expect(screen.queryByText('Buy a guitar')).not.toBeInTheDocument();
  });

  it('deleting a task opens a confirmation and calls DELETE on confirm', async () => {
    render(<GamificationTab />);
    await waitFor(() => expect(screen.getByText('Morning run')).toBeInTheDocument());

    await userEvent.click(screen.getByLabelText('Delete task "Morning run"'));
    expect(screen.getByText(/Delete "Morning run"/)).toBeInTheDocument();

    await userEvent.click(screen.getByText('Delete'));
    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith('/api/tasks/t1'));
  });

  it('dropping a quest card on "Done" bulk-completes it', async () => {
    render(<GamificationTab />);
    await waitFor(() => expect(screen.getByText('Learn Guitar')).toBeInTheDocument());

    const doneColumn = screen.getByText('Done').closest('div')!.parentElement!;
    fireEvent.dragStart(screen.getByText('Learn Guitar'));
    fireEvent.drop(doneColumn);

    await waitFor(() => expect(mockPatch).toHaveBeenCalledWith('/api/quests/q1/complete'));
  });

  it('has no Skills section anymore — that moved to its own page', async () => {
    render(<GamificationTab />);
    await waitFor(() => expect(screen.getByText('Learn Guitar')).toBeInTheDocument());
    expect(screen.queryByText('Skills')).not.toBeInTheDocument();
  });

  it('editing a task swaps the row for a prefilled form and saves via PATCH', async () => {
    render(<GamificationTab />);
    await waitFor(() => expect(screen.getByText('Morning run')).toBeInTheDocument());

    await userEvent.click(screen.getByLabelText('Edit task "Morning run"'));
    const input = await screen.findByLabelText('Task title');
    expect((input as HTMLInputElement).value).toBe('Morning run');

    await userEvent.clear(input);
    await userEvent.type(input, 'Evening run');
    await userEvent.click(screen.getByText('Save'));

    await waitFor(() => expect(mockPatch).toHaveBeenCalledWith(
      '/api/tasks/t1',
      { body: { title: 'Evening run', recurrence: 'daily', xpReward: 25, linkedSkillId: null } },
    ));
  });
});
