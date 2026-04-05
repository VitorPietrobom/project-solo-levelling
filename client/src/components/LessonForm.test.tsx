import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LessonForm from './LessonForm';

const sampleSkills = [
  { id: 's1', name: 'TypeScript' },
  { id: 's2', name: 'Architecture' },
];

describe('LessonForm', () => {
  it('renders all form fields', () => {
    render(<LessonForm skills={sampleSkills} onCreated={vi.fn()} />);
    expect(screen.getByLabelText('Lesson learned')).toBeInTheDocument();
    expect(screen.getByLabelText('Tags (comma-separated)')).toBeInTheDocument();
    expect(screen.getByLabelText('Date')).toBeInTheDocument();
    expect(screen.getByLabelText('Link to Skill (optional)')).toBeInTheDocument();
    expect(screen.getByText('Add Lesson')).toBeInTheDocument();
  });

  it('calls onCreated with optimistic entry and body on submit', async () => {
    const onCreated = vi.fn();
    render(<LessonForm skills={sampleSkills} onCreated={onCreated} />);

    await userEvent.type(screen.getByLabelText('Lesson learned'), 'Always write tests first');
    await userEvent.clear(screen.getByLabelText('Date'));
    await userEvent.type(screen.getByLabelText('Date'), '2024-06-15');
    await userEvent.click(screen.getByText('Add Lesson'));

    expect(onCreated).toHaveBeenCalledTimes(1);
    const [optimistic, body] = onCreated.mock.calls[0];
    expect(optimistic.content).toBe('Always write tests first');
    expect(optimistic.id).toMatch(/^temp-/);
    expect(optimistic.date).toBe('2024-06-15');
    expect(body.content).toBe('Always write tests first');
    expect(body.date).toBe('2024-06-15');
  });

  it('parses comma-separated tags', async () => {
    const onCreated = vi.fn();
    render(<LessonForm skills={[]} onCreated={onCreated} />);

    await userEvent.type(screen.getByLabelText('Lesson learned'), 'Test lesson');
    await userEvent.type(screen.getByLabelText('Tags (comma-separated)'), 'debugging, testing, tdd');
    await userEvent.click(screen.getByText('Add Lesson'));

    const [optimistic, body] = onCreated.mock.calls[0];
    expect(optimistic.tags).toEqual(['debugging', 'testing', 'tdd']);
    expect(body.tags).toEqual(['debugging', 'testing', 'tdd']);
  });

  it('includes linkedSkillId when a skill is selected', async () => {
    const onCreated = vi.fn();
    render(<LessonForm skills={sampleSkills} onCreated={onCreated} />);

    await userEvent.type(screen.getByLabelText('Lesson learned'), 'Practice TS');
    await userEvent.selectOptions(screen.getByLabelText('Link to Skill (optional)'), 's1');
    await userEvent.click(screen.getByText('Add Lesson'));

    const [optimistic, body] = onCreated.mock.calls[0];
    expect(optimistic.linkedSkillId).toBe('s1');
    expect(body.linkedSkillId).toBe('s1');
  });

  it('clears form after submit', async () => {
    render(<LessonForm skills={sampleSkills} onCreated={vi.fn()} />);

    await userEvent.type(screen.getByLabelText('Lesson learned'), 'Test');
    await userEvent.type(screen.getByLabelText('Tags (comma-separated)'), 'tag1');
    await userEvent.click(screen.getByText('Add Lesson'));

    expect(screen.getByLabelText('Lesson learned')).toHaveValue('');
    expect(screen.getByLabelText('Tags (comma-separated)')).toHaveValue('');
  });

  it('does not show skill dropdown when no skills', () => {
    render(<LessonForm skills={[]} onCreated={vi.fn()} />);
    expect(screen.queryByLabelText('Link to Skill (optional)')).not.toBeInTheDocument();
  });

  it('does not submit with empty content', async () => {
    const onCreated = vi.fn();
    render(<LessonForm skills={[]} onCreated={onCreated} />);
    await userEvent.click(screen.getByText('Add Lesson'));
    expect(onCreated).not.toHaveBeenCalled();
  });
});
