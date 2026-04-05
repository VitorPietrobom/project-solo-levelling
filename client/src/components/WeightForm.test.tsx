import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WeightForm from './WeightForm';

describe('WeightForm', () => {
  const onCreated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders form fields', () => {
    render(<WeightForm onCreated={onCreated} />);
    expect(screen.getByLabelText('Weight in kg')).toBeInTheDocument();
    expect(screen.getByLabelText('Entry date')).toBeInTheDocument();
    expect(screen.getByText('Log Entry')).toBeInTheDocument();
  });

  it('calls onCreated with optimistic entry on submit', async () => {
    render(<WeightForm onCreated={onCreated} />);

    await userEvent.type(screen.getByLabelText('Weight in kg'), '80.5');
    await userEvent.click(screen.getByText('Log Entry'));

    expect(onCreated).toHaveBeenCalledWith(
      expect.objectContaining({ weight: 80.5 }),
      expect.objectContaining({ weight: 80.5 }),
    );
  });

  it('shows error when weight is empty', async () => {
    render(<WeightForm onCreated={onCreated} />);
    await userEvent.click(screen.getByText('Log Entry'));

    expect(screen.getByText('Weight must be a positive number')).toBeInTheDocument();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('resets weight field after submit', async () => {
    render(<WeightForm onCreated={onCreated} />);

    await userEvent.type(screen.getByLabelText('Weight in kg'), '75');
    await userEvent.click(screen.getByText('Log Entry'));

    expect((screen.getByLabelText('Weight in kg') as HTMLInputElement).value).toBe('');
  });
});
