import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InviteCodeAdmin from './InviteCodeAdmin';

const mockGet = vi.fn();
const mockPost = vi.fn();

const { ApiError } = vi.hoisted(() => ({
  ApiError: class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

vi.mock('../lib/apiClient', () => ({
  apiClient: {
    get: (...args: any[]) => mockGet(...args),
    post: (...args: any[]) => mockPost(...args),
  },
  ApiError,
  errorMessage: (err: any, fallback: string) => (err instanceof ApiError ? err.message : fallback),
}));

const mockShowToast = vi.fn();
vi.mock('../contexts/ToastContext', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('InviteCodeAdmin', () => {
  it('renders nothing for a non-admin (403)', async () => {
    mockGet.mockRejectedValue(new ApiError('Admin access required', 403));
    const { container } = render(<InviteCodeAdmin />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('shows an empty state for the admin with no codes yet', async () => {
    mockGet.mockResolvedValue([]);
    render(<InviteCodeAdmin />);
    expect(await screen.findByText(/No codes yet/)).toBeInTheDocument();
  });

  it('lists existing codes, marking used ones with who redeemed them', async () => {
    mockGet.mockResolvedValue([
      { id: 'i1', code: 'ABCD1234', createdAt: '2026-08-01T00:00:00.000Z', redeemedAt: null, redeemedBy: null },
      { id: 'i2', code: 'WXYZ5678', createdAt: '2026-08-01T00:00:00.000Z', redeemedAt: '2026-08-05T00:00:00.000Z', redeemedBy: { email: 'friend@example.com' } },
    ]);
    render(<InviteCodeAdmin />);

    expect(await screen.findByText('ABCD1234')).toBeInTheDocument();
    expect(screen.getByText('WXYZ5678')).toBeInTheDocument();
    expect(screen.getByText(/used by friend@example.com/)).toBeInTheDocument();
  });

  it('generates a new code and prepends it to the list', async () => {
    mockGet.mockResolvedValue([]);
    mockPost.mockResolvedValue({ id: 'i3', code: 'NEWCODE1', createdAt: '2026-08-25T00:00:00.000Z', redeemedAt: null, redeemedBy: null });
    render(<InviteCodeAdmin />);
    await waitFor(() => expect(screen.getByText('New Code')).toBeInTheDocument());

    await userEvent.click(screen.getByText('New Code'));

    expect(await screen.findByText('NEWCODE1')).toBeInTheDocument();
    expect(mockPost).toHaveBeenCalledWith('/api/invite/codes');
  });

  it('shows a toast if generating a code fails', async () => {
    mockGet.mockResolvedValue([]);
    mockPost.mockRejectedValue(new Error('boom'));
    render(<InviteCodeAdmin />);
    await waitFor(() => expect(screen.getByText('New Code')).toBeInTheDocument());

    await userEvent.click(screen.getByText('New Code'));

    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('Failed to generate invite code'));
  });
});
