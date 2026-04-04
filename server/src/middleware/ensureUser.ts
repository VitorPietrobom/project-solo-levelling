import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';

// Cache known user IDs to avoid DB upsert on every request
const knownUsers = new Set<string>();

export async function ensureUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id, email } = req.user!;

    if (knownUsers.has(id)) {
      next();
      return;
    }

    await prisma.user.upsert({
      where: { id },
      update: {},
      create: { id, email },
    });
    knownUsers.add(id);
    next();
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}
