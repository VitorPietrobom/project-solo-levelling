import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import NoteList from './NoteList';
import type { Note } from './NoteList';

const sampleNotes: Note[] = [
  { id: 'n1', title: 'React Hooks', tags: ['react', 'hooks'], updatedAt: '2024-06-15T10:00:00Z' },
  { id: 'n2', title: 'TypeScript Tips', tags: ['typescript'], updatedAt: '2024-06-14T10:00:00Z' },
];

describe('NoteList', () => {
  it('renders note cards', () => {
    render(
      <NoteList notes={sampleNotes} onSelect={vi.fn()} onDelete={vi.fn()} searchTerm="" onSearchChange={vi.fn()} />,
    );
    expect(screen.getByText('React Hooks')).toBeInTheDocument();
    expect(screen.getByText('TypeScript Tips')).toBeInTheDocument();
  });

  it('renders tags on cards', () => {
    render(
      <NoteList notes={sampleNotes} onSelect={vi.fn()} onDelete={vi.fn()} searchTerm="" onSearchChange={vi.fn()} />,
    );
    expect(screen.getByText('react')).toBeInTheDocument();
    expect(screen.getByText('hooks')).toBeInTheDocument();
    expect(screen.getByText('typescript')).toBeInTheDocument();
  });

  it('shows empty state when no notes', () => {
    render(
      <NoteList notes={[]} onSelect={vi.fn()} onDelete={vi.fn()} searchTerm="" onSearchChange={vi.fn()} />,
    );
    expect(screen.getByText('No notes yet. Create one to get started.')).toBeInTheDocument();
  });

  it('shows search empty state', () => {
    render(
      <NoteList notes={[]} onSelect={vi.fn()} onDelete={vi.fn()} searchTerm="xyz" onSearchChange={vi.fn()} />,
    );
    expect(screen.getByText('No notes match your search.')).toBeInTheDocument();
  });

  it('calls onSelect when clicking a card', () => {
    const onSelect = vi.fn();
    render(
      <NoteList notes={sampleNotes} onSelect={onSelect} onDelete={vi.fn()} searchTerm="" onSearchChange={vi.fn()} />,
    );
    fireEvent.click(screen.getByText('React Hooks'));
    expect(onSelect).toHaveBeenCalledWith('n1');
  });

  it('calls onDelete when clicking delete button', () => {
    const onDelete = vi.fn();
    render(
      <NoteList notes={sampleNotes} onSelect={vi.fn()} onDelete={onDelete} searchTerm="" onSearchChange={vi.fn()} />,
    );
    const deleteButtons = screen.getAllByText('✕');
    fireEvent.click(deleteButtons[0]);
    expect(onDelete).toHaveBeenCalledWith('n1');
  });

  it('calls onSearchChange when typing in search', () => {
    const onSearchChange = vi.fn();
    render(
      <NoteList notes={sampleNotes} onSelect={vi.fn()} onDelete={vi.fn()} searchTerm="" onSearchChange={onSearchChange} />,
    );
    fireEvent.change(screen.getByLabelText('Search notes'), { target: { value: 'react' } });
    expect(onSearchChange).toHaveBeenCalledWith('react');
  });

  it('renders search input with current value', () => {
    render(
      <NoteList notes={sampleNotes} onSelect={vi.fn()} onDelete={vi.fn()} searchTerm="hooks" onSearchChange={vi.fn()} />,
    );
    expect(screen.getByLabelText('Search notes')).toHaveValue('hooks');
  });
});
