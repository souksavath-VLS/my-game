/* ============================================================
   EQ Game — Service Worker (offline-first PWA)
   Strategy:
   - Precache the app shell + core CDN libraries on install.
   - Same-origin requests: stale-while-revalidate (fast + auto-updates).
   - Cross-origin (CDN / fonts): cache-first (works offline once fetched).
   - The home page pushes the full active-game list via postMessage so every
     game page is cached after the first online visit to the hub.
   Bump VERSION whenever you want every client to refresh its cache.
   ============================================================ */
const VERSION = 'v1.0.0';
const CACHE = 'eqgame-' + VERSION;

// App shell (same-origin) — small, always precached.
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './icon-maskable.svg',
];

// Heavy CDN libraries used across many games — best-effort precache so the
// self-contained games work fully offline even before they are opened.
const CDN = [
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/lucide@latest',
  'https://cdn.jsdelivr.net/npm/three@0.132.0/build/three.min.js',
  'https://cdn.jsdelivr.net/npm/three@0.132.0/examples/js/controls/OrbitControls.js',
  'https://cdn.jsdelivr.net/npm/cannon@0.6.2/build/cannon.min.js',
];

async function precache() {
  const cache = await caches.open(CACHE);
  // same-origin shell — resilient (don't fail install if one 404s)
  await Promise.allSettled(SHELL.map(async (u) => {
    try { const r = await fetch(u, { cache: 'no-store' }); if (r && r.ok) await cache.put(u, r); } catch (_) {}
  }));
  // cross-origin libs — opaque responses are fine for cache-first replay
  await Promise.allSettled(CDN.map(async (u) => {
    try { const r = await fetch(u, { mode: 'no-cors' }); if (r && (r.ok || r.type === 'opaque')) await cache.put(u, r); } catch (_) {}
  }));
}

self.addEventListener('install', (e) => {
  // NOTE: no skipWaiting() here — the page shows an "update" banner and the
  // user decides when to activate the new version (via the SKIP_WAITING message).
  e.waitUntil(precache());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('eqgame-') && k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

// The hub page sends the list of every active game to precache.
self.addEventListener('message', (e) => {
  const d = e.data || {};
  if (d.type === 'PRECACHE' && Array.isArray(d.urls)) {
    e.waitUntil((async () => {
      const cache = await caches.open(CACHE);
      await Promise.allSettled(d.urls.map(async (u) => {
        try {
          if (await cache.match(u)) return;                 // already cached → skip
          const r = await fetch(u, { cache: 'no-store' });
          if (r && (r.ok || r.type === 'opaque')) await cache.put(u, r);
        } catch (_) {}
      }));
    })());
  }
  if (d.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch (_) { return; }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  const sameOrigin = url.origin === self.location.origin;

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);

    if (cached) {
      // same-origin: refresh in background (stale-while-revalidate)
      if (sameOrigin) {
        fetch(req).then((r) => { if (r && r.ok) cache.put(req, r.clone()); }).catch(() => {});
      }
      return cached;
    }

    try {
      const res = await fetch(req);
      if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
      return res;
    } catch (err) {
      // offline & not cached → sensible fallbacks
      if (req.mode === 'navigate') {
        const idx = (await cache.match('./index.html')) || (await cache.match('./'));
        if (idx) return idx;
      }
      const any = await cache.match(req, { ignoreSearch: true });
      if (any) return any;
      throw err;
    }
  })());
});
