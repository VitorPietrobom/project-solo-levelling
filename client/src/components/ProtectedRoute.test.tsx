import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import { AuthProvider } from '../contexts/AuthContext';

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

const mockGet = vi.fn();
vi.mock('../lib/apiClient', () => ({
  apiClient: { get: (...args: any[]) => mockGet(...args), post: vi.fn() },
  errorMessage: (_err: any, fallback: string) => fallback,
}));

function renderWithAuth(initialEntries: string[] = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <div>Protected Content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue({ activated: true });
  });

  it('redirects to /login when not authenticated', async () => {
    sessionState = { data: null, isPending: false };
    renderWithAuth();
    expect(await screen.findByText('Login Page')).toBeInTheDocument();
  });

  it('renders children when authenticated and activated', async () => {
    sessionState = {
      data: { user: { id: '1', email: 'user@example.com' }, session: { id: 's1' } },
      isPending: false,
    };
    renderWithAuth();
    expect(await screen.findByText('Protected Content')).toBeInTheDocument();
  });

  it('shows loading state while checking auth', () => {
    sessionState = { data: null, isPending: true };
    renderWithAuth();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows the invite gate instead of children when not activated', async () => {
    mockGet.mockResolvedValue({ activated: false });
    sessionState = {
      data: { user: { id: '1', email: 'user@example.com' }, session: { id: 's1' } },
      isPending: false,
    };
    renderWithAuth();
    expect(await screen.findByLabelText('Invite code')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('fails open (renders children) if the activation check itself fails', async () => {
    mockGet.mockRejectedValue(new Error('network down'));
    sessionState = {
      data: { user: { id: '1', email: 'user@example.com' }, session: { id: 's1' } },
      isPending: false,
    };
    renderWithAuth();
    expect(await screen.findByText('Protected Content')).toBeInTheDocument();
  });
});
