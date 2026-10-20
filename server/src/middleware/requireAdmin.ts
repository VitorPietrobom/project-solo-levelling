import { Request, Response, NextFunction } from 'express';

function parseList(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

// Admin is decided by env config, not a DB flag, so promoting/revoking admin
// is a config change, not a migration.
//
// Preferred: ADMIN_USER_ID (comma-separated JWT `sub` values). Fallback:
// ADMIN_EMAIL, honoured only when ADMIN_USER_ID is unset AND the token's
// email is verified — otherwise anyone could sign up with the admin's email.
// Neither configured → nobody is admin (fail closed).
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const adminIds = parseList(process.env.ADMIN_USER_ID);
  const adminEmails = parseList(process.env.ADMIN_EMAIL).map((e) => e.toLowerCase());
  const user = req.user;

  let allowed = false;
  if (user) {
    if (adminIds.length > 0) {
      allowed = adminIds.includes(user.id);
    } else if (adminEmails.length > 0) {
      const userEmail = user.email?.toLowerCase().trim();
      allowed = user.emailVerified === true && !!userEmail && adminEmails.includes(userEmail);
    }
  }

  if (!allowed) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }

  next();
}
