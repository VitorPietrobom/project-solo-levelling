import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SkillForm from './SkillForm';

describe('SkillForm', () => {
  const onCreated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders form fields', () => {
    render(<SkillForm onCreated={onCreated} />);
    expect(screen.getByLabelText('Skill name')).toBeInTheDocument();
    expect(screen.getByText('Create Skill')).toBeInTheDocument();
  });

  it('calls onCreated with optimistic skill on submit', async () => {
    render(<SkillForm onCreated={onCreated} />);

    await userEvent.type(screen.getByLabelText('Skill name'), 'Guitar');
    await userEvent.click(screen.getByText('Create Skill'));

    expect(onCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Guitar',
        totalXP: 0,
        level: 0,
        progress: { current: 0, required: 100, percentage: 0 },
      }),
      { name: 'Guitar' },
    );
  });

  it('shows validation error when name is empty', async () => {
    render(<SkillForm onCreated={onCreated} />);
    await userEvent.click(screen.getByText('Create Skill'));

    expect(screen.getByText('Skill name is required')).toBeInTheDocument();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('resets form after successful submit', async () => {
    render(<SkillForm onCreated={onCreated} />);

    await userEvent.type(screen.getByLabelText('Skill name'), 'Piano');
    await userEvent.click(screen.getByText('Create Skill'));

    expect((screen.getByLabelText('Skill name') as HTMLInputElement).value).toBe('');
  });

  it('trims whitespace from skill name', async () => {
    render(<SkillForm onCreated={onCreated} />);

    await userEvent.type(screen.getByLabelText('Skill name'), '  Guitar  ');
    await userEvent.click(screen.getByText('Create Skill'));

    expect(onCreated).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Guitar' }),
      { name: 'Guitar' },
    );
  });
});
