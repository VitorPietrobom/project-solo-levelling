import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';

/**
 * After authMiddleware sets req.user, this ensures a corresponding
 * User row exists in the database (auto-creates on first request).
 */
export async function ensureUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id, email } = req.user!;
    await prisma.user.upsert({
      where: { id },
      update: {},
      create: { id, email },
    });
    next();
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}
