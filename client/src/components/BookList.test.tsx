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
    // Column headers are h4 elements
    const headers = screen.getAllByRole('heading', { level: 4 });
    const headerTexts = headers.map((h) => h.textContent);
    expect(headerTexts).toContain('Want to Read');
    expect(headerTexts).toContain('Reading');
    expect(headerTexts).toContain('Finished');
  });

  it('places books in correct columns', () => {
    render(<BookList books={sampleBooks} onUpdateStatus={vi.fn()} onUpdateProgress={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('Clean Code')).toBeInTheDocument();
    expect(screen.getByText('Refactoring')).toBeInTheDocument();
    expect(screen.getByText('Design Patterns')).toBeInTheDocument();
  });

  it('shows empty state when no books', () => {
    render(<BookList books={[]} onUpdateStatus={vi.fn()} onUpdateProgress={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('No books yet. Add one to get started.')).toBeInTheDocument();
  });

  it('shows page count for each book', () => {
    render(<BookList books={sampleBooks} onUpdateStatus={vi.fn()} onUpdateProgress={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('0 / 400 pages')).toBeInTheDocument();
    expect(screen.getByText('150 / 300 pages')).toBeInTheDocument();
    expect(screen.getByText('350 / 350 pages')).toBeInTheDocument();
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
});
