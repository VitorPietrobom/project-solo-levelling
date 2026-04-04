import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import { AuthProvider } from '../contexts/AuthContext';

vi.mock('../lib/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
    }
  },
}));

import { apiClient } from '../lib/apiClient';

const storageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
  };
})();

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
    vi.stubGlobal('localStorage', storageMock);
    storageMock.clear();
  });

  it('redirects to /login when not authenticated', async () => {
    vi.mocked(apiClient.get).mockRejectedValue(new Error('no token'));

    renderWithAuth();

    expect(await screen.findByText('Login Page')).toBeInTheDocument();
  });

  it('renders children when authenticated', async () => {
    storageMock.setItem('token', 'valid-jwt');
    vi.mocked(apiClient.get).mockResolvedValue({
      id: '1',
      email: 'user@example.com',
    });

    renderWithAuth();

    expect(await screen.findByText('Protected Content')).toBeInTheDocument();
  });

  it('shows loading state while checking auth', () => {
    // Make the get call hang (never resolve)
    vi.mocked(apiClient.get).mockReturnValue(new Promise(() => {}));
    storageMock.setItem('token', 'some-token');

    renderWithAuth();

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
