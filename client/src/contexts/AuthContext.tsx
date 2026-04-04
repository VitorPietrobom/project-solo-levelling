import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { apiClient } from '../lib/apiClient';

interface User {
  id: string;
  email: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    token: null,
    user: null,
    isLoading: true,
  });

  useEffect(() => {
    const stored = localStorage.getItem('token');
    if (!stored) {
      setState({ token: null, user: null, isLoading: false });
      return;
    }

    apiClient
      .get('/api/auth/me')
      .then((data) => {
        const { id, email } = data as User;
        setState({ token: stored, user: { id, email }, isLoading: false });
      })
      .catch(() => {
        localStorage.removeItem('token');
        setState({ token: null, user: null, isLoading: false });
      });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = (await apiClient.post('/api/auth/login', {
      body: { email, password },
    })) as { token: string; user: User };

    localStorage.setItem('token', data.token);
    setState({ token: data.token, user: data.user, isLoading: false });
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient.post('/api/auth/logout');
    } catch {
      // proceed with local cleanup even if server call fails
    }
    localStorage.removeItem('token');
    setState({ token: null, user: null, isLoading: false });
    window.location.href = '/login';
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
