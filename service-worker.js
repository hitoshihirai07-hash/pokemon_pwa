// キャッシュ名：更新時は v 数字を上げる
const CACHE_NAME = 'pokemon-calc-v3';
const ASSETS = [
  './',
  './index.html',
  './app.js',
  './manifest.json',
  './pokemon_master.json' // ← 図鑑データをキャッシュ
];

// インストール：アプリシェルをキャッシュ
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// アクティベート：古いキャッシュ掃除
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// フェッチ：HTMLはネット優先→失敗時キャッシュ、その他はキャッシュ優先
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then(m => m || caches.match('./')))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(matched => matched || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE_NAME).then(c => c.put(req, copy));
      return res;
    }))
  );
});
