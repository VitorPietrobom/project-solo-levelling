import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SkillActionList from './SkillActionList';

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockDelete = vi.fn();
vi.mock('../lib/apiClient', () => ({
  apiClient: {
    get: (...args: any[]) => mockGet(...args),
    post: (...args: any[]) => mockPost(...args),
    delete: (...args: any[]) => mockDelete(...args),
  },
  errorMessage: (_err: any, fallback: string) => fallback,
}));

const mockShowToast = vi.fn();
vi.mock('../contexts/ToastContext', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

const action = { id: 'a1', skillId: 'sk1', name: 'Play drums', xpReward: 30 };

beforeEach(() => {
  vi.clearAllMocks();
  mockGet.mockResolvedValue([action]);
  mockPost.mockResolvedValue({});
  mockDelete.mockResolvedValue({});
});

describe('SkillActionList', () => {
  it('fetches and lists actions for the skill', async () => {
    render(<SkillActionList skillId="sk1" onLogged={vi.fn()} />);
    await waitFor(() => expect(mockGet).toHaveBeenCalledWith('/api/skill-actions?skillId=sk1'));
    expect(await screen.findByText('Play drums')).toBeInTheDocument();
    expect(screen.getByText('+30')).toBeInTheDocument();
  });

  it('shows an empty state when there are no actions yet', async () => {
    mockGet.mockResolvedValue([]);
    render(<SkillActionList skillId="sk1" onLogged={vi.fn()} />);
    expect(await screen.findByText(/No practice actions yet/)).toBeInTheDocument();
  });

  it('creates a new action via the form', async () => {
    mockGet.mockResolvedValue([]);
    mockPost.mockResolvedValue({ id: 'a2', skillId: 'sk1', name: 'Watch a lesson', xpReward: 10 });
    render(<SkillActionList skillId="sk1" onLogged={vi.fn()} />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());

    await userEvent.click(screen.getByText('New action'));
    await userEvent.type(screen.getByLabelText('Action name'), 'Watch a lesson');
    const xpInput = screen.getByLabelText('XP reward');
    await userEvent.clear(xpInput);
    await userEvent.type(xpInput, '10');
    await userEvent.click(screen.getByText('Add'));

    await waitFor(() => expect(mockPost).toHaveBeenCalledWith('/api/skill-actions', { body: { skillId: 'sk1', name: 'Watch a lesson', xpReward: 10 } }));
    expect(await screen.findByText('Watch a lesson')).toBeInTheDocument();
  });

  it('logs an action and shows the awarded XP, notifying the parent', async () => {
    mockPost.mockResolvedValue({ xpAwarded: 30, multiplier: 1 });
    const onLogged = vi.fn();
    render(<SkillActionList skillId="sk1" onLogged={onLogged} />);
    await screen.findByText('Play drums');

    await userEvent.click(screen.getByText('Log'));

    await waitFor(() => expect(mockPost).toHaveBeenCalledWith('/api/skill-actions/a1/log'));
    expect(onLogged).toHaveBeenCalled();
    expect(await screen.findByText('+30 XP')).toBeInTheDocument();
  });

  it('shows the diminishing multiplier when it kicks in', async () => {
    mockPost.mockResolvedValue({ xpAwarded: 18, multiplier: 0.6 });
    render(<SkillActionList skillId="sk1" onLogged={vi.fn()} />);
    await screen.findByText('Play drums');

    await userEvent.click(screen.getByText('Log'));

    expect(await screen.findByText('+18 XP (×0.6 today)')).toBeInTheDocument();
  });

  it('deletes an action', async () => {
    render(<SkillActionList skillId="sk1" onLogged={vi.fn()} />);
    await screen.findByText('Play drums');

    await userEvent.click(screen.getByLabelText('Delete action "Play drums"'));

    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith('/api/skill-actions/a1'));
    expect(screen.queryByText('Play drums')).not.toBeInTheDocument();
  });
});
