const VERSION = 'v1.0.7';
const CACHE_NAME = `poke-tools-${VERSION}`;
const ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './js/dex.js',
  './js/parser.js',
  './js/app.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => k === CACHE_NAME ? null : caches.delete(k)));
  })());
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(req);
    const fetchPromise = fetch(req).then(res => {
      if (res && res.status === 200) cache.put(req, res.clone());
      return res;
    }).catch(() => cached);
    return cached || fetchPromise;
  })());
});
