const CACHE_NAME = 'student-progress-offline-v19-guardian-batch-avatars';
const ROOT = './';
const APP_SHELL = [
  ROOT, './index.html', './manifest.json?v=mobile-final-2', './brand-logo.png', './pwa-icon-192-v2.png', './pwa-icon-512-v2.png', './pwa-icon-maskable-512-v2.png',
  './styles/approved.css', './styles/batch-workspace.css?v=batch-production-14', './styles/batch-correction.css', './styles/avatar-correction.css', './styles/form-correction.css', './styles/online-guardian.css?v=guardian-v3', './styles/guardian-donut-fix.css?v=guardian-production-1', './styles/contact-footer.css?v=mobile-final-2', './styles/mobile-header-correction.css?v=cloud-status-icon-1',
  './scripts/entry-pwa.js?v=guardian-invite-fix-1', './scripts/dashboard-v5.js?v=mobile-final-2', './scripts/backup-wire.js', './scripts/modal-close-fix.js', './scripts/batch-workspace.js?v=batch-production-14', './scripts/locale.js?v=locale-production-3', './scripts/online-firebase.js?v=guardian-production-5', './assets/avatars/catalog.js?v=avatar-catalog-3',
  './student-workspace/index.html', './student-workspace/manifest.json', './student-workspace/brand-logo.png', './student-workspace/icon.svg', './student-workspace/workspace-i18n.js', './student-workspace/assets/index-CUv9GUcr.js', './student-workspace/assets/index-D_Dn3Xft.css'
].concat(
  Array.from({ length: 33 }, (_, index) => `./assets/avatars/male-${String(index + 1).padStart(2, '0')}.webp`),
  Array.from({ length: 31 }, (_, index) => `./assets/avatars/female-${String(index + 1).padStart(2, '0')}.webp`)
);

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    const copy = response.clone();
    caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
    return response;
  }).catch(() => event.request.mode === 'navigate' ? caches.match('./index.html') : caches.match(event.request))));
});
