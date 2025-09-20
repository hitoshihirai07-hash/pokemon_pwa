// 反映が遅い時はここを v+1 してください
const CACHE_NAME = 'pokemon-calc-v11';
const ASSETS = [
  './',
  './index.html',
  './app.js',
  './manifest.json',
  './pokemon_master.json', // 同階層に配置
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // JSON は常にネット優先（最新を取りに行く）
  if (url.pathname.endsWith('/pokemon_master.json')) {
    e.respondWith(
      fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, copy));
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }
  // それ以外はキャッシュ優先
  e.respondWith(
    caches.match(e.request).then(res => res || fetch(e.request))
  );
});

