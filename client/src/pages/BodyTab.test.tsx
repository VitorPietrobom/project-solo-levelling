import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import BodyTab from './BodyTab';

// Recharts needs a ResizeObserver jsdom doesn't provide; other tests in this
// codebase avoid it the same way (see WeightChart.test.tsx).
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="chart-container">{children}</div>,
  LineChart: ({ children }: any) => <div>{children}</div>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}));

const mockGet = vi.fn();
vi.mock('../lib/apiClient', () => ({
  apiClient: {
    get: (...args: any[]) => mockGet(...args),
    post: vi.fn().mockResolvedValue({}),
    patch: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
  },
}));

describe('BodyTab weight card', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockImplementation((url: string) => {
      if (url === '/api/weight') {
        return Promise.resolve([
          { id: 'w1', weight: 88.0, date: '2026-06-06T00:00:00.000Z' },
          { id: 'w2', weight: 87.2, date: '2026-08-05T00:00:00.000Z' },
        ]);
      }
      if (url === '/api/whoop/status') return Promise.resolve({ connected: false });
      return Promise.resolve([]);
    });
  });

  it('formats the "since" date instead of showing a raw ISO timestamp', async () => {
    render(<BodyTab />);
    await waitFor(() => expect(screen.getByText(/since/)).toBeInTheDocument());
    expect(screen.getByText('since Jun 6')).toBeInTheDocument();
    expect(screen.queryByText(/2026-06-06T00:00:00/)).not.toBeInTheDocument();
  });
});
