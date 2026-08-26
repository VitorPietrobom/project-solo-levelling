import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MeasurementEntryList from './MeasurementEntryList';

const measurements: any[] = [
  { id: 'm1', type: 'chest', value: 100, date: '2026-06-06T00:00:00.000Z' },
  { id: 'm2', type: 'waist', value: 80, date: '2026-08-05T00:00:00.000Z' },
];

describe('MeasurementEntryList', () => {
  it('renders nothing when there are no measurements', () => {
    const { container } = render(<MeasurementEntryList measurements={[]} onUpdate={vi.fn()} onDelete={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('lists entries most-recent-first with type and date', () => {
    render(<MeasurementEntryList measurements={measurements} onUpdate={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('Waist · Aug 5')).toBeInTheDocument();
    expect(screen.getByText('Chest · Jun 6')).toBeInTheDocument();
  });

  it('edits an entry in place', async () => {
    const onUpdate = vi.fn();
    render(<MeasurementEntryList measurements={measurements} onUpdate={onUpdate} onDelete={vi.fn()} />);

    await userEvent.click(screen.getByLabelText('Edit Chest · Jun 6'));
    const input = screen.getByLabelText('Edit value for Chest · Jun 6');
    await userEvent.clear(input);
    await userEvent.type(input, '101');
    await userEvent.click(screen.getByLabelText('Save measurement edit'));

    expect(onUpdate).toHaveBeenCalledWith('m1', 101);
  });

  it('deletes an entry', async () => {
    const onDelete = vi.fn();
    render(<MeasurementEntryList measurements={measurements} onUpdate={vi.fn()} onDelete={onDelete} />);

    await userEvent.click(screen.getByLabelText('Delete Chest · Jun 6'));

    expect(onDelete).toHaveBeenCalledWith('m1');
  });
});
