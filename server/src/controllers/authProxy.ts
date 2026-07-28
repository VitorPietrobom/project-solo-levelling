import { Request, Response } from 'express';

// Same-origin auth proxy. The browser talks to /api/auth-proxy/* on OUR domain;
// we forward to the Neon Auth service. This makes the session cookie first-party,
// so installed PWAs / Safari (which block cross-origin auth cookies) keep the
// session across app restarts.
const AUTH_BASE = (process.env.VITE_NEON_AUTH_URL ?? process.env.NEON_AUTH_BASE_URL ?? '').replace(/\/$/, '');

// Strip the Domain attribute so the cookie is stored host-only for our domain
// instead of the (rejected) auth-service domain.
function firstPartyCookie(cookie: string): string {
  return cookie.replace(/;\s*Domain=[^;]*/i, '');
}

export async function authProxy(req: Request, res: Response): Promise<void> {
  if (!AUTH_BASE) { res.status(503).json({ error: 'Auth is not configured' }); return; }

  // Everything after /api/auth-proxy, including query string.
  const subPath = req.originalUrl.replace(/^\/api\/auth-proxy/, '') || '/';
  const target = `${AUTH_BASE}${subPath}`;

  const headers: Record<string, string> = {};
  const forward = ['content-type', 'cookie', 'authorization', 'accept', 'accept-language', 'user-agent', 'origin', 'referer'];
  for (const h of forward) {
    const v = req.headers[h];
    if (typeof v === 'string') headers[h] = v;
  }

  const init: RequestInit = { method: req.method, headers, redirect: 'manual' };
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    if (req.body != null && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
      init.body = JSON.stringify(req.body);
      if (!headers['content-type']) headers['content-type'] = 'application/json';
    } else if (typeof req.body === 'string' && req.body.length) {
      init.body = req.body;
    }
  }

  let upstream: globalThis.Response;
  try {
    upstream = await fetch(target, init);
  } catch (err) {
    console.error('[auth-proxy] upstream error', err);
    res.status(502).json({ error: 'Auth upstream unreachable' });
    return;
  }

  res.status(upstream.status);

  // Forward Set-Cookie(s), rewritten to first-party.
  const anyHeaders = upstream.headers as unknown as { getSetCookie?: () => string[] };
  const cookies = anyHeaders.getSetCookie ? anyHeaders.getSetCookie() : [];
  for (const c of cookies) res.append('Set-Cookie', firstPartyCookie(c));

  // Forward a safe subset of response headers.
  for (const h of ['content-type', 'cache-control', 'location']) {
    const v = upstream.headers.get(h);
    if (v) res.setHeader(h, v);
  }

  const buf = Buffer.from(await upstream.arrayBuffer());
  res.send(buf);
}
