import { Request, Response, NextFunction } from 'express';
import { createRemoteJWKSet, jwtVerify } from 'jose';

export interface AuthPayload {
  id: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

// Lazily build the JWKS so a missing env var results in a 401 rather than a
// crash at import time. Neon Auth signs JWTs with EdDSA (Ed25519); we verify
// the Bearer token against the JWKS endpoint from the Neon Console (Auth tab).
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJWKS(): ReturnType<typeof createRemoteJWKSet> | null {
  if (jwks) return jwks;
  const url = process.env.NEON_AUTH_JWKS_URL;
  if (!url) return null;
  jwks = createRemoteJWKSet(new URL(url));
  return jwks;
}

// In-memory cache: token -> { payload, expiresAt }. Evict expired entries every 10 min.
const tokenCache = new Map<string, { payload: AuthPayload; expiresAt: number }>();
setInterval(() => {
  const now = Date.now();
  for (const [token, entry] of tokenCache) {
    if (entry.expiresAt <= now) tokenCache.delete(token);
  }
}, 10 * 60 * 1000).unref();

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    console.error('[auth] 401: missing/invalid authorization header. Header value:', header ?? '(none)');
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  const token = header.split(' ')[1];

  // Check cache first
  const cached = tokenCache.get(token);
  if (cached && cached.expiresAt > Date.now()) {
    req.user = cached.payload;
    next();
    return;
  }

  const JWKS = getJWKS();
  if (!JWKS) {
    console.error('[auth] 401: NEON_AUTH_JWKS_URL env var is not set');
    res.status(401).json({ error: 'Auth not configured' });
    return;
  }

  try {
    const { payload } = await jwtVerify(token, JWKS);
    const authPayload: AuthPayload = {
      id: payload.sub as string,
      email: (payload.email as string) || '',
    };
    const expiresAt = payload.exp ? payload.exp * 1000 : Date.now() + 3600_000;
    tokenCache.set(token, { payload: authPayload, expiresAt });
    req.user = authPayload;
    next();
  } catch (err) {
    console.error('[auth] JWT verification failed:', err instanceof Error ? err.message : err);
    res.status(401).json({ error: 'Invalid token' });
  }
}
