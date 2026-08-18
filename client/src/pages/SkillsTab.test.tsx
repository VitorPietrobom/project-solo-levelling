import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SkillsTab from './SkillsTab';

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockDelete = vi.fn();
vi.mock('../lib/apiClient', () => ({
  apiClient: {
    get: (...args: any[]) => mockGet(...args),
    post: (...args: any[]) => mockPost(...args),
    delete: (...args: any[]) => mockDelete(...args),
  },
}));

const addXP = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useOutletContext: () => ({ addXP }) };
});

const skill = (id: string, name: string, level: number) => ({
  id, name, totalXP: level * 100, level, progress: { current: 20, required: 100, percentage: 20 },
});

beforeEach(() => {
  vi.clearAllMocks();
  mockPost.mockResolvedValue({});
  mockDelete.mockResolvedValue({});
});

describe('SkillsTab', () => {
  it('lists every skill, unlike the old cramped shared card', async () => {
    const many = Array.from({ length: 11 }, (_, i) => skill(`sk${i}`, `Skill ${i}`, i));
    mockGet.mockResolvedValue(many);

    render(<SkillsTab />);

    await waitFor(() => expect(screen.getAllByText('Skill 0').length).toBeGreaterThan(0));
    // Each name appears at least once (list row); some also appear on the radar.
    for (const s of many) expect(screen.getAllByText(s.name).length).toBeGreaterThan(0);
  });

  it('shows the radar once there are 3+ skills', async () => {
    mockGet.mockResolvedValue([skill('a', 'A', 1), skill('b', 'B', 2), skill('c', 'C', 3)]);
    render(<SkillsTab />);
    await waitFor(() => expect(screen.getByLabelText(/Skill radar/)).toBeInTheDocument());
  });

  it('hides the radar and explains why below 3 skills', async () => {
    mockGet.mockResolvedValue([skill('a', 'A', 1)]);
    render(<SkillsTab />);
    await waitFor(() => expect(screen.getByText('A')).toBeInTheDocument());
    expect(screen.queryByLabelText(/Skill radar/)).not.toBeInTheDocument();
    expect(screen.getByText(/more skill/)).toBeInTheDocument();
  });

  it('logs custom XP for a skill', async () => {
    mockGet.mockResolvedValue([skill('a', 'Guitar', 2)]);
    mockPost.mockResolvedValue({ id: 'a', name: 'Guitar', totalXP: 250, level: 2, progress: { current: 50, required: 300, percentage: 16.6 } });

    render(<SkillsTab />);
    await waitFor(() => expect(screen.getByText('Guitar')).toBeInTheDocument());

    await userEvent.type(screen.getByLabelText('Log custom XP for Guitar'), '30');
    await userEvent.click(screen.getByLabelText('Log XP for Guitar'));

    expect(mockPost).toHaveBeenCalledWith('/api/skills/a/log', { body: { xp: 30 } });
    expect(addXP).toHaveBeenCalledWith(30, 'Skill XP');
  });

  it('ignores a zero or blank XP log attempt', async () => {
    mockGet.mockResolvedValue([skill('a', 'Guitar', 2)]);
    render(<SkillsTab />);
    await waitFor(() => expect(screen.getByText('Guitar')).toBeInTheDocument());

    await userEvent.click(screen.getByLabelText('Log XP for Guitar'));
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('deletes a skill after confirmation', async () => {
    mockGet.mockResolvedValue([skill('a', 'Guitar', 2)]);
    render(<SkillsTab />);
    await waitFor(() => expect(screen.getByText('Guitar')).toBeInTheDocument());

    await userEvent.click(screen.getByLabelText('Delete skill "Guitar"'));
    await userEvent.click(screen.getByText('Delete'));

    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith('/api/skills/a'));
  });
});
