import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuestForm from './QuestForm';

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

  it('calls onCreated with optimistic quest on submit', async () => {
    render(<QuestForm onCreated={onCreated} />);

    await userEvent.type(screen.getByLabelText('Quest title'), 'My Quest');
    await userEvent.type(screen.getByLabelText('Quest description'), 'A description');
    await userEvent.type(screen.getByLabelText('Step 1'), 'First step');
    await userEvent.click(screen.getByText('Create Quest'));

    expect(onCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'My Quest',
        description: 'A description',
        xpReward: 50,
        completed: false,
        steps: [expect.objectContaining({ description: 'First step', completed: false })],
      }),
      ['First step'],
      50,
    );
  });

  it('shows validation error when title is empty', async () => {
    render(<QuestForm onCreated={onCreated} />);
    await userEvent.type(screen.getByLabelText('Step 1'), 'A step');
    await userEvent.click(screen.getByText('Create Quest'));

    expect(screen.getByText('Title, description, and at least one step are required')).toBeInTheDocument();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('can add and remove steps', async () => {
    render(<QuestForm onCreated={onCreated} />);
    await userEvent.click(screen.getByText('+ Add step'));

    expect(screen.getByLabelText('Step 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Step 2')).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText('Remove step 2'));
    expect(screen.queryByLabelText('Step 2')).not.toBeInTheDocument();
  });
});
