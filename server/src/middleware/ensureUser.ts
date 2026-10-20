import { Request, Response, NextFunction } from 'express';
import { upsertUserRow, EmailConflictError, EMAIL_CONFLICT_BODY } from '../lib/userRow';

// Cache known *activated* user IDs to avoid DB upsert on every request.
// Unactivated users are never cached, so redeeming an invite takes effect
// on their next request.
const knownUsers = new Set<string>();

export async function ensureUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id, email } = req.user!;

    if (knownUsers.has(id)) {
      next();
      return;
    }

    // New rows start unactivated: the schema default stays `true` so existing
    // rows are unaffected, but fresh signups must redeem an alpha invite code
    // (via /api/invite/*, which doesn't use this middleware) before using the API.
    const user = await upsertUserRow(id, email);

    // Strict check: real rows always carry a boolean.
    if (user?.activated === false) {
      res.status(403).json({ error: 'Alpha invite code required', code: 'INVITE_REQUIRED' });
      return;
    }

    knownUsers.add(id);
    next();
  } catch (err) {
    if (err instanceof EmailConflictError) {
      res.status(409).json(EMAIL_CONFLICT_BODY);
      return;
    }
    console.error('[ensureUser] failed to upsert user:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
