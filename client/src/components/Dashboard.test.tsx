import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './Dashboard';
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
});
