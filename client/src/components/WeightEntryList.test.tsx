import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WeightEntryList from './WeightEntryList';

const entries = [
  { id: 'w1', weight: 88, date: '2026-06-06T00:00:00.000Z' },
  { id: 'w2', weight: 87.2, date: '2026-08-05T00:00:00.000Z' },
];

describe('WeightEntryList', () => {
  it('renders nothing when there are no entries', () => {
    const { container } = render(<WeightEntryList entries={[]} onUpdate={vi.fn()} onDelete={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('lists entries most-recent-first', () => {
    render(<WeightEntryList entries={entries} onUpdate={vi.fn()} onDelete={vi.fn()} />);
    const rows = screen.getAllByText(/kg$/);
    expect(rows[0]).toHaveTextContent('87.2 kg');
    expect(rows[1]).toHaveTextContent('88 kg');
  });

  it('edits an entry in place', async () => {
    const onUpdate = vi.fn();
    render(<WeightEntryList entries={entries} onUpdate={onUpdate} onDelete={vi.fn()} />);

    await userEvent.click(screen.getByLabelText('Edit weight entry from Aug 5'));
    const input = screen.getByLabelText('Edit weight for Aug 5');
    await userEvent.clear(input);
    await userEvent.type(input, '86');
    await userEvent.click(screen.getByLabelText('Save weight edit'));

    expect(onUpdate).toHaveBeenCalledWith('w2', 86);
  });

  it('rejects a non-positive edited weight', async () => {
    const onUpdate = vi.fn();
    render(<WeightEntryList entries={entries} onUpdate={onUpdate} onDelete={vi.fn()} />);

    await userEvent.click(screen.getByLabelText('Edit weight entry from Aug 5'));
    const input = screen.getByLabelText('Edit weight for Aug 5');
    await userEvent.clear(input);
    await userEvent.type(input, '0');
    await userEvent.click(screen.getByLabelText('Save weight edit'));

    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('cancels an edit without calling onUpdate', async () => {
    const onUpdate = vi.fn();
    render(<WeightEntryList entries={entries} onUpdate={onUpdate} onDelete={vi.fn()} />);

    await userEvent.click(screen.getByLabelText('Edit weight entry from Aug 5'));
    await userEvent.click(screen.getByLabelText('Cancel weight edit'));

    expect(screen.queryByLabelText('Edit weight for Aug 5')).not.toBeInTheDocument();
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('deletes an entry', async () => {
    const onDelete = vi.fn();
    render(<WeightEntryList entries={entries} onUpdate={vi.fn()} onDelete={onDelete} />);

    await userEvent.click(screen.getByLabelText('Delete weight entry from Aug 5'));

    expect(onDelete).toHaveBeenCalledWith('w2');
  });
});
