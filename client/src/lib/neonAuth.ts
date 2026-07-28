import { createInternalNeonAuth } from '@neondatabase/auth';
import { BetterAuthReactAdapter } from '@neondatabase/auth/react/adapters';

// Installed PWAs (iOS/Safari especially) block the cross-origin Neon Auth
// session cookie, so the session was lost on every app restart. In that context
// only, route auth through our OWN origin (/api/auth-proxy) so the cookie is
// first-party and persists. A normal browser keeps the direct cross-origin path
// that already works — so this change can't regress browser login.
const isStandalonePWA =
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true);

const NEON_AUTH_URL = import.meta.env.PROD && isStandalonePWA
  ? `${window.location.origin}/api/auth-proxy`
  : (import.meta.env.VITE_NEON_AUTH_URL as string);

/**
 * Neon Auth is built on Better Auth. `createInternalNeonAuth` returns both the
 * underlying Better Auth React client (`adapter`) — which exposes
 * `signIn.email`, `signUp.email`, `signOut`, `useSession`, `getSession` — and a
 * `getJWTToken()` helper that retrieves the EdDSA JWT (via Better Auth's JWT
 * plugin) to send as a Bearer token to our separate backend.
 */
const neonAuth = createInternalNeonAuth(NEON_AUTH_URL, {
  adapter: BetterAuthReactAdapter(),
});

/** The Better Auth React client (sign-in/up/out, useSession, getSession). */
export const authClient = neonAuth.adapter;

/** Retrieve the JWT to send to the backend, or null if there is no session. */
export function getAuthToken(): Promise<string | null> {
  return neonAuth.getJWTToken();
}

export type AuthUser = NonNullable<
  Awaited<ReturnType<typeof authClient.getSession>>['data']
>['user'];
