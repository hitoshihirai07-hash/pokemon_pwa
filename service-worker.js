const CACHE_NAME = 'poke-calc-cache-v9';
const ASSETS = [
  './',
  './index.html',
  './app.js',
  './manifest.json',
  './pokemon_master.json'
  // 画像フォルダを使うなら: './imgs/...'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(e.request).then(res => res || fetch(e.request).then(r=>{
        // 動的にjson差し替える場合はここでキャッシュ更新してもOK
        return r;
      }))
    );
  } else {
    // 外部画像（PokeAPI等）はネット優先
    e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)));
  }
});


