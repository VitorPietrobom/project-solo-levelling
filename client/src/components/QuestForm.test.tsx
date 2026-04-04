import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuestForm from './QuestForm';

const mockPost = vi.fn();
vi.mock('../lib/apiClient', () => ({
  apiClient: {
    post: (...args: any[]) => mockPost(...args),
  },
}));

describe('QuestForm', () => {
  const onCreated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders form fields', () => {
    render(<QuestForm onCreated={onCreated} />);
    expect(screen.getByLabelText('Quest title')).toBeInTheDocument();
    expect(screen.getByLabelText('Quest description')).toBeInTheDocument();
    expect(screen.getByLabelText('Step 1')).toBeInTheDocument();
    expect(screen.getByText('Create Quest')).toBeInTheDocument();
  });

  it('submits quest with valid data', async () => {
    mockPost.mockResolvedValue({ id: 'q1' });
    render(<QuestForm onCreated={onCreated} />);

    await userEvent.type(screen.getByLabelText('Quest title'), 'My Quest');
    await userEvent.type(screen.getByLabelText('Quest description'), 'A description');
    await userEvent.type(screen.getByLabelText('Step 1'), 'First step');
    await userEvent.click(screen.getByText('Create Quest'));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/api/quests', {
        body: {
          title: 'My Quest',
          description: 'A description',
          xpReward: 50,
          steps: ['First step'],
        },
      });
    });
    expect(onCreated).toHaveBeenCalled();
  });

  it('shows validation error when title is empty', async () => {
    render(<QuestForm onCreated={onCreated} />);
    await userEvent.type(screen.getByLabelText('Step 1'), 'A step');
    await userEvent.click(screen.getByText('Create Quest'));

    expect(screen.getByText('Title, description, and at least one step are required')).toBeInTheDocument();
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('can add and remove steps', async () => {
    render(<QuestForm onCreated={onCreated} />);
    await userEvent.click(screen.getByText('+ Add step'));

    expect(screen.getByLabelText('Step 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Step 2')).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText('Remove step 2'));
    expect(screen.queryByLabelText('Step 2')).not.toBeInTheDocument();
  });

  it('shows error on API failure', async () => {
    mockPost.mockRejectedValue(new Error('Server error'));
    render(<QuestForm onCreated={onCreated} />);

    await userEvent.type(screen.getByLabelText('Quest title'), 'Quest');
    await userEvent.type(screen.getByLabelText('Quest description'), 'Desc');
    await userEvent.type(screen.getByLabelText('Step 1'), 'Step');
    await userEvent.click(screen.getByText('Create Quest'));

    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument();
    });
  });
});
