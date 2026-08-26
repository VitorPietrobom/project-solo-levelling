import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InviteGate from './InviteGate';

const mockPost = vi.fn();
vi.mock('../lib/apiClient', () => ({
  apiClient: { post: (...args: any[]) => mockPost(...args) },
  errorMessage: (_err: any, fallback: string) => fallback,
}));

const mockLogout = vi.fn();
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ logout: mockLogout }),
}));

describe('InviteGate', () => {
  it('requires a non-empty code', async () => {
    render(<InviteGate onActivated={vi.fn()} />);
    await userEvent.click(screen.getByText('Enter'));
    expect(screen.getByText('Enter your invite code')).toBeInTheDocument();
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('redeems a code and calls onActivated', async () => {
    mockPost.mockResolvedValue({ activated: true });
    const onActivated = vi.fn();
    render(<InviteGate onActivated={onActivated} />);

    await userEvent.type(screen.getByLabelText('Invite code'), 'arise-alpha');
    await userEvent.click(screen.getByText('Enter'));

    await waitFor(() => expect(mockPost).toHaveBeenCalledWith('/api/invite/redeem', { body: { code: 'arise-alpha' } }));
    expect(onActivated).toHaveBeenCalled();
  });

  it('shows a server error and does not call onActivated on an invalid code', async () => {
    mockPost.mockRejectedValue(new Error('Invalid invite code'));
    const onActivated = vi.fn();
    render(<InviteGate onActivated={onActivated} />);

    await userEvent.type(screen.getByLabelText('Invite code'), 'wrong');
    await userEvent.click(screen.getByText('Enter'));

    await waitFor(() => expect(screen.getByText('Failed to redeem invite code')).toBeInTheDocument());
    expect(onActivated).not.toHaveBeenCalled();
  });

  it('lets a stuck tester sign out', async () => {
    render(<InviteGate onActivated={vi.fn()} />);
    await userEvent.click(screen.getByText('Sign out'));
    expect(mockLogout).toHaveBeenCalled();
  });
});
