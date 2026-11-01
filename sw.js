// Offline shell for the Ti60 BLE console.
// NOTE: keep this file ASCII-only. A previous copy went through PowerShell
// Get-Content/Set-Content and got double-encoded (GBK<->UTF-8), which made
// Chrome reject it with "ServiceWorker script evaluation failed".
// Bump VERSION whenever app.js / app.css / *.html change.
'use strict';

const VERSION = 'ti60-ble-v7-clean';

// Both entry pages must be precached, otherwise an offline launch can only
// reach one of them.
const SHELL = [
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

// Offline fallback page: pick the mobile entry for mobile-ish paths.
function fallbackFor(pathname) {
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

  // Navigations: network first so a fresh deploy is picked up; fall back to the
  // cache of the SAME page (not always index.html) when offline.
  if (req.mode === 'navigate') {
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

  // Static assets: cache first, refresh in the background.
  event.respondWith((async () => {
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
