import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import NoteEditor from './NoteEditor';
import type { Note } from './NoteList';

const sampleNote: Note = {
  id: 'n1',
  title: 'Existing Note',
  tags: ['react', 'hooks'],
  updatedAt: '2024-06-15T10:00:00Z',
  content: 'Some markdown content',
};

describe('NoteEditor', () => {
  it('renders empty form for new note', () => {
    render(<NoteEditor note={null} onSave={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText('New Note')).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveValue('');
    expect(screen.getByLabelText('Content (markdown)')).toHaveValue('');
    expect(screen.getByLabelText('Tags (comma-separated)')).toHaveValue('');
  });

  it('populates form when editing existing note', () => {
    render(<NoteEditor note={sampleNote} onSave={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText('Edit Note')).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveValue('Existing Note');
    expect(screen.getByLabelText('Content (markdown)')).toHaveValue('Some markdown content');
    expect(screen.getByLabelText('Tags (comma-separated)')).toHaveValue('react, hooks');
  });

  it('calls onSave with form data on submit', () => {
    const onSave = vi.fn();
    render(<NoteEditor note={null} onSave={onSave} onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'New Title' } });
    fireEvent.change(screen.getByLabelText('Content (markdown)'), { target: { value: 'Body text' } });
    fireEvent.change(screen.getByLabelText('Tags (comma-separated)'), { target: { value: 'tag1, tag2' } });
    fireEvent.submit(screen.getByText('Create Note'));

    expect(onSave).toHaveBeenCalledWith({
      title: 'New Title',
      content: 'Body text',
      tags: ['tag1', 'tag2'],
    });
  });

  it('does not call onSave when title is empty', () => {
    const onSave = vi.fn();
    render(<NoteEditor note={null} onSave={onSave} onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Content (markdown)'), { target: { value: 'Body' } });
    fireEvent.submit(screen.getByText('Create Note'));

    expect(onSave).not.toHaveBeenCalled();
  });

  it('calls onClose when cancel is clicked', () => {
    const onClose = vi.fn();
    render(<NoteEditor note={null} onSave={vi.fn()} onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows Save Changes button when editing', () => {
    render(<NoteEditor note={sampleNote} onSave={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText('Save Changes')).toBeInTheDocument();
  });
});
