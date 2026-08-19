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
  priority: 'medium', dueDate: null, linkedSkillId: null, recurrence: null, completed: false,
  steps: [
    { id: 's1', description: 'Buy a guitar', sortOrder: 0, completed: false },
    { id: 's2', description: 'Learn chords', sortOrder: 1, completed: false },
  ],
};
const habit = {
  id: 'h1', title: 'Morning run', description: null, xpReward: 25,
  priority: 'medium', dueDate: null, linkedSkillId: null, recurrence: 'daily', completed: false, steps: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGet.mockImplementation((url: string) => {
    if (url === '/api/quests') return Promise.resolve([quest, habit]);
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

  it('splits recurring quests into the habit list, one-time ones into the kanban', async () => {
    render(<GamificationTab />);
    await waitFor(() => expect(screen.getByText('Learn Guitar')).toBeInTheDocument());
    expect(screen.getByText('Morning run')).toBeInTheDocument();
    // The habit row's toggle affordance, not the quest kanban's expand button.
    expect(screen.getByTitle('Mark complete')).toBeInTheDocument();
  });

  it('deleting a quest opens a confirmation and calls DELETE on confirm', async () => {
    render(<GamificationTab />);
    await waitFor(() => expect(screen.getByText('Learn Guitar')).toBeInTheDocument());

    await userEvent.click(screen.getByLabelText('Delete quest "Learn Guitar"'));
    expect(screen.getByText(/Delete "Learn Guitar"/)).toBeInTheDocument();

    await userEvent.click(screen.getByText('Delete'));
    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith('/api/quests/q1'));
  });

  it('deleting a habit opens a confirmation and calls DELETE on confirm', async () => {
    render(<GamificationTab />);
    await waitFor(() => expect(screen.getByText('Morning run')).toBeInTheDocument());

    await userEvent.click(screen.getByLabelText('Delete habit "Morning run"'));
    await userEvent.click(screen.getByText('Delete'));

    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith('/api/quests/h1'));
  });

  it('dropping a quest card on "Done" bulk-completes it', async () => {
    render(<GamificationTab />);
    await waitFor(() => expect(screen.getByText('Learn Guitar')).toBeInTheDocument());

    const doneColumn = screen.getByText('Done').closest('div')!.parentElement!;
    fireEvent.dragStart(screen.getByText('Learn Guitar'));
    fireEvent.drop(doneColumn);

    await waitFor(() => expect(mockPatch).toHaveBeenCalledWith('/api/quests/q1/complete'));
  });

  it('opens a habit-only quest form pre-set to Daily from the "New Habit" button', async () => {
    mockPost.mockResolvedValue({
      id: 'h2', title: 'Stretch', description: null, xpReward: 50, priority: 'medium',
      dueDate: null, linkedSkillId: null, recurrence: 'daily', completed: false, steps: [],
    });
    render(<GamificationTab />);
    await waitFor(() => expect(screen.getByText('Morning run')).toBeInTheDocument());

    await userEvent.click(screen.getByText('New Habit'));
    expect(screen.getByRole('radio', { name: 'Daily', checked: true })).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Quest title'), 'Stretch');
    await userEvent.click(screen.getByText('Create Habit'));

    await waitFor(() => expect(mockPost).toHaveBeenCalledWith(
      '/api/quests',
      { body: expect.objectContaining({ title: 'Stretch', recurrence: 'daily' }) },
    ));
  });

  it('shows an empty-state message instead of bare columns when there are no quests', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === '/api/quests') return Promise.resolve([habit]);
      if (url === '/api/skills') return Promise.resolve([]);
      if (url === '/api/gamification/status') return Promise.resolve({ level: 1, totalXP: 0, streak: 0, progress: { current: 0, required: 100, percentage: 0 } });
      return Promise.resolve([]);
    });
    render(<GamificationTab />);
    await waitFor(() => expect(screen.getByText('Morning run')).toBeInTheDocument());
    expect(screen.getByText(/No quests yet/)).toBeInTheDocument();
    expect(screen.queryByText('To Do')).not.toBeInTheDocument();
  });

  it('has no Skills section anymore — that moved to its own page', async () => {
    render(<GamificationTab />);
    await waitFor(() => expect(screen.getByText('Learn Guitar')).toBeInTheDocument());
    expect(screen.queryByText('Skills')).not.toBeInTheDocument();
  });

  it('toggling a habit calls the complete endpoint and shows the XP toast', async () => {
    render(<GamificationTab />);
    await waitFor(() => expect(screen.getByText('Morning run')).toBeInTheDocument());

    await userEvent.click(screen.getByTitle('Mark complete'));

    await waitFor(() => expect(mockPatch).toHaveBeenCalledWith('/api/quests/h1/complete'));
    expect(addXP).toHaveBeenCalledWith(25, 'Morning run');
  });

  it('editing a habit saves via PATCH', async () => {
    render(<GamificationTab />);
    await waitFor(() => expect(screen.getByText('Morning run')).toBeInTheDocument());

    await userEvent.click(screen.getByLabelText('Edit habit "Morning run"'));
    const input = await screen.findByLabelText('Habit title');
    await userEvent.clear(input);
    await userEvent.type(input, 'Evening run');
    await userEvent.click(screen.getByText('Save'));

    await waitFor(() => expect(mockPatch).toHaveBeenCalledWith(
      '/api/quests/h1',
      { body: { title: 'Evening run', xpReward: 25, recurrence: 'daily', linkedSkillId: null } },
    ));
  });
});
