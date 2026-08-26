import { Request, Response, NextFunction } from 'express';

// The one account allowed to generate/list invite codes — set via env, not
// a DB flag, so promoting/revoking admin is a config change, not a migration.
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  const userEmail = req.user?.email?.toLowerCase().trim();

  if (!adminEmail || !userEmail || userEmail !== adminEmail) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }

  next();
}
