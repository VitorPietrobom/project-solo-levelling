import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SkillList from './SkillList';
import type { Skill } from './SkillList';

const sampleSkills: Skill[] = [
  {
    id: 'sk1',
    name: 'Guitar',
    totalXP: 150,
    level: 1,
    progress: { current: 50, required: 200, percentage: 25 },
  },
  {
    id: 'sk2',
    name: 'Cooking',
    totalXP: 350,
    level: 2,
    progress: { current: 50, required: 300, percentage: 16.67 },
  },
];

describe('SkillList', () => {
  it('renders skills with name, level, and XP progress', () => {
    render(<SkillList skills={sampleSkills} onLog={vi.fn()} />);
    expect(screen.getByText('Guitar')).toBeInTheDocument();
    expect(screen.getByText('Lv.1')).toBeInTheDocument();
    expect(screen.getByText('50 / 200 XP')).toBeInTheDocument();
    expect(screen.getByText('Cooking')).toBeInTheDocument();
    expect(screen.getByText('Lv.2')).toBeInTheDocument();
  });

  it('shows empty state when no skills', () => {
    render(<SkillList skills={[]} onLog={vi.fn()} />);
    expect(screen.getByText('No skills yet. Create one to get started.')).toBeInTheDocument();
  });

  it('renders progress bars with correct aria attributes', () => {
    render(<SkillList skills={sampleSkills} onLog={vi.fn()} />);
    const bars = screen.getAllByRole('progressbar');
    expect(bars).toHaveLength(2);
    expect(bars[0]).toHaveAttribute('aria-valuenow', '50');
    expect(bars[0]).toHaveAttribute('aria-valuemax', '200');
    expect(bars[0]).toHaveAttribute('aria-label', 'Guitar XP progress: 50 of 200');
  });

  it('calls onLog when clicking Log XP button', async () => {
    const onLog = vi.fn();
    render(<SkillList skills={sampleSkills} onLog={onLog} />);

    await userEvent.click(screen.getByLabelText('Log XP for Guitar'));
    expect(onLog).toHaveBeenCalledWith('sk1', 10);
  });
});
