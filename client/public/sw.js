// Project Arise service worker — app-shell offline + safe caching.
// Bump CACHE version to force clients to refresh cached assets (stale /assets/* are also pruned on each healthy navigation).
const CACHE = 'arise-v2';
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/favicon.svg', '/icon-192.png', '/icon-512.png'];

function isCacheable(res) {
  return !!res && res.ok && res.type === 'basic';
}

// Delete cached hashed build assets (/assets/*) the current shell no longer references,
// so the cache doesn't grow across deploys.
function pruneAssets(cache, html) {
  return cache.keys().then((reqs) =>
    Promise.all(
      reqs
        .filter((req) => {
          const path = new URL(req.url).pathname;
          return path.startsWith('/assets/') && !html.includes(path);
        })
        .map((req) => cache.delete(req)),
    ),
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Never cache API or auth calls — always hit the network.
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/auth')) return;

  // Cross-origin (fonts, etc.) — let the browser handle it.
  if (url.origin !== self.location.origin) return;

  // Navigations → network-first so deploys ship immediately, fall back to cached shell offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          // Only a healthy same-origin page may become the offline shell — never a 500/404.
          if (isCacheable(res)) {
            const copy = res.clone();
            event.waitUntil(
              copy.text().then((html) =>
                caches.open(CACHE).then((c) =>
                  c.put('/index.html', new Response(html, { headers: copy.headers }))
                    .then(() => pruneAssets(c, html)),
                ),
              ),
            );
          }
          return res;
        })
        .catch(() => caches.match('/index.html')),
    );
    return;
  }

  // Static assets → stale-while-revalidate.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((res) => {
          if (isCacheable(res)) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
