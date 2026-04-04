import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './Dashboard';
import { AuthProvider } from '../contexts/AuthContext';

const mockGetSession = vi.fn();
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

function renderDashboard() {
  mockGetSession.mockResolvedValue({
    data: { session: { user: { id: '1', email: 'user@test.com' }, access_token: 'tok' } },
  });

  return render(
    <MemoryRouter initialEntries={['/']}>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Dashboard />}>
            <Route index element={<div>Gamification Content</div>} />
            <Route path="body" element={<div>Body Content</div>} />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the header with title and logout button', async () => {
    renderDashboard();
    expect(await screen.findByText('Level Up Portal')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
  });

  it('renders the tab navigation', async () => {
    renderDashboard();
    expect(await screen.findByRole('tab', { name: 'Gamification' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Body' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Diet' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Learning' })).toBeInTheDocument();
  });

  it('renders child route content via Outlet', async () => {
    renderDashboard();
    expect(await screen.findByText('Gamification Content')).toBeInTheDocument();
  });
});
