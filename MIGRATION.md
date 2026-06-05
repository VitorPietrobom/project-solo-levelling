# Migration: Supabase → Neon (Postgres + Neon Auth)

This app moved off Supabase. The database is now **Neon Postgres** (still via Prisma) and
authentication is now **Neon Auth** (built on Better Auth), replacing Supabase Auth.

## What changed

- **Client** (`client/`): `@supabase/supabase-js` removed, `@neondatabase/auth` added.
  - `client/src/lib/neonAuth.ts` — configured Neon Auth client (`createInternalNeonAuth` +
    `BetterAuthReactAdapter`), exporting `authClient` and a `getAuthToken()` helper.
  - `AuthContext` keeps the same public interface (`user`, `session`, `isLoading`,
    `login`, `signup`, `logout`).
  - `apiClient` sends the Neon Auth JWT as `Authorization: Bearer <token>`.
- **Server** (`server/`): `@supabase/supabase-js` removed, `jose` added.
  - `server/src/middleware/auth.ts` now verifies Neon Auth **EdDSA (Ed25519)** JWTs against
    the JWKS endpoint using `createRemoteJWKSet` + `jwtVerify`. `sub` → user id, `email` → email.
  - Stale dead code (`controllers/auth.ts`, `lib/supabase.ts`) deleted.

## Values YOU need to fill in

Get these from the **Neon Console → your project → Auth tab**:

1. **`VITE_NEON_AUTH_URL`** (client) — the Neon Auth base URL for your project.
   Put it in `client/.env` (see `client/.env.example`).
2. **`NEON_AUTH_JWKS_URL`** (server) — the JWKS URL used to verify tokens
   (typically `<auth-url>/.well-known/jwks.json`, but copy the exact value the console shows).
   Put it in `server/.env` (see `server/.env.example`).

The `DATABASE_URL` / `DIRECT_URL` Neon connection strings are already populated in `server/.env`.

## Enable Email/Password

In the Neon Console **Auth** tab, enable the **Email/Password** sign-in method.
The app uses `signIn.email` / `signUp.email`, which require it.

## Existing users are NOT migrated

Supabase users are **not** carried over. The Neon database starts fresh, so every user must
**re-register** (sign up again) on the new deployment.

## Create the database schema on Neon

There are no Prisma migration files, so use `db push`:

```bash
cd server
npx prisma generate
npx prisma db push
```

(If you later add migration files, use `npx prisma migrate deploy` instead.)

> Note: the schema push could not be run from the migration environment because outbound
> network access to Neon was blocked. Run the command above yourself once.
