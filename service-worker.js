
// キャッシュ名は更新のたびに変える（vを上げるだけでOK）
const CACHE_NAME = 'pokemon-calc-v2';
const ASSETS = [
  './',
  './index.html',
  './app.js',
  './manifest.json'
  // ここに将来の CSS/画像/プリセットJSON などを足す
];

// インストール：アプリシェルをキャッシュ
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// アクティベート：古いキャッシュを掃除
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// フェッチ：HTMLはネット優先→失敗時キャッシュ、静的はキャッシュ優先
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // 同一オリジンのみ（外部APIはそのままネットに流す）
  if (url.origin !== self.location.origin) return;

  // HTMLは network-first
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

  // それ以外は cache-first
  e.respondWith(
    caches.match(req).then(matched => matched || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE_NAME).then(c => c.put(req, copy));
      return res;
    }))
  );
});

