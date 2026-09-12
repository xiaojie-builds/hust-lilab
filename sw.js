/* 李学飞课题组 Li Lab — Service Worker
   策略：网络优先，离线时回退到缓存。
   网络优先保证访客永远先看到最新内容；断网或信号差时仍能打开已看过的页面。 */
var CACHE = 'lilab-v2';

var PRECACHE = [
  'index.html', 'about.html', 'research.html', 'people.html',
  'publication.html', 'news.html', 'join.html',
  'assets/site.css', 'assets/site.js', 'assets/hust-logo.jpeg'
];

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      // 逐个添加：某个文件失败不影响其余缓存
      return Promise.all(PRECACHE.map(function (url) {
        return c.add(url).catch(function () {});
      }));
    })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        return k === CACHE ? null : caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== location.origin) return;

  e.respondWith(
    fetch(req).then(function (res) {
      if (res && res.status === 200 && res.type === 'basic') {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); }).catch(function () {});
      }
      return res;
    }).catch(function () {
      return caches.match(req).then(function (hit) {
        return hit || caches.match('index.html');
      });
    })
  );
});
