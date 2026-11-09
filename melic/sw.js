// Service worker: permet obrir l'app sense connexió.
// Si canvies fitxers de l'app, puja el número de VERSIO perquè els mòbils s'actualitzin.
const VERSIO = 'melic-v1';
const FITXERS = [
  './',
  './index.html',
  './config.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSIO).then((c) => c.addAll(FITXERS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((claus) =>
      Promise.all(claus.filter((k) => k !== VERSIO).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;

  // Llibreries de Firebase: es guarden per poder arrencar sense xarxa
  if (url.hostname === 'www.gstatic.com') {
    e.respondWith(
      caches.open(VERSIO).then(async (c) => {
        const guardat = await c.match(e.request);
        if (guardat) return guardat;
        const resp = await fetch(e.request);
        if (resp.ok) c.put(e.request, resp.clone());
        return resp;
      })
    );
    return;
  }

  // Fitxers propis: primer xarxa (per tenir sempre la darrera versió), si no, memòria cau
  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(e.request)
        .then((resp) => {
          if (resp.ok) caches.open(VERSIO).then((c) => c.put(e.request, resp.clone()));
          return resp;
        })
        .catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html')))
    );
  }
});
