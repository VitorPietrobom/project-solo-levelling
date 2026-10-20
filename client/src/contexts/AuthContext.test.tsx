import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const signOut = vi.fn();
vi.mock('../lib/neonAuth', () => ({
  authClient: {
    useSession: () => ({ data: null, isPending: false }),
    getSession: () => Promise.resolve(null),
    signOut: (...args: unknown[]) => signOut(...args),
    signIn: { email: vi.fn() },
    signUp: { email: vi.fn() },
  },
}));

import { AuthProvider, useAuth } from './AuthContext';

function LogoutButton() {
  const { logout } = useAuth();
  return <button onClick={() => { void logout(); }}>Logout</button>;
}

describe('AuthContext logout', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    signOut.mockReset();
    Object.defineProperty(window, 'location', { configurable: true, value: { href: '/' } });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
  });

  it('redirects to /login after a successful signOut', async () => {
    signOut.mockResolvedValue({});
    render(<AuthProvider><LogoutButton /></AuthProvider>);
    await userEvent.click(screen.getByText('Logout'));
    await waitFor(() => expect(window.location.href).toBe('/login'));
  });

  it('still redirects to /login when signOut rejects', async () => {
    signOut.mockRejectedValue(new Error('network down'));
    render(<AuthProvider><LogoutButton /></AuthProvider>);
    await userEvent.click(screen.getByText('Logout'));
    await waitFor(() => expect(window.location.href).toBe('/login'));
  });
});
