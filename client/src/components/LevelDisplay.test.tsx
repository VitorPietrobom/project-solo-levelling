import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import LevelDisplay from './LevelDisplay';

const mockGet = vi.fn();
vi.mock('../lib/apiClient', () => ({
  apiClient: { get: (...args: any[]) => mockGet(...args) },
}));

describe('LevelDisplay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders level and XP progress after loading', async () => {
    mockGet.mockResolvedValue({
      level: 2,
      totalXP: 350,
      progress: { current: 50, required: 300, percentage: 16.67 },
    });

    render(<LevelDisplay />);

    await waitFor(() => {
      expect(screen.getByText('Level 2')).toBeInTheDocument();
    });

    expect(screen.getByText('350 XP total')).toBeInTheDocument();
    expect(screen.getByText('50 / 300 XP')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
  });

  it('shows loading state initially', () => {
    mockGet.mockReturnValue(new Promise(() => {})); // never resolves
    render(<LevelDisplay />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows error message on failure', async () => {
    mockGet.mockRejectedValue(new Error('Network error'));

    render(<LevelDisplay />);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });
});
