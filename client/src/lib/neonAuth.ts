import { createInternalNeonAuth } from '@neondatabase/auth';
import { BetterAuthReactAdapter } from '@neondatabase/auth/react/adapters';

// The Neon Auth session cookie is set by a different origin than the app
// itself, which makes it a THIRD-PARTY cookie from the browser's point of
// view — and third-party cookies get blocked or evicted under storage
// pressure by a growing share of browsers, not just installed iOS PWAs
// (this was originally scoped to `isStandalonePWA` for that case alone, but
// Android Chrome's default third-party-cookie partitioning drops it just as
// easily in an ordinary browser tab, which read as "randomly logged out").
// Routing every production request through our OWN origin (/api/auth-proxy,
// a same-origin passthrough — see server/src/controllers/authProxy.ts) makes
// the cookie first-party everywhere, so this is no longer conditional.
const NEON_AUTH_URL = import.meta.env.PROD
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
