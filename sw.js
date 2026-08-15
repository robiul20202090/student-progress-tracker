const CACHE_NAME = 'education-progress-platform-v4.4.0';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './styles/v4.css',
  './scripts/firebase-config.js',
  './scripts/i18n.js',
  './scripts/student-journey.js',
  './scripts/data-service.js',
  './scripts/platform.js',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
  )));
  self.clients.claim();
});

// Network-first keeps app code and configuration current while preserving a safe
// offline fallback for the already-installed shell.
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  const networkResponse = fetch(event.request).then(response => {
    if (response && response.ok) {
      // A response body may already be consumed by the browser or another
      // handler. Clone defensively, and never let a cache failure replace a
      // valid network response.
      let copy = null;
      try {
        copy = response.clone();
      } catch (_) {
        copy = null;
      }
      if (copy) {
        const cacheWrite = caches.open(CACHE_NAME)
          .then(cache => cache.put(event.request, copy))
          .catch(() => undefined);
        event.waitUntil(cacheWrite);
      }
    }
    return response;
  }).catch(() => caches.match(event.request).then(cached =>
    cached || (event.request.mode === 'navigate' ? caches.match('./index.html') : Response.error())
  ));

  event.respondWith(networkResponse);
});
