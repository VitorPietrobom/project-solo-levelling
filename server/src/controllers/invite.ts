import { Request, Response } from 'express';
import prisma from '../lib/prisma';

// Comma-separated list of valid alpha invite codes, e.g. "arise-alpha,friend2".
// Matching is case-insensitive so a tester typing it on a phone keyboard
// doesn't get tripped up by autocapitalization.
function validCodes(): string[] {
  return (process.env.ALPHA_INVITE_CODES ?? '')
    .split(',')
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean);
}

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

// POST /api/invite/redeem — body { code }.
export async function redeemInvite(req: Request, res: Response): Promise<void> {
  try {
    const { id, email } = req.user!;
    const { code } = req.body;

    if (typeof code !== 'string' || !code.trim()) {
      res.status(400).json({ error: 'Invite code is required' });
      return;
    }

    const codes = validCodes();
    if (codes.length === 0) {
      res.status(503).json({ error: 'Invite codes are not configured' });
      return;
    }

    if (!codes.includes(code.trim().toLowerCase())) {
      res.status(400).json({ error: 'Invalid invite code' });
      return;
    }

    await prisma.user.upsert({
      where: { id },
      update: { activated: true },
      create: { id, email, activated: true },
    });

    res.json({ activated: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
