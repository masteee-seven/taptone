// taptone Service Worker — オフライン対応
// アプリ本体を更新したら CACHE_VERSION を上げると、古いキャッシュが破棄されます。
const CACHE_VERSION = 'taptone-v2';
const CORE_ASSETS = [
  './',
  './index.html',
  './taptone.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      // 1ファイルの取得失敗で全体が失敗しないよう個別に追加
      Promise.all(CORE_ASSETS.map((url) => cache.add(url).catch(() => {})))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// キャッシュ優先＋裏で更新（オンライン時は次回起動で最新版に）
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;

  event.respondWith(
    caches.open(CACHE_VERSION).then(async (cache) => {
      const cached = await cache.match(req, { ignoreSearch: true });
      const network = fetch(req).then((res) => {
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      }).catch(() => null);

      if (cached) { network; return cached; }
      const res = await network;
      if (res) return res;
      // 画面遷移のオフライン時は本体HTMLを返す
      if (req.mode === 'navigate') {
        return (await cache.match('./index.html')) || (await cache.match('./')) || Response.error();
      }
      return Response.error();
    })
  );
});
