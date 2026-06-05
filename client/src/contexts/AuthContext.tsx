import { createContext, useContext, useCallback, type ReactNode } from 'react';
import { authClient, type AuthUser } from '../lib/neonAuth';

interface AuthContextValue {
  user: AuthUser | null;
  session: unknown | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function messageOf(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === 'string' && msg) return msg;
  }
  return fallback;
}

// better-auth's React client types `useSession` as an intersection that
// confuses TS about its callability; at runtime it is a hook returning
// `{ data, isPending }`. Narrow it here.
const useSession = authClient.useSession as unknown as () => {
  data: { user: AuthUser; session: unknown } | null;
  isPending: boolean;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data, isPending } = useSession();

  const user = (data?.user ?? null) as AuthUser | null;
  const session = data?.session ?? null;
  const isLoading = isPending;

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await authClient.signIn.email({ email, password });
    if (error) throw new Error(messageOf(error, 'Failed to sign in'));
  }, []);

  const signup = useCallback(async (email: string, password: string) => {
    const { error } = await authClient.signUp.email({ email, password, name: email });
    if (error) throw new Error(messageOf(error, 'Failed to sign up'));
  }, []);

  const logout = useCallback(async () => {
    await authClient.signOut();
    window.location.href = '/login';
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, isLoading, login, signup, logout }}>
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
