// Service worker de Nutri: la app funciona sin conexión.
const CACHE = 'nutri-v1';
const ASSETS = ['./', './index.html', './app.js', './foods.js', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  // Primero red (para recibir actualizaciones); si no hay conexión, caché.
  e.respondWith(fetch(req).then(r => {
    if (r.ok) { const c = r.clone(); caches.open(CACHE).then(x => x.put(req.mode === 'navigate' ? './index.html' : req, c)); }
    return r;
  }).catch(() => caches.match(req.mode === 'navigate' ? './index.html' : req, {ignoreSearch: true})));
});
