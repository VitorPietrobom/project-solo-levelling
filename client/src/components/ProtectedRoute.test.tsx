import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import { AuthProvider } from '../contexts/AuthContext';

const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn(() => ({
  data: { subscription: { unsubscribe: vi.fn() } },
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      onAuthStateChange: () => mockOnAuthStateChange(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    },
  },
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
  });

  it('redirects to /login when not authenticated', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    renderWithAuth();
    expect(await screen.findByText('Login Page')).toBeInTheDocument();
  });

  it('renders children when authenticated', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: '1', email: 'user@example.com' }, access_token: 'tok' } },
    });
    renderWithAuth();
    expect(await screen.findByText('Protected Content')).toBeInTheDocument();
  });

  it('shows loading state while checking auth', () => {
    mockGetSession.mockReturnValue(new Promise(() => {}));
    renderWithAuth();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
