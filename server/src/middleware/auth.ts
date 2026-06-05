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

// Simple in-memory cache: token -> { payload, expiresAt }
const tokenCache = new Map<string, { payload: AuthPayload; expiresAt: number }>();

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
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
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}
