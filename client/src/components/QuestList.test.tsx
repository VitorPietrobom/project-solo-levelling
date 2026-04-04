import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuestList from './QuestList';

const mockGet = vi.fn();
const mockPatch = vi.fn();
vi.mock('../lib/apiClient', () => ({
  apiClient: {
    get: (...args: any[]) => mockGet(...args),
    patch: (...args: any[]) => mockPatch(...args),
  },
}));

const sampleQuests = [
  {
    id: 'q1',
    title: 'Learn TypeScript',
    description: 'Master TS basics',
    xpReward: 100,
    completed: false,
    steps: [
      { id: 's1', description: 'Read docs', sortOrder: 0, completed: true },
      { id: 's2', description: 'Build project', sortOrder: 1, completed: false },
    ],
  },
  {
    id: 'q2',
    title: 'Done Quest',
    description: 'Already finished',
    xpReward: 50,
    completed: true,
    steps: [{ id: 's3', description: 'Only step', sortOrder: 0, completed: true }],
  },
];

describe('QuestList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders active quests with progress', async () => {
    mockGet.mockResolvedValue(sampleQuests);
    render(<QuestList refreshKey={0} />);

    await waitFor(() => {
      expect(screen.getByText('Learn TypeScript')).toBeInTheDocument();
    });
    expect(screen.getByText('1 / 2 steps')).toBeInTheDocument();
    expect(screen.getByText('100 XP')).toBeInTheDocument();
  });

  it('renders completed quests section', async () => {
    mockGet.mockResolvedValue(sampleQuests);
    render(<QuestList refreshKey={0} />);

    await waitFor(() => {
      expect(screen.getByText('Completed')).toBeInTheDocument();
    });
    expect(screen.getByText('Done Quest')).toBeInTheDocument();
  });

  it('shows empty state when no quests', async () => {
    mockGet.mockResolvedValue([]);
    render(<QuestList refreshKey={0} />);

    await waitFor(() => {
      expect(screen.getByText('No quests yet. Create one to get started.')).toBeInTheDocument();
    });
  });

  it('calls patch endpoint when toggling a step', async () => {
    mockGet.mockResolvedValue([sampleQuests[0]]);
    mockPatch.mockResolvedValue({});

    render(<QuestList refreshKey={0} />);

    await waitFor(() => {
      expect(screen.getByText('Build project')).toBeInTheDocument();
    });

    const btn = screen.getByLabelText('Mark "Build project" as complete');
    await userEvent.click(btn);

    expect(mockPatch).toHaveBeenCalledWith('/api/quests/q1/steps/s2');
  });

  it('shows error on fetch failure', async () => {
    mockGet.mockRejectedValue(new Error('Server error'));
    render(<QuestList refreshKey={0} />);

    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument();
    });
  });
});
