import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './Dashboard';
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

function renderDashboard() {
  storageMock.setItem('token', 'valid-jwt');
  vi.mocked(apiClient.get).mockResolvedValue({ id: '1', email: 'user@test.com' });

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
    vi.stubGlobal('localStorage', storageMock);
    storageMock.clear();
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
