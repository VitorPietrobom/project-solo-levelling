import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BookForm from './BookForm';

const sampleSkills = [
  { id: 's1', name: 'TypeScript' },
  { id: 's2', name: 'Architecture' },
];

describe('BookForm', () => {
  it('renders all form fields', () => {
    render(<BookForm skills={sampleSkills} onCreated={vi.fn()} />);
    expect(screen.getByLabelText('Title')).toBeInTheDocument();
    expect(screen.getByLabelText('Author')).toBeInTheDocument();
    expect(screen.getByLabelText('Total Pages')).toBeInTheDocument();
    expect(screen.getByLabelText('Link to Skill (optional)')).toBeInTheDocument();
    expect(screen.getByText('Add Book')).toBeInTheDocument();
  });

  it('calls onCreated with optimistic book and body on submit', async () => {
    const onCreated = vi.fn();
    render(<BookForm skills={sampleSkills} onCreated={onCreated} />);

    await userEvent.type(screen.getByLabelText('Title'), 'Clean Code');
    await userEvent.type(screen.getByLabelText('Author'), 'Robert Martin');
    await userEvent.type(screen.getByLabelText('Total Pages'), '400');
    await userEvent.click(screen.getByText('Add Book'));

    expect(onCreated).toHaveBeenCalledTimes(1);
    const [optimistic, body] = onCreated.mock.calls[0];
    expect(optimistic.title).toBe('Clean Code');
    expect(optimistic.author).toBe('Robert Martin');
    expect(optimistic.totalPages).toBe(400);
    expect(optimistic.status).toBe('want_to_read');
    expect(optimistic.id).toMatch(/^temp-/);
    expect(body.title).toBe('Clean Code');
    expect(body.author).toBe('Robert Martin');
    expect(body.totalPages).toBe(400);
  });

  it('includes linkedSkillId when a skill is selected', async () => {
    const onCreated = vi.fn();
    render(<BookForm skills={sampleSkills} onCreated={onCreated} />);

    await userEvent.type(screen.getByLabelText('Title'), 'Book');
    await userEvent.type(screen.getByLabelText('Author'), 'Author');
    await userEvent.type(screen.getByLabelText('Total Pages'), '100');
    await userEvent.selectOptions(screen.getByLabelText('Link to Skill (optional)'), 's1');
    await userEvent.click(screen.getByText('Add Book'));

    const [optimistic, body] = onCreated.mock.calls[0];
    expect(optimistic.linkedSkillId).toBe('s1');
    expect(body.linkedSkillId).toBe('s1');
  });

  it('clears form after submit', async () => {
    render(<BookForm skills={sampleSkills} onCreated={vi.fn()} />);

    await userEvent.type(screen.getByLabelText('Title'), 'Book');
    await userEvent.type(screen.getByLabelText('Author'), 'Author');
    await userEvent.type(screen.getByLabelText('Total Pages'), '100');
    await userEvent.click(screen.getByText('Add Book'));

    expect(screen.getByLabelText('Title')).toHaveValue('');
    expect(screen.getByLabelText('Author')).toHaveValue('');
    expect(screen.getByLabelText('Total Pages')).toHaveValue(null);
  });

  it('does not show skill dropdown when no skills', () => {
    render(<BookForm skills={[]} onCreated={vi.fn()} />);
    expect(screen.queryByLabelText('Link to Skill (optional)')).not.toBeInTheDocument();
  });

  it('does not submit with empty fields', async () => {
    const onCreated = vi.fn();
    render(<BookForm skills={[]} onCreated={onCreated} />);
    await userEvent.click(screen.getByText('Add Book'));
    expect(onCreated).not.toHaveBeenCalled();
  });
});
