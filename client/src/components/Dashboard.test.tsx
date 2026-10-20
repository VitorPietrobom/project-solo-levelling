import { act, render, screen, waitFor } from '@testing-library/react';
import { apiClient } from '../lib/apiClient';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Dashboard, { useAriseRefreshStatus } from './Dashboard';
import { AuthProvider } from '../contexts/AuthContext';
import { ToastProvider } from '../contexts/ToastContext';

let sessionState: { data: unknown; isPending: boolean } = { data: null, isPending: false };
vi.mock('../lib/neonAuth', () => ({
  authClient: {
    useSession: () => sessionState,
    signIn: { email: vi.fn() },
    signUp: { email: vi.fn() },
    signOut: vi.fn(),
    getSession: vi.fn(),
  },
  getAuthToken: vi.fn(),
}));

function renderDashboard() {
  sessionState = {
    data: { user: { id: '1', email: 'user@test.com' }, session: { id: 's1' } },
    isPending: false,
  };

  return render(
    <MemoryRouter initialEntries={['/']}>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Dashboard />}>
              <Route index element={<div>Gamification Content</div>} />
              <Route path="body" element={<div>Body Content</div>} />
            </Route>
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the header with title and logout button', async () => {
    renderDashboard();
    expect(await screen.findByText('Project Arise')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
  });

  it('renders the sidebar navigation', async () => {
    renderDashboard();
    expect(await screen.findByRole('button', { name: /status/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /body/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /diet/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /learning/i })).toBeInTheDocument();
  });

  it('renders child route content via Outlet', async () => {
    renderDashboard();
    expect(await screen.findByText('Gamification Content')).toBeInTheDocument();
  });

  it('refreshStatus refetches header XP and level from the server', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      level: 2, totalXP: 150, streak: 1, progress: { current: 50, required: 200, percentage: 25 },
    });
    renderDashboard();
    expect(await screen.findByText('150')).toBeInTheDocument();

    getSpy.mockResolvedValueOnce({
      level: 2, totalXP: 90, streak: 1, progress: { current: 10, required: 200, percentage: 5 },
    });
    // Un-completing something server-side: no local math, just a refetch.
    await act(async () => { useAriseRefreshStatus()(); });
    await waitFor(() => expect(screen.getByText('90')).toBeInTheDocument());
    expect(getSpy).toHaveBeenCalledWith('/api/gamification/status');
    getSpy.mockRestore();
  });
});
