import { render, screen } from '@testing-library/react';
import App from './App';

const mockGetSession = vi.fn();
vi.mock('./lib/supabase', () => ({
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

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the login page when not authenticated', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    render(<App />);
    expect(await screen.findByText('Level Up Portal')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });
});
