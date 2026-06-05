# Deploying to Vercel

This app runs entirely on Vercel: static frontend + Express API as a serverless function.

## One-time local setup

```bash
# 1. Install deps
npm install

# 2. Generate Prisma client and push schema to Neon
cd server
npx prisma generate
npx prisma db push
cd ..
```

## Vercel project settings

### Build & Output
| Setting | Value |
|---|---|
| Build Command | `npm run vercel-build` |
| Output Directory | `client/dist` |
| Install Command | `npm install` |
| Root Directory | *(leave blank — repo root)* |

### Environment Variables

Set these in Vercel → Project → Settings → Environment Variables:

| Name | Value | Notes |
|---|---|---|
| `DATABASE_URL` | Neon **pooled** connection string | Host must end in `-pooler` |
| `DIRECT_URL` | Neon direct connection string | Used for migrations |
| `NEON_AUTH_JWKS_URL` | From Neon Console → Auth tab | e.g. `https://<project>.neon.tech/.well-known/jwks.json` |
| `VITE_NEON_AUTH_URL` | From Neon Console → Auth tab | e.g. `https://<project>.neon.tech` |

> **Important:** `DATABASE_URL` must be the **pooled** connection string (host contains `-pooler`), not the direct one. Serverless functions require connection pooling.

### Getting Neon Auth values

1. Go to [Neon Console](https://console.neon.tech) → your project → **Auth** tab
2. Copy the **Auth URL** → use as `VITE_NEON_AUTH_URL`
3. The JWKS URL is `<Auth URL>/.well-known/jwks.json` → use as `NEON_AUTH_JWKS_URL`

## Local development

```bash
# Client (http://localhost:5173)
npm run dev:client

# Server (http://localhost:3001)
npm run dev:server
```

Create `server/.env`:
```
DATABASE_URL=<neon pooled connection string>
DIRECT_URL=<neon direct connection string>
NEON_AUTH_JWKS_URL=<from Neon Console Auth tab>
PORT=3001
```

Create `client/.env`:
```
VITE_NEON_AUTH_URL=<from Neon Console Auth tab>
```

## Running tests

```bash
npm test              # all tests
npm run test:client   # 251 client tests
npm run test:server   # 198 server tests
```
