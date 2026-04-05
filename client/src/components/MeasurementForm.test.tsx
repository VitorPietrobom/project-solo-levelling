import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MeasurementForm from './MeasurementForm';

describe('MeasurementForm', () => {
  const onCreated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders form fields', () => {
    render(<MeasurementForm onCreated={onCreated} />);
    expect(screen.getByLabelText('Measurement type')).toBeInTheDocument();
    expect(screen.getByLabelText('Measurement value')).toBeInTheDocument();
    expect(screen.getByLabelText('Measurement date')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log Measurement' })).toBeInTheDocument();
  });

  it('renders all measurement type options', () => {
    render(<MeasurementForm onCreated={onCreated} />);
    const select = screen.getByLabelText('Measurement type') as HTMLSelectElement;
    const options = Array.from(select.options).map((o) => o.value);
    expect(options).toEqual(['chest', 'waist', 'hips', 'arms', 'thighs']);
  });

  it('calls onCreated with optimistic measurement on submit', async () => {
    render(<MeasurementForm onCreated={onCreated} />);

    await userEvent.selectOptions(screen.getByLabelText('Measurement type'), 'waist');
    await userEvent.type(screen.getByLabelText('Measurement value'), '80.5');
    await userEvent.click(screen.getByRole('button', { name: 'Log Measurement' }));

    expect(onCreated).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'waist', value: 80.5 }),
      expect.objectContaining({ type: 'waist', value: 80.5 }),
    );
  });

  it('shows error when value is empty', async () => {
    render(<MeasurementForm onCreated={onCreated} />);
    await userEvent.click(screen.getByRole('button', { name: 'Log Measurement' }));

    expect(screen.getByText('Value must be a positive number')).toBeInTheDocument();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('resets value field after submit', async () => {
    render(<MeasurementForm onCreated={onCreated} />);

    await userEvent.type(screen.getByLabelText('Measurement value'), '95');
    await userEvent.click(screen.getByRole('button', { name: 'Log Measurement' }));

    expect((screen.getByLabelText('Measurement value') as HTMLInputElement).value).toBe('');
  });

  it('generates optimistic id with temp prefix', async () => {
    render(<MeasurementForm onCreated={onCreated} />);

    await userEvent.type(screen.getByLabelText('Measurement value'), '90');
    await userEvent.click(screen.getByRole('button', { name: 'Log Measurement' }));

    const optimistic = onCreated.mock.calls[0][0];
    expect(optimistic.id).toMatch(/^temp-/);
  });
});
