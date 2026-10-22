import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BookList from './BookList';
import type { Book } from './BookList';

const sampleBooks: Book[] = [
  {
    id: 'b1', title: 'Clean Code', author: 'Robert Martin',
    status: 'want_to_read', totalPages: 400, currentPage: 0,
    notes: null, linkedSkillId: null, startedAt: null, finishedAt: null,
  },
  {
    id: 'b2', title: 'Refactoring', author: 'Martin Fowler',
    status: 'reading', totalPages: 300, currentPage: 150,
    notes: null, linkedSkillId: null, startedAt: '2024-01-01', finishedAt: null,
  },
  {
    id: 'b3', title: 'Design Patterns', author: 'GoF',
    status: 'finished', totalPages: 350, currentPage: 350,
    notes: null, linkedSkillId: null, startedAt: '2024-01-01', finishedAt: '2024-02-01',
  },
];

describe('BookList', () => {
  it('renders kanban columns', () => {
    render(<BookList books={sampleBooks} onUpdateStatus={vi.fn()} onUpdateProgress={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('Want to Read')).toBeInTheDocument();
    expect(screen.getAllByText('Reading').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Finished').length).toBeGreaterThan(0);
  });

  it('places books in correct columns', () => {
    render(<BookList books={sampleBooks} onUpdateStatus={vi.fn()} onUpdateProgress={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('Clean Code')).toBeInTheDocument();
    expect(screen.getByText('Refactoring')).toBeInTheDocument();
    expect(screen.getByText('Design Patterns')).toBeInTheDocument();
  });

  it('shows empty state when no books', () => {
    render(<BookList books={[]} onUpdateStatus={vi.fn()} onUpdateProgress={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText(/No books yet/)).toBeInTheDocument();
  });

  it('shows page count for each book', () => {
    render(<BookList books={sampleBooks} onUpdateStatus={vi.fn()} onUpdateProgress={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('0 / 400')).toBeInTheDocument();
    expect(screen.getByText('150 / 300')).toBeInTheDocument();
    expect(screen.getByText('350 / 350')).toBeInTheDocument();
  });

  it('calls onUpdateStatus when clicking status button', async () => {
    const onUpdateStatus = vi.fn();
    render(<BookList books={sampleBooks} onUpdateStatus={onUpdateStatus} onUpdateProgress={vi.fn()} onDelete={vi.fn()} />);

    // "Clean Code" is want_to_read, it should have a "Reading" button and a "Finished" button
    // Click the "Finished" button on Clean Code (unique action for want_to_read book)
    const finishedButtons = screen.getAllByRole('button', { name: /Finished/i });
    // The first "Finished" button belongs to the first want_to_read book (Clean Code)
    await userEvent.click(finishedButtons[0]);
    expect(onUpdateStatus).toHaveBeenCalledWith('b1', 'finished');
  });

  it('calls onDelete when clicking delete button', async () => {
    const onDelete = vi.fn();
    render(<BookList books={sampleBooks} onUpdateStatus={vi.fn()} onUpdateProgress={vi.fn()} onDelete={onDelete} />);

    await userEvent.click(screen.getByLabelText('Delete Clean Code'));
    expect(onDelete).toHaveBeenCalledWith('b1');
  });

  it('shows log pages input only for reading books', () => {
    render(<BookList books={sampleBooks} onUpdateStatus={vi.fn()} onUpdateProgress={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByLabelText('Log page for Refactoring')).toBeInTheDocument();
    expect(screen.queryByLabelText('Log page for Clean Code')).not.toBeInTheDocument();
  });

  it('calls onUpdateProgress when logging pages', async () => {
    const onUpdateProgress = vi.fn();
    render(<BookList books={sampleBooks} onUpdateStatus={vi.fn()} onUpdateProgress={onUpdateProgress} onDelete={vi.fn()} />);

    const input = screen.getByLabelText('Log page for Refactoring');
    await userEvent.type(input, '200');
    await userEvent.click(screen.getByText('Log'));
    expect(onUpdateProgress).toHaveBeenCalledWith('b2', 200);
  });

  it('disables actions on optimistic temp- books until the real id arrives', async () => {
    const onUpdateStatus = vi.fn();
    const onDelete = vi.fn();
    const onRefreshCover = vi.fn();
    const temp: Book = { ...sampleBooks[0], id: 'temp-123', title: 'Pending Book' };
    render(<BookList books={[temp]} onUpdateStatus={onUpdateStatus} onUpdateProgress={vi.fn()} onRefreshCover={onRefreshCover} onDelete={onDelete} />);
    const reading = screen.getByRole('button', { name: 'Reading' });
    const del = screen.getByRole('button', { name: 'Delete Pending Book' });
    const cover = screen.getByRole('button', { name: 'Find cover' });
    expect(reading).toBeDisabled();
    expect(del).toBeDisabled();
    expect(cover).toBeDisabled();
    await userEvent.click(reading);
    await userEvent.click(del);
    await userEvent.click(cover);
    expect(onUpdateStatus).not.toHaveBeenCalled();
    expect(onDelete).not.toHaveBeenCalled();
    expect(onRefreshCover).not.toHaveBeenCalled();
  });
});
