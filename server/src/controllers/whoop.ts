import { Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../lib/prisma';

const WHOOP_AUTH_URL = 'https://api.prod.whoop.com/oauth/oauth2/auth';
const WHOOP_TOKEN_URL = 'https://api.prod.whoop.com/oauth/oauth2/token';
const WHOOP_API = 'https://api.prod.whoop.com/developer';
const SCOPES = [
  'read:profile',
  'read:recovery',
  'read:sleep',
  'read:workout',
  'read:cycles',
  'read:body_measurement',
  'offline',
].join(' ');

/**
 * Decides what a sync should do with today's bodyweight, given the row already
 * there (if any) and the fresh WHOOP reading. Pure, so the rule is testable:
 * - no row yet            → create it (source: whoop)
 * - our own row, changed  → update it (refresh to the latest reading)
 * - our own row, same     → skip (nothing to do)
 * - a manual weigh-in     → skip (never clobber what the user typed)
 * - unusable reading      → skip
 */
export function reconcileWhoopWeight(
  existing: { weight: number; source: string } | null,
  whoopWeight: unknown,
): { action: 'create' | 'update' | 'skip'; weight: number | null } {
  if (typeof whoopWeight !== 'number' || !Number.isFinite(whoopWeight) || whoopWeight <= 0) {
    return { action: 'skip', weight: null };
  }
  const rounded = Math.round(whoopWeight * 10) / 10;
  if (!existing) return { action: 'create', weight: rounded };
  if (existing.source === 'whoop' && existing.weight !== rounded) return { action: 'update', weight: rounded };
  return { action: 'skip', weight: null };
}

function clientId(): string { return process.env.WHOOP_CLIENT_ID || ''; }
function clientSecret(): string { return process.env.WHOOP_CLIENT_SECRET || ''; }
function redirectUri(): string { return process.env.WHOOP_REDIRECT_URI || ''; }

// Signed state so the (unauthenticated) callback can trust which user began the flow.
function signState(userId: string): string {
  const payload = Buffer.from(JSON.stringify({ userId, ts: Date.now() })).toString('base64url');
  const sig = crypto.createHmac('sha256', clientSecret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}
function verifyState(state: string): string | null {
  const [payload, sig] = (state || '').split('.');
  if (!payload || !sig) return null;
  const expected = crypto.createHmac('sha256', clientSecret()).update(payload).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const { userId, ts } = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (Date.now() - ts > 10 * 60 * 1000) return null; // 10 min window
    return userId as string;
  } catch {
    return null;
  }
}

function appOrigin(): string {
  // Derive the app origin from the configured redirect URI.
  try { return new URL(redirectUri()).origin; } catch { return ''; }
}

// GET /api/whoop/authorize — returns the Whoop consent URL for the client to navigate to.
export async function authorizeWhoop(req: Request, res: Response): Promise<void> {
  if (!clientId() || !clientSecret() || !redirectUri()) {
    res.status(503).json({ error: 'Whoop integration is not configured' });
    return;
  }
  const state = signState(req.user!.id);
  const url = `${WHOOP_AUTH_URL}?response_type=code&client_id=${encodeURIComponent(clientId())}` +
    `&redirect_uri=${encodeURIComponent(redirectUri())}` +
    `&scope=${encodeURIComponent(SCOPES)}` +
    `&state=${encodeURIComponent(state)}`;
  res.json({ url });
}

// GET /api/whoop/callback — Whoop redirects the browser here after consent.
export async function whoopCallback(req: Request, res: Response): Promise<void> {
  const { code, state, error } = req.query as Record<string, string>;
  const origin = appOrigin();
  if (error) { res.redirect(`${origin}/body?whoop=denied`); return; }

  const userId = state ? verifyState(state) : null;
  if (!userId || !code) { res.redirect(`${origin}/body?whoop=error`); return; }

  try {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri(),
      client_id: clientId(),
      client_secret: clientSecret(),
    });
    const tokenRes = await fetch(WHOOP_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!tokenRes.ok) { res.redirect(`${origin}/body?whoop=error`); return; }
    const tok = await tokenRes.json() as { access_token: string; refresh_token: string; expires_in: number; scope?: string };

    const expiresAt = new Date(Date.now() + (tok.expires_in ?? 3600) * 1000);
    await prisma.whoopConnection.upsert({
      where: { userId },
      create: { userId, accessToken: tok.access_token, refreshToken: tok.refresh_token, expiresAt, scope: tok.scope },
      update: { accessToken: tok.access_token, refreshToken: tok.refresh_token, expiresAt, scope: tok.scope },
    });
    res.redirect(`${origin}/body?whoop=connected`);
  } catch (err) {
    console.error('[whoop] callback error', err);
    res.redirect(`${origin}/body?whoop=error`);
  }
}

