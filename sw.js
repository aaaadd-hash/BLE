// Offline shell for the Ti60 BLE console. Bump VERSION when shipping new files.
// 鐩爣锛氳鍒颁富灞忓悗锛屾墜鏈哄湪鏃犵綉缁滅殑灞曚細鐜板満涔熻兘鐩存帴鎵撳紑骞惰繛钃濈墮锛圔LE 鏄湰鍦板崗璁紝涓嶉渶瑕佺綉缁滐級銆?'use strict';

const VERSION = 'ti60-ble-v6-exp';

// 妗岄潰椤典笌鎵嬫満椤靛悇鑷槸鐙珛鍏ュ彛锛屼袱涓兘瑕侀缂撳瓨锛屽惁鍒欑绾挎椂鍙兘鎷垮埌鍏朵腑涓€涓€?const SHELL = [
  './',
  './index.html',
  './index_mobile.html',
  './app.css',
  './app.js',
  './ble_proto.js',
  './manifest.webmanifest',
  './manifest-mobile.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
  './icons/favicon.svg',
];

// 绂荤嚎鏃剁殑鍏滃簳椤碉細鎸夎姹傝矾寰勫垽鏂鍥炴闈㈤〉杩樻槸鎵嬫満椤?function fallbackFor(pathname) {
  return /mobile/i.test(pathname) ? './index_mobile.html' : './index.html';
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(VERSION)
      .then(cache => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // 椤甸潰瀵艰埅锛氬厛璧扮綉缁滄嬁鏈€鏂扮増锛屽け璐ユ椂鍥為€€鍒般€屽悓涓€涓〉闈€嶇殑缂撳瓨锛?  // 鑰屼笉鏄竴寰嬪洖 index.html鈥斺€斿惁鍒欐墜鏈虹绂荤嚎浼氭墦寮€妗岄潰鐗堥〉闈€?  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(VERSION);
        cache.put(req, fresh.clone());
        return fresh;
      } catch (_) {
        return (await caches.match(req, { ignoreSearch: true }))
          || (await caches.match(fallbackFor(url.pathname)))
          || (await caches.match('./index.html'))
          || Response.error();
      }
    })());
    return;
  }

  // 闈欐€佽祫婧愶細缂撳瓨浼樺厛锛屽悗鍙伴『渚挎洿鏂?  event.respondWith((async () => {
    const cached = await caches.match(req);
    const network = fetch(req).then(res => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(VERSION).then(cache => cache.put(req, copy));
      }
      return res;
    }).catch(() => null);
    return cached || (await network) || Response.error();
  })());
});
