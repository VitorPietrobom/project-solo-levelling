import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SkillsTab from './SkillsTab';

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
  errorMessage: (_err: any, fallback: string) => fallback,
}));

const mockShowToast = vi.fn();
vi.mock('../contexts/ToastContext', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

const skill = (id: string, name: string, level: number) => ({
  id, name, totalXP: level * 100, level, progress: { current: 20, required: 100, percentage: 20 },
});

const quest = (id: string, title: string, linkedSkillId: string | null, opts: Partial<{ recurrence: 'daily' | 'weekly' | null; completed: boolean }> = {}) => ({
  id, title, description: null, xpReward: 20, priority: 'medium', dueDate: null,
  linkedSkillId, recurrence: opts.recurrence ?? null, completed: opts.completed ?? false, steps: [],
});

function mockData(skills: any[], quests: any[] = [], practiceReminderDays = 14) {
  mockGet.mockImplementation((url: string) => {
    if (url === '/api/skills') return Promise.resolve(skills);
    if (url === '/api/quests') return Promise.resolve(quests);
    if (url === '/api/gamification/status') return Promise.resolve({ practiceReminderDays });
    if (url.startsWith('/api/skill-actions')) return Promise.resolve([]);
    return Promise.resolve([]);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPost.mockResolvedValue({});
  mockPatch.mockResolvedValue({});
  mockDelete.mockResolvedValue({});
});

describe('SkillsTab', () => {
  it('lists every skill, unlike the old cramped shared card', async () => {
    const many = Array.from({ length: 11 }, (_, i) => skill(`sk${i}`, `Skill ${i}`, i));
    mockData(many);

    render(<SkillsTab />);

    await waitFor(() => expect(screen.getAllByText('Skill 0').length).toBeGreaterThan(0));
    for (const s of many) expect(screen.getAllByText(s.name).length).toBeGreaterThan(0);
  });

  it('shows the radar once there are 3+ skills', async () => {
    mockData([skill('a', 'A', 1), skill('b', 'B', 2), skill('c', 'C', 3)]);
    render(<SkillsTab />);
    await waitFor(() => expect(screen.getByLabelText(/Skill radar/)).toBeInTheDocument());
  });

  it('hides the radar and explains why below 3 skills', async () => {
    mockData([skill('a', 'A', 1)]);
    render(<SkillsTab />);
    await waitFor(() => expect(screen.getByText('A')).toBeInTheDocument());
    expect(screen.queryByLabelText(/Skill radar/)).not.toBeInTheDocument();
    expect(screen.getByText(/more skill/)).toBeInTheDocument();
  });

  it('has no manual XP-log input anywhere on the page', async () => {
    mockData([skill('a', 'Guitar', 2)]);
    render(<SkillsTab />);
    await waitFor(() => expect(screen.getByText('Guitar')).toBeInTheDocument());
    expect(screen.queryByLabelText(/Log custom XP/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Log XP for/)).not.toBeInTheDocument();
  });

  it('deletes a skill after confirmation', async () => {
    mockData([skill('a', 'Guitar', 2)]);
    render(<SkillsTab />);
    await waitFor(() => expect(screen.getByText('Guitar')).toBeInTheDocument());

    await userEvent.click(screen.getByLabelText('Delete skill "Guitar"'));
    await userEvent.click(screen.getByText('Delete'));

    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith('/api/skills/a'));
  });

  it('shows a toast and re-fetches when deleting a skill fails', async () => {
    mockData([skill('a', 'Guitar', 2)]);
    mockDelete.mockRejectedValue(new Error('nope'));
    render(<SkillsTab />);
    await waitFor(() => expect(screen.getByText('Guitar')).toBeInTheDocument());

    await userEvent.click(screen.getByLabelText('Delete skill "Guitar"'));
    await userEvent.click(screen.getByText('Delete'));

    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('Failed to delete skill'));
  });

  it('shows a rank badge derived from the skill level', async () => {
    mockData([skill('a', 'Guitar', 45)]); // A-Rank
    render(<SkillsTab />);
    await waitFor(() => expect(screen.getByText('Guitar')).toBeInTheDocument());
    expect(screen.getByText('A-Rank')).toBeInTheDocument();
  });

  it('flags a skill with nothing linked to it', async () => {
    mockData([skill('a', 'Guitar', 2)], []);
    render(<SkillsTab />);
    await waitFor(() => expect(screen.getByText('Guitar')).toBeInTheDocument());
    expect(screen.getByLabelText(/Not linked to any quest or habit/)).toBeInTheDocument();
    expect(screen.getByText(/1 skill isn't linked/)).toBeInTheDocument();
  });

  it('does not flag a skill that has a linked quest', async () => {
    mockData([skill('a', 'Guitar', 2)], [quest('q1', 'Practice scales', 'a')]);
    render(<SkillsTab />);
    await waitFor(() => expect(screen.getByText('Guitar')).toBeInTheDocument());
    expect(screen.queryByLabelText(/Not linked to any quest or habit/)).not.toBeInTheDocument();
    expect(screen.queryByText(/isn't linked/)).not.toBeInTheDocument();
  });

  it('expands a skill to show the quests and habits feeding it', async () => {
    mockData(
      [skill('a', 'Guitar', 2)],
      [quest('q1', 'Practice scales', 'a'), quest('h1', 'Daily warmup', 'a', { recurrence: 'daily' })],
    );
    render(<SkillsTab />);
    await waitFor(() => expect(screen.getByText('Guitar')).toBeInTheDocument());

    expect(screen.queryByText('Practice scales')).not.toBeInTheDocument();
    await userEvent.click(screen.getByText('Guitar'));

    expect(screen.getByText('Practice scales')).toBeInTheDocument();
    expect(screen.getByText('Daily warmup')).toBeInTheDocument();
  });

  it('renames a skill in place without touching its XP', async () => {
    mockData([skill('a', 'Guitar', 2)]);
    render(<SkillsTab />);
    await waitFor(() => expect(screen.getByText('Guitar')).toBeInTheDocument());

    await userEvent.click(screen.getByLabelText('Rename skill "Guitar"'));
    const input = screen.getByLabelText('Rename skill "Guitar"');
    await userEvent.clear(input);
    await userEvent.type(input, 'Piano');
    await userEvent.click(screen.getByText('Save'));

    await waitFor(() => expect(mockPatch).toHaveBeenCalledWith('/api/skills/a', { body: { name: 'Piano' } }));
    expect(screen.getAllByText('Piano').length).toBeGreaterThan(0);
  });

  it('flags a skill untouched longer than the configured reminder window', async () => {
    const stale = new Date(Date.now() - 20 * 86_400_000).toISOString();
    mockData([{ ...skill('a', 'Guitar', 5), lastActivityAt: stale }], [], 14);
    render(<SkillsTab />);
    await waitFor(() => expect(screen.getByText('Needs practice')).toBeInTheDocument());
    expect(screen.getByText(/Untouched for 14\+ days: Guitar/)).toBeInTheDocument();
  });

  it('does not flag a skill practiced within the reminder window', async () => {
    const recent = new Date(Date.now() - 2 * 86_400_000).toISOString();
    mockData([{ ...skill('a', 'Guitar', 5), lastActivityAt: recent }], [], 14);
    render(<SkillsTab />);
    await waitFor(() => expect(screen.getByText('Guitar')).toBeInTheDocument());
    expect(screen.queryByText('Needs practice')).not.toBeInTheDocument();
  });

  it('separately flags a skill that has never been practiced', async () => {
    mockData([{ ...skill('a', 'Painting', 0), lastActivityAt: null }]);
    render(<SkillsTab />);
    await waitFor(() => expect(screen.getByText('Needs practice')).toBeInTheDocument());
    expect(screen.getByText(/Never practiced yet: Painting/)).toBeInTheDocument();
  });

  it('shows overview stats: total skills, highest level, most active', async () => {
    mockData(
      [skill('a', 'Guitar', 5), skill('b', 'Coding', 8)],
      [quest('q1', 'Q1', 'b'), quest('q2', 'Q2', 'b')],
    );
    render(<SkillsTab />);
    await waitFor(() => expect(screen.getByText('Total skills')).toBeInTheDocument());
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Coding · Lv 8')).toBeInTheDocument();
    expect(screen.getByText('Coding · 2 linked')).toBeInTheDocument();
  });
});
