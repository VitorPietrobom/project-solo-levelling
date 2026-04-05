import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import NoteViewer from './NoteViewer';
import type { Note } from './NoteList';

const sampleNote: Note = {
  id: 'n1',
  title: 'My Note',
  tags: ['react', 'hooks'],
  updatedAt: '2024-06-15T10:00:00Z',
  content: 'This is the note body.\nWith multiple lines.',
};

describe('NoteViewer', () => {
  it('renders note title and content', () => {
    render(<NoteViewer note={sampleNote} onEdit={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText('My Note')).toBeInTheDocument();
    expect(screen.getByText((_content, element) =>
      element?.tagName === 'PRE' && element.textContent === 'This is the note body.\nWith multiple lines.',
    )).toBeInTheDocument();
  });

  it('renders tags', () => {
    render(<NoteViewer note={sampleNote} onEdit={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText('react')).toBeInTheDocument();
    expect(screen.getByText('hooks')).toBeInTheDocument();
  });

  it('shows not found state when note is null', () => {
    render(<NoteViewer note={null} onEdit={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText('Note not found.')).toBeInTheDocument();
  });

  it('calls onEdit when edit button is clicked', () => {
    const onEdit = vi.fn();
    render(<NoteViewer note={sampleNote} onEdit={onEdit} onClose={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Edit note'));
    expect(onEdit).toHaveBeenCalled();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<NoteViewer note={sampleNote} onEdit={vi.fn()} onClose={onClose} />);
    fireEvent.click(screen.getByLabelText('Close viewer'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows "No content." when content is empty', () => {
    const emptyNote: Note = { ...sampleNote, content: '' };
    render(<NoteViewer note={emptyNote} onEdit={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText('No content.')).toBeInTheDocument();
  });

  it('shows last updated date', () => {
    render(<NoteViewer note={sampleNote} onEdit={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
  });
});
