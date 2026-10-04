/* SSCPC service worker: pass-through only.
   It keeps the site installable but stores NO pages, so the site needs the internet
   (forms cannot be filled offline). On activation it also deletes caches left by older versions. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))).then(() => self.clients.claim())
));
self.addEventListener('fetch', () => { /* network only */ });
