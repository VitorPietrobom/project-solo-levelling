import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LessonsList from './LessonsList';
import type { Lesson } from './LessonsList';

const sampleLessons: Lesson[] = [
  { id: 'l1', content: 'Always validate inputs', tags: ['security', 'backend'], linkedSkillId: null, date: '2024-06-15' },
  { id: 'l2', content: 'Use error boundaries in React', tags: ['react'], linkedSkillId: 'skill-1', date: '2024-06-14' },
];

describe('LessonsList', () => {
  it('renders lessons with content', () => {
    render(<LessonsList lessons={sampleLessons} onDelete={vi.fn()} searchTerm="" onSearchChange={vi.fn()} />);
    expect(screen.getByText('Always validate inputs')).toBeInTheDocument();
    expect(screen.getByText('Use error boundaries in React')).toBeInTheDocument();
  });

  it('shows tag badges', () => {
    render(<LessonsList lessons={sampleLessons} onDelete={vi.fn()} searchTerm="" onSearchChange={vi.fn()} />);
    expect(screen.getByText('security')).toBeInTheDocument();
    expect(screen.getByText('backend')).toBeInTheDocument();
    expect(screen.getByText('react')).toBeInTheDocument();
  });

  it('shows linked skill indicator', () => {
    render(<LessonsList lessons={sampleLessons} onDelete={vi.fn()} searchTerm="" onSearchChange={vi.fn()} />);
    expect(screen.getByText('🔗 Linked skill')).toBeInTheDocument();
  });

  it('shows search input', () => {
    render(<LessonsList lessons={sampleLessons} onDelete={vi.fn()} searchTerm="" onSearchChange={vi.fn()} />);
    expect(screen.getByLabelText('Search lessons')).toBeInTheDocument();
  });

  it('calls onSearchChange when typing in search', async () => {
    const onSearchChange = vi.fn();
    render(<LessonsList lessons={sampleLessons} onDelete={onSearchChange} searchTerm="" onSearchChange={onSearchChange} />);
    await userEvent.type(screen.getByLabelText('Search lessons'), 'react');
    expect(onSearchChange).toHaveBeenCalled();
  });

  it('shows empty state when no lessons', () => {
    render(<LessonsList lessons={[]} onDelete={vi.fn()} searchTerm="" onSearchChange={vi.fn()} />);
    expect(screen.getByText('No lessons found.')).toBeInTheDocument();
  });

  it('calls onDelete when clicking delete button', async () => {
    const onDelete = vi.fn();
    render(<LessonsList lessons={sampleLessons} onDelete={onDelete} searchTerm="" onSearchChange={vi.fn()} />);
    const deleteButtons = screen.getAllByLabelText('Delete lesson');
    await userEvent.click(deleteButtons[0]);
    expect(onDelete).toHaveBeenCalledWith('l1');
  });

  it('shows formatted dates', () => {
    render(<LessonsList lessons={sampleLessons} onDelete={vi.fn()} searchTerm="" onSearchChange={vi.fn()} />);
    expect(screen.getByText('Jun 15, 2024')).toBeInTheDocument();
    expect(screen.getByText('Jun 14, 2024')).toBeInTheDocument();
  });
});
