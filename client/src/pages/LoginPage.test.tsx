import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from './LoginPage';
import { AuthProvider } from '../contexts/AuthContext';

const mockSignIn = vi.fn();
const mockSignUp = vi.fn();
const mockSignOut = vi.fn();
let sessionState: { data: unknown; isPending: boolean } = { data: null, isPending: false };

vi.mock('../lib/neonAuth', () => ({
  authClient: {
    useSession: () => sessionState,
    signIn: { email: (args: any) => mockSignIn(args) },
    signUp: { email: (args: any) => mockSignUp(args) },
    signOut: () => mockSignOut(),
    getSession: vi.fn(),
  },
  getAuthToken: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

// LoginPage does a full-page load on success; spy on it.
const mockAssign = vi.fn();
Object.defineProperty(window, 'location', {
  value: { ...window.location, assign: mockAssign },
  writable: true,
});

function renderLoginPage() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionState = { data: null, isPending: false };
  });

  it('renders email and password fields and a submit button', async () => {
    renderLoginPage();
    expect(await screen.findByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('calls login and redirects on successful submit', async () => {
    const user = userEvent.setup();
    mockSignIn.mockResolvedValueOnce({ error: null });

    renderLoginPage();

    const emailInput = await screen.findByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    await waitFor(() => {
      expect(mockAssign).toHaveBeenCalledWith('/');
    });
  });

  it('displays an error message on failed login', async () => {
    const user = userEvent.setup();
    mockSignIn.mockResolvedValueOnce({
      error: { message: 'Invalid login credentials' },
    });

    renderLoginPage();

    const emailInput = await screen.findByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    await user.type(emailInput, 'bad@example.com');
    await user.type(passwordInput, 'wrongpw');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Invalid login credentials',
    );
  });
});
