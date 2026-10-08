/* ============================================================
 *  合成大奶娃 · 破解版 —— Service Worker（离线缓存）
 *
 *  策略：核心内容「缓存优先」，让第二次打开瞬间可用、断网也能玩。
 *    · install：把全部核心文件预先缓存；单个文件失败不影响整体安装
 *    · activate：清掉旧版本缓存
 *    · fetch：同源 GET 走缓存优先，未命中再走网络并顺手补进缓存
 *
 *  改了任何一个文件，就把 VERSION 递增一位，客户端下次进入即更新。
 * ============================================================ */

var VERSION = 'danaiwa-crack-v2';

var CORE = [
  './',
  './index.html',
  './style.css',
  './game.js',
  './local-board.js',
  './sw-register.js',
  './manifest.webmanifest',
  './assets/fruits/parts.js',
  './assets/fruits/blur.js',
  './assets/fruits/01-grape.webp',
  './assets/fruits/02-cherry.webp',
  './assets/fruits/03-orange.webp',
  './assets/fruits/04-lemon.webp',
  './assets/fruits/05-kiwi.webp',
  './assets/fruits/06-tomato.webp',
  './assets/fruits/07-peach.webp',
  './assets/fruits/08-pineapple.webp',
  './assets/fruits/09-coconut.webp',
  './assets/fruits/10-halfmelon.webp',
  './assets/fruits/11-watermelon.webp',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/apple-touch-icon.png'
];

self.addEventListener('install', function (event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(VERSION).then(function (cache) {
      /* 逐个 add：任何一个 404 都不会让整次安装失败 */
      return Promise.all(CORE.map(function (url) {
        return cache.add(new Request(url, { cache: 'reload' })).catch(function () { /* 忽略单点失败 */ });
      }));
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        return k === VERSION ? null : caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;

  var url;
  try { url = new URL(req.url); } catch (e) { return; }
  if (url.origin !== self.location.origin) return;   // 外部资源不碰

  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        /* 只缓存正常响应；opaque / 错误响应不进缓存 */
        if (res && res.status === 200 && res.type === 'basic') {
          var copy = res.clone();
          caches.open(VERSION).then(function (cache) { cache.put(req, copy); }).catch(function () {});
        }
        return res;
      }).catch(function () {
        /* 离线且没缓存：导航请求退回首页，其余交给浏览器报错 */
        if (req.mode === 'navigate') return caches.match('./index.html');
        throw new Error('offline and not cached: ' + req.url);
      });
    })
  );
});
