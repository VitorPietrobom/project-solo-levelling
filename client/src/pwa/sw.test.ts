import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const SW_SRC = readFileSync(resolve(__dirname, '../../public/sw.js'), 'utf8');
const ORIGIN = 'https://app.test';

function setup(fetchImpl: (req: unknown) => Promise<Response>) {
  const store = new Map<string, Response>();
  const keyOf = (r: string | Request) => new URL(typeof r === 'string' ? r : r.url, ORIGIN).href;
  const cache = {
    put: vi.fn(async (r: string | Request, res: Response) => { store.set(keyOf(r), res); }),
    match: async (r: string | Request) => store.get(keyOf(r)),
    keys: async () => [...store.keys()].map((u) => new Request(u)),
    delete: vi.fn(async (r: Request) => store.delete(keyOf(r))),
    addAll: async () => {},
  };
  const listeners: Record<string, (e: unknown) => void> = {};
  const self = {
    location: { origin: ORIGIN },
    addEventListener: (t: string, fn: (e: unknown) => void) => { listeners[t] = fn; },
    skipWaiting: () => {},
    clients: { claim: () => {} },
  };
  const caches = { open: async () => cache, match: cache.match, keys: async () => [], delete: async () => true };
  vm.runInNewContext(SW_SRC, { self, caches, fetch: fetchImpl, URL, Response, Promise });

  async function navigate() {
    const pending: Promise<unknown>[] = [];
    let responded: Promise<Response> | undefined;
    listeners.fetch({
      request: { method: 'GET', url: `${ORIGIN}/diet`, mode: 'navigate' },
      respondWith: (p: Promise<Response>) => { responded = p; },
      waitUntil: (p: Promise<unknown>) => { pending.push(p); },
    });
    const res = await responded!;
    await Promise.all(pending);
    return res;
  }
  return { store, cache, navigate };
}

function basic(body: string, status = 200): Response {
  const res = new Response(body, { status, headers: { 'content-type': 'text/html' } });
  Object.defineProperty(res, 'type', { value: 'basic' });
  return res;
}

describe('service worker navigation caching (OE-039)', () => {
  it('does not overwrite the offline shell with an error page', async () => {
    const { store, cache, navigate } = setup(async () => basic('Internal error', 500));
    const res = await navigate();
    expect(res.status).toBe(500);
    expect(cache.put).not.toHaveBeenCalled();
    expect(store.has(`${ORIGIN}/index.html`)).toBe(false);
  });

  it('caches a healthy shell and prunes assets it no longer references', async () => {
    const html = '<script src="/assets/index-new.js"></script>';
    const { store, navigate } = setup(async () => basic(html));
    store.set(`${ORIGIN}/assets/index-old.js`, new Response('old'));
    store.set(`${ORIGIN}/assets/index-new.js`, new Response('new'));
    store.set(`${ORIGIN}/favicon.svg`, new Response('icon'));
    await navigate();
    expect(await store.get(`${ORIGIN}/index.html`)!.text()).toBe(html);
    expect(store.has(`${ORIGIN}/assets/index-old.js`)).toBe(false);
    expect(store.has(`${ORIGIN}/assets/index-new.js`)).toBe(true);
    expect(store.has(`${ORIGIN}/favicon.svg`)).toBe(true);
  });
});
