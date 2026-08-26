import { Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../lib/prisma';

// GET /api/invite/status — not gated by ensureUser (it IS the way an
// unactivated user finds out they're unactivated), so it does its own
// find-or-create instead of relying on another route having run first.
export async function getInviteStatus(req: Request, res: Response): Promise<void> {
  try {
    const { id, email } = req.user!;
    const user = await prisma.user.upsert({
      where: { id },
      update: {},
      create: { id, email, activated: false },
    });
    res.json({ activated: user.activated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// POST /api/invite/redeem — body { code }. Each code works exactly once,
// for exactly one account — a second attempt with the same code (by anyone,
// including the same user) is rejected.
export async function redeemInvite(req: Request, res: Response): Promise<void> {
  try {
    const { id, email } = req.user!;
    const { code } = req.body;

    if (typeof code !== 'string' || !code.trim()) {
      res.status(400).json({ error: 'Invite code is required' });
      return;
    }
    const normalized = code.trim().toUpperCase();

    const invite = await prisma.inviteCode.findUnique({ where: { code: normalized } });
    if (!invite) {
      res.status(400).json({ error: 'Invalid invite code' });
      return;
    }
    if (invite.redeemedById) {
      res.status(400).json({ error: 'This invite code has already been used' });
      return;
    }

    // Ensure the user row exists before the code->user foreign key is set.
    await prisma.user.upsert({ where: { id }, update: {}, create: { id, email, activated: false } });

    try {
      await prisma.$transaction([
        prisma.inviteCode.update({ where: { code: normalized }, data: { redeemedById: id, redeemedAt: new Date() } }),
        prisma.user.update({ where: { id }, data: { activated: true } }),
      ]);
    } catch {
      // Someone else redeemed the same code in the window between the
      // findUnique above and this transaction — the unique constraint on
      // redeemedById (one code, one user) or code itself catches the race.
      res.status(400).json({ error: 'This invite code has already been used' });
      return;
    }

    res.json({ activated: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I — easy to read off a screen
function randomCode(length = 8): string {
  let out = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) out += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length];
  return out;
}

// POST /api/invite/codes — admin only. Generates and stores one new
// single-use code.
export async function generateInviteCode(req: Request, res: Response): Promise<void> {
  try {
    const adminId = req.user!.id;
    // Collisions are astronomically unlikely (33^8) but retry once for safety.
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = randomCode();
      try {
        const created = await prisma.inviteCode.create({ data: { code, createdById: adminId } });
        res.status(201).json(created);
        return;
      } catch (err) {
        const isUniqueClash = (err as { code?: string }).code === 'P2002';
        if (!isUniqueClash) throw err;
      }
    }
    res.status(500).json({ error: 'Failed to generate a unique code, try again' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// GET /api/invite/codes — admin only. Every code ever generated, with who
// (if anyone) redeemed it.
export async function listInviteCodes(_req: Request, res: Response): Promise<void> {
  try {
    const codes = await prisma.inviteCode.findMany({
      orderBy: { createdAt: 'desc' },
      include: { redeemedBy: { select: { email: true } } },
    });
    res.json(codes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