// Ensure a non-expired access token, refreshing when needed.
async function freshAccessToken(userId: string): Promise<string | null> {
  const conn = await prisma.whoopConnection.findUnique({ where: { userId } });
  if (!conn) return null;
  if (conn.expiresAt.getTime() - Date.now() > 60 * 1000) return conn.accessToken;

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: conn.refreshToken,
    client_id: clientId(),
    client_secret: clientSecret(),
    scope: 'offline',
  });
  const r = await fetch(WHOOP_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!r.ok) return null;
  const tok = await r.json() as { access_token: string; refresh_token?: string; expires_in: number };
  const expiresAt = new Date(Date.now() + (tok.expires_in ?? 3600) * 1000);
  await prisma.whoopConnection.update({
    where: { userId },
    data: {
      accessToken: tok.access_token,
      refreshToken: tok.refresh_token ?? conn.refreshToken,
      expiresAt,
    },
  });
  return tok.access_token;
}

async function whoopGet(token: string, path: string): Promise<any | null> {
  try {
    const r = await fetch(`${WHOOP_API}${path}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

// Does the actual pull-and-persist for one user. Shared by the on-demand
// POST /api/whoop/sync handler and the daily cron below — a manual sync only
// ever runs when someone has the app open, so without an automatic daily
// pass, any day nobody opened the app got no weight row at all even though
// Whoop had a real reading that day (Whoop's own app shows it; ours never
// captured it). Returns null if there's no valid connection to sync.
async function performWhoopSync(userId: string): Promise<{ syncedAt: Date | null; latest: unknown; weightLogged: boolean } | null> {
  const token = await freshAccessToken(userId);
  if (!token) return null;

  const [recovery, sleep, cycles, workouts, profile, body] = await Promise.all([
    whoopGet(token, '/v2/recovery?limit=1'),
    whoopGet(token, '/v2/activity/sleep?limit=1'),
    whoopGet(token, '/v2/cycle?limit=14'),
    whoopGet(token, '/v2/activity/workout?limit=5'),
    whoopGet(token, '/v2/user/profile/basic'),
    whoopGet(token, '/v2/user/measurement/body'),
  ]);

  const rec = recovery?.records?.[0]?.score ?? null;
  const slp = sleep?.records?.[0]?.score ?? null;
  const cyc = cycles?.records?.[0]?.score ?? null;

  // Persist daily energy burn (kilojoules → kcal) for each recent cycle so the
  // nutrition engine can compute a trailing TDEE average.
  const KJ_TO_KCAL = 1 / 4.184;
  if (Array.isArray(cycles?.records)) {
    for (const c of cycles.records) {
      const kj = c?.score?.kilojoule;
      const start = c?.start;
      if (kj == null || !start) continue;
      const date = String(start).slice(0, 10); // YYYY-MM-DD
      const calories = Math.round(kj * KJ_TO_KCAL);
      if (calories <= 0) continue;
      await prisma.whoopDaily.upsert({
        where: { userId_date: { userId, date } },
        create: { userId, date, calories, strain: c?.score?.strain ?? null },
        update: { calories, strain: c?.score?.strain ?? null },
      });
    }
  }

  const latest = {
    recovery: rec ? {
      score: rec.recovery_score ?? null,
      restingHeartRate: rec.resting_heart_rate ?? null,
      hrv: rec.hrv_rmssd_milli != null ? Math.round(rec.hrv_rmssd_milli) : null,
    } : null,
    sleep: slp ? {
      performance: slp.sleep_performance_percentage ?? null,
      efficiency: slp.sleep_efficiency_percentage ?? null,
      consistency: slp.sleep_consistency_percentage ?? null,
    } : null,
    strain: cyc ? {
      day: cyc.strain != null ? Math.round(cyc.strain * 10) / 10 : null,
      avgHeartRate: cyc.average_heart_rate ?? null,
    } : null,
    workouts: Array.isArray(workouts?.records)
      ? workouts.records.map((w: any) => ({
          id: w.id,
          sport: w.sport_name ?? 'Workout',
          start: w.start ?? null,
          strain: w.score?.strain != null ? Math.round(w.score.strain * 10) / 10 : null,
          avgHeartRate: w.score?.average_heart_rate ?? null,
        }))
      : [],
    profile: profile ? {
      firstName: profile.first_name ?? null,
      lastName: profile.last_name ?? null,
    } : null,
    body: body ? {
      weightKg: body.weight_kilogram ?? null,
      heightM: body.height_meter ?? null,
      maxHeartRate: body.max_heart_rate ?? null,
    } : null,
  };

  const updated = await prisma.whoopConnection.update({
    where: { userId },
    data: { latest, syncedAt: new Date(), whoopUserId: profile?.user_id ? String(profile.user_id) : undefined },
  });

  // Auto-log today's bodyweight from WHOOP. Create today's row if missing, and
  // otherwise REFRESH it when the value changed — but only if we were the ones
  // who wrote it. A manual weigh-in is never touched.
  //
  // Without the refresh, the first sync of the day locked the value in and a
  // later weigh-in didn't show until the next day's row was created.
  let weightLogged = false;
  {
    const today = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);
    const existing = await prisma.weightEntry.findUnique({ where: { userId_date: { userId, date: today } } });
    const decision = reconcileWhoopWeight(existing, body?.weight_kilogram);
    if (decision.action === 'create') {
      await prisma.weightEntry.create({ data: { userId, weight: decision.weight!, date: today, source: 'whoop' } });
      weightLogged = true;
    } else if (decision.action === 'update') {
      await prisma.weightEntry.update({ where: { id: existing!.id }, data: { weight: decision.weight! } });
      weightLogged = true;
    }
  }

  return { syncedAt: updated.syncedAt, latest, weightLogged };
}

// POST /api/whoop/sync — pull latest recovery, sleep, strain, and workouts.
export async function syncWhoop(req: Request, res: Response): Promise<void> {
  const result = await performWhoopSync(req.user!.id);
  if (!result) { res.status(400).json({ error: 'Whoop not connected' }); return; }
  res.json({ connected: true, ...result });
}

// GET /api/whoop/cron-sync — runs performWhoopSync for every connected user,
// once a day, so a day nobody opened the app still gets a weight row. Vercel
// Cron Jobs hit this as a plain GET and auto-attach `Authorization: Bearer
// $CRON_SECRET` when an env var of that exact name is set — that's the only
// thing gating this route, since it isn't tied to any one user's session.
export async function cronSyncAllWhoop(req: Request, res: Response): Promise<void> {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const connections = await prisma.whoopConnection.findMany({ select: { userId: true } });
  let synced = 0;
  let failed = 0;
  for (const { userId } of connections) {
    try {
      const result = await performWhoopSync(userId);
      if (result) synced++; else failed++;
    } catch (err) {
      console.error(`[whoop] cron sync failed for user ${userId}`, err);
      failed++;
    }
  }
  res.json({ total: connections.length, synced, failed });
}

// GET /api/whoop/status — connection state + last synced snapshot.
export async function whoopStatus(req: Request, res: Response): Promise<void> {
  const conn = await prisma.whoopConnection.findUnique({ where: { userId: req.user!.id } });
  if (!conn) { res.json({ connected: false }); return; }
  res.json({ connected: true, syncedAt: conn.syncedAt, latest: conn.latest ?? null });
}

// DELETE /api/whoop — disconnect.
export async function disconnectWhoop(req: Request, res: Response): Promise<void> {
  await prisma.whoopConnection.deleteMany({ where: { userId: req.user!.id } });
  res.status(204).end();
}
