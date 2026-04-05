import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import JournalForm from './JournalForm';

const sampleSkills = [
  { id: 's1', name: 'TypeScript' },
  { id: 's2', name: 'Architecture' },
];

describe('JournalForm', () => {
  it('renders all form fields', () => {
    render(<JournalForm skills={sampleSkills} onCreated={vi.fn()} />);
    expect(screen.getByLabelText('What did you learn?')).toBeInTheDocument();
    expect(screen.getByLabelText('Tags (comma-separated)')).toBeInTheDocument();
    expect(screen.getByLabelText('Date')).toBeInTheDocument();
    expect(screen.getByLabelText('Link to Skill (optional)')).toBeInTheDocument();
    expect(screen.getByText('Add Entry')).toBeInTheDocument();
  });

  it('calls onCreated with optimistic entry and body on submit', async () => {
    const onCreated = vi.fn();
    render(<JournalForm skills={sampleSkills} onCreated={onCreated} />);

    await userEvent.type(screen.getByLabelText('What did you learn?'), 'Learned about closures');
    await userEvent.clear(screen.getByLabelText('Date'));
    await userEvent.type(screen.getByLabelText('Date'), '2024-06-15');
    await userEvent.click(screen.getByText('Add Entry'));

    expect(onCreated).toHaveBeenCalledTimes(1);
    const [optimistic, body] = onCreated.mock.calls[0];
    expect(optimistic.content).toBe('Learned about closures');
    expect(optimistic.id).toMatch(/^temp-/);
    expect(optimistic.date).toBe('2024-06-15');
    expect(body.content).toBe('Learned about closures');
    expect(body.date).toBe('2024-06-15');
  });

  it('parses comma-separated tags', async () => {
    const onCreated = vi.fn();
    render(<JournalForm skills={[]} onCreated={onCreated} />);

    await userEvent.type(screen.getByLabelText('What did you learn?'), 'Test');
    await userEvent.type(screen.getByLabelText('Tags (comma-separated)'), 'react, hooks, state');
    await userEvent.click(screen.getByText('Add Entry'));

    const [optimistic, body] = onCreated.mock.calls[0];
    expect(optimistic.tags).toEqual(['react', 'hooks', 'state']);
    expect(body.tags).toEqual(['react', 'hooks', 'state']);
  });

  it('includes linkedSkillId when a skill is selected', async () => {
    const onCreated = vi.fn();
    render(<JournalForm skills={sampleSkills} onCreated={onCreated} />);

    await userEvent.type(screen.getByLabelText('What did you learn?'), 'Practiced TS');
    await userEvent.selectOptions(screen.getByLabelText('Link to Skill (optional)'), 's1');
    await userEvent.click(screen.getByText('Add Entry'));

    const [optimistic, body] = onCreated.mock.calls[0];
    expect(optimistic.linkedSkillId).toBe('s1');
    expect(body.linkedSkillId).toBe('s1');
  });

  it('clears form after submit', async () => {
    render(<JournalForm skills={sampleSkills} onCreated={vi.fn()} />);

    await userEvent.type(screen.getByLabelText('What did you learn?'), 'Test');
    await userEvent.type(screen.getByLabelText('Tags (comma-separated)'), 'tag1');
    await userEvent.click(screen.getByText('Add Entry'));

    expect(screen.getByLabelText('What did you learn?')).toHaveValue('');
    expect(screen.getByLabelText('Tags (comma-separated)')).toHaveValue('');
  });

  it('does not show skill dropdown when no skills', () => {
    render(<JournalForm skills={[]} onCreated={vi.fn()} />);
    expect(screen.queryByLabelText('Link to Skill (optional)')).not.toBeInTheDocument();
  });

  it('does not submit with empty content', async () => {
    const onCreated = vi.fn();
    render(<JournalForm skills={[]} onCreated={onCreated} />);
    await userEvent.click(screen.getByText('Add Entry'));
    expect(onCreated).not.toHaveBeenCalled();
  });
});
