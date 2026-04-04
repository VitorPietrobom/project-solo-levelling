import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../lib/supabase';

const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET || '';

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

  // Try local JWT verification first (fast path)
  if (SUPABASE_JWT_SECRET) {
    try {
      const decoded = jwt.verify(token, SUPABASE_JWT_SECRET) as { sub: string; email?: string; exp?: number };
      const payload: AuthPayload = { id: decoded.sub, email: decoded.email || '' };
      const expiresAt = decoded.exp ? decoded.exp * 1000 : Date.now() + 3600_000;
      tokenCache.set(token, { payload, expiresAt });
      req.user = payload;
      next();
      return;
    } catch {
      // Local verify failed, fall through to Supabase call
    }
  }

  // Fallback: verify via Supabase API (slower but always works)
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    const payload: AuthPayload = { id: user.id, email: user.email || '' };
    // Cache for 5 minutes
    tokenCache.set(token, { payload, expiresAt: Date.now() + 300_000 });
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}
