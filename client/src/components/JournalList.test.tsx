import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import JournalList from './JournalList';
import type { JournalEntry } from './JournalList';

const sampleEntries: JournalEntry[] = [
  { id: 'j1', content: 'Learned React hooks', tags: ['react', 'hooks'], linkedSkillId: null, date: '2024-06-15' },
  { id: 'j2', content: 'Studied TypeScript generics', tags: ['typescript'], linkedSkillId: 'skill-1', date: '2024-06-15' },
  { id: 'j3', content: 'Read about design patterns', tags: [], linkedSkillId: null, date: '2024-06-14' },
];

describe('JournalList', () => {
  it('renders entries grouped by date', () => {
    render(<JournalList entries={sampleEntries} onDelete={vi.fn()} />);
    expect(screen.getByText('Learned React hooks')).toBeInTheDocument();
    expect(screen.getByText('Studied TypeScript generics')).toBeInTheDocument();
    expect(screen.getByText('Read about design patterns')).toBeInTheDocument();
  });

  it('shows date headers', () => {
    render(<JournalList entries={sampleEntries} onDelete={vi.fn()} />);
    const headers = screen.getAllByRole('heading', { level: 4 });
    expect(headers.length).toBe(2);
  });

  it('shows tag badges', () => {
    render(<JournalList entries={sampleEntries} onDelete={vi.fn()} />);
    expect(screen.getByText('react')).toBeInTheDocument();
    expect(screen.getByText('hooks')).toBeInTheDocument();
    expect(screen.getByText('typescript')).toBeInTheDocument();
  });

  it('shows linked skill indicator', () => {
    render(<JournalList entries={sampleEntries} onDelete={vi.fn()} />);
    expect(screen.getByText('🔗 Linked skill')).toBeInTheDocument();
  });

  it('shows empty state when no entries', () => {
    render(<JournalList entries={[]} onDelete={vi.fn()} />);
    expect(screen.getByText('No journal entries yet.')).toBeInTheDocument();
  });

  it('calls onDelete when clicking delete button', async () => {
    const onDelete = vi.fn();
    render(<JournalList entries={sampleEntries} onDelete={onDelete} />);
    const deleteButtons = screen.getAllByLabelText('Delete journal entry');
    await userEvent.click(deleteButtons[0]);
    expect(onDelete).toHaveBeenCalledWith('j1');
  });
});
