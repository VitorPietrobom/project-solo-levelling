import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest';
import express from 'express';
import request from 'supertest';

let app: express.Express;
const fetchMock = vi.fn();
const realFetch = globalThis.fetch;

beforeAll(async () => {
  process.env.NEON_AUTH_BASE_URL = 'https://auth.example.test';
  delete process.env.VITE_NEON_AUTH_URL;
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  const { authProxy, authProxyRawBody } = await import('./authProxy');
  app = express();
  app.use('/api/auth-proxy', authProxyRawBody);
  app.use(express.json({ limit: '4mb' }));
  app.all('/api/auth-proxy/*', authProxy);
});

afterAll(() => { globalThis.fetch = realFetch; });

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation(async () => new Response('ok', { status: 200 }));
});

function sentInit(): RequestInit { return fetchMock.mock.calls[0][1] as RequestInit; }
function sentBody(): string { return Buffer.from(sentInit().body as Uint8Array).toString('utf8'); }

describe('authProxy request bodies', () => {
  it('forwards form-encoded bodies unchanged with their content-type', async () => {
    await request(app).post('/api/auth-proxy/callback/google?x=1')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send('code=abc&state=xyz%20');
    expect(fetchMock.mock.calls[0][0]).toBe('https://auth.example.test/callback/google?x=1');
    expect(sentBody()).toBe('code=abc&state=xyz%20');
    expect((sentInit().headers as Record<string, string>)['content-type']).toBe('application/x-www-form-urlencoded');
  });

  it('forwards an empty JSON object body (e.g. sign-out)', async () => {
    await request(app).post('/api/auth-proxy/sign-out')
      .set('Content-Type', 'application/json').send('{}');
    expect(sentBody()).toBe('{}');
  });

  it('forwards JSON bytes exactly as sent', async () => {
    const raw = '{"email":"a@b.c",  "password":"p"}';
    await request(app).post('/api/auth-proxy/sign-in/email')
      .set('Content-Type', 'application/json').send(raw);
    expect(sentBody()).toBe(raw);
  });

  it('sends no body for GET', async () => {
    await request(app).get('/api/auth-proxy/get-session');
    expect(sentInit().body).toBeUndefined();
  });
});
