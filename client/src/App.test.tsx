import { render, screen } from '@testing-library/react';
import App from './App';

let sessionState: { data: unknown; isPending: boolean } = { data: null, isPending: false };
vi.mock('./lib/neonAuth', () => ({
  authClient: {
    useSession: () => sessionState,
    signIn: { email: vi.fn() },
    signUp: { email: vi.fn() },
    signOut: vi.fn(),
    getSession: vi.fn(),
  },
  getAuthToken: vi.fn(),
}));

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the login page when not authenticated', async () => {
    sessionState = { data: null, isPending: false };
    render(<App />);
    expect(await screen.findByText('Project Arise')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });
});
