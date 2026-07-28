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

// POST /api/whoop/sync — pull latest recovery, sleep, strain, and workouts.
export async function syncWhoop(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const token = await freshAccessToken(userId);
  if (!token) { res.status(400).json({ error: 'Whoop not connected' }); return; }

  const [recovery, sleep, cycle, workouts, profile] = await Promise.all([
    whoopGet(token, '/v2/recovery?limit=1'),
    whoopGet(token, '/v2/activity/sleep?limit=1'),
    whoopGet(token, '/v2/cycle?limit=1'),
    whoopGet(token, '/v2/activity/workout?limit=5'),
    whoopGet(token, '/v2/user/profile/basic'),
  ]);

  const rec = recovery?.records?.[0]?.score ?? null;
  const slp = sleep?.records?.[0]?.score ?? null;
  const cyc = cycle?.records?.[0]?.score ?? null;

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
  };

  const updated = await prisma.whoopConnection.update({
    where: { userId },
    data: { latest, syncedAt: new Date(), whoopUserId: profile?.user_id ? String(profile.user_id) : undefined },
  });

  res.json({ connected: true, syncedAt: updated.syncedAt, latest });
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
