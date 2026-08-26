import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

const { ApiError } = vi.hoisted(() => ({
  ApiError: class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();
const mockDelete = vi.fn();
vi.mock('../lib/apiClient', () => ({
  apiClient: {
    get: (...args: any[]) => mockGet(...args),
    post: (...args: any[]) => mockPost(...args),
    patch: (...args: any[]) => mockPatch(...args),
    delete: (...args: any[]) => mockDelete(...args),
  },
  ApiError,
  errorMessage: (err: any, fallback: string) => (err instanceof ApiError ? err.message : fallback),
}));

const mockShowToast = vi.fn();
vi.mock('../contexts/ToastContext', () => ({
  useToast: () => ({ showToast: mockShowToast }),
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
    mockPatch.mockResolvedValue({});
    mockDelete.mockResolvedValue({});
  });

  it('formats the "since" date instead of showing a raw ISO timestamp', async () => {
    render(<BodyTab />);
    await waitFor(() => expect(screen.getByText(/since/)).toBeInTheDocument());
    expect(screen.getByText('since Jun 6')).toBeInTheDocument();
    expect(screen.queryByText(/2026-06-06T00:00:00/)).not.toBeInTheDocument();
  });

  it('surfaces the server error instead of silently discarding a failed weigh-in', async () => {
    mockPost.mockRejectedValue(new ApiError('Weight entry already exists for this date', 409));
    render(<BodyTab />);
    await waitFor(() => expect(screen.getByText('since Jun 6')).toBeInTheDocument());

    await userEvent.click(screen.getByText('Log Weight'));
    await userEvent.type(screen.getByLabelText('Weight in kg'), '80');
    await userEvent.click(screen.getByText('Log Entry'));

    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('Weight entry already exists for this date'));
  });

  it('edits a weight entry in place via PATCH', async () => {
    render(<BodyTab />);
    await waitFor(() => expect(screen.getByText('since Jun 6')).toBeInTheDocument());

    await userEvent.click(screen.getByLabelText('Edit weight entry from Aug 5'));
    const input = screen.getByLabelText('Edit weight for Aug 5');
    await userEvent.clear(input);
    await userEvent.type(input, '86.5');
    await userEvent.click(screen.getByLabelText('Save weight edit'));

    await waitFor(() => expect(mockPatch).toHaveBeenCalledWith('/api/weight/w2', { body: { weight: 86.5 } }));
  });

  it('deletes a weight entry', async () => {
    render(<BodyTab />);
    await waitFor(() => expect(screen.getByText('since Jun 6')).toBeInTheDocument());

    await userEvent.click(screen.getByLabelText('Delete weight entry from Aug 5'));

    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith('/api/weight/w2'));
    expect(screen.queryByText('87.2 kg')).not.toBeInTheDocument();
  });

  it('rolls back and shows a toast when deleting a weight entry fails', async () => {
    mockDelete.mockRejectedValue(new Error('nope'));
    render(<BodyTab />);
    await waitFor(() => expect(screen.getByText('since Jun 6')).toBeInTheDocument());

    await userEvent.click(screen.getByLabelText('Delete weight entry from Aug 5'));

    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('Failed to delete weight entry'));
    expect(screen.getByText('87.2 kg')).toBeInTheDocument();
  });
});

describe('BodyTab measurements card', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockImplementation((url: string) => {
      if (url === '/api/measurements') {
        return Promise.resolve([
          { id: 'm1', type: 'chest', value: 100, date: '2026-06-06T00:00:00.000Z' },
        ]);
      }
      if (url === '/api/whoop/status') return Promise.resolve({ connected: false });
      return Promise.resolve([]);
    });
    mockPatch.mockResolvedValue({});
    mockDelete.mockResolvedValue({});
  });

  it('edits a measurement in place via PATCH', async () => {
    render(<BodyTab />);
    await waitFor(() => expect(screen.getByLabelText('Edit Chest · Jun 6')).toBeInTheDocument());

    await userEvent.click(screen.getByLabelText('Edit Chest · Jun 6'));
    const input = screen.getByLabelText('Edit value for Chest · Jun 6');
    await userEvent.clear(input);
    await userEvent.type(input, '101');
    await userEvent.click(screen.getByLabelText('Save measurement edit'));

    await waitFor(() => expect(mockPatch).toHaveBeenCalledWith('/api/measurements/m1', { body: { value: 101 } }));
  });

  it('deletes a measurement', async () => {
    render(<BodyTab />);
    await waitFor(() => expect(screen.getByLabelText('Delete Chest · Jun 6')).toBeInTheDocument());

    await userEvent.click(screen.getByLabelText('Delete Chest · Jun 6'));

    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith('/api/measurements/m1'));
  });
});

describe('BodyTab gym sessions card', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockImplementation((url: string) => {
      if (url === '/api/whoop/status') return Promise.resolve({ connected: false });
      return Promise.resolve([]);
    });
    mockPost.mockResolvedValue({ id: 's1', date: '2026-08-25', notes: '', exercises: [{ id: 'ex1', name: 'Bench Press', sets: 3, reps: 10, weight: 80, muscleGroups: [{ muscleGroup: 'chest' }] }] });
  });

  it('logs a manual gym session without needing the Hevy JSON import', async () => {
    render(<BodyTab />);
    await waitFor(() => expect(screen.getByText('Log Session')).toBeInTheDocument());

    await userEvent.click(screen.getByText('Log Session'));
    await userEvent.type(screen.getByLabelText('Exercise 1 name'), 'Bench Press');
    await userEvent.click(screen.getByText('chest'));
    await userEvent.click(screen.getByText('Save Session'));

    await waitFor(() => expect(mockPost).toHaveBeenCalledWith('/api/gym-sessions', {
      body: expect.objectContaining({
        exercises: [expect.objectContaining({ name: 'Bench Press', muscleGroups: ['chest'] })],
      }),
    }));
  });
});
