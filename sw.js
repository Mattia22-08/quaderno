/* Il mio Quaderno — service worker: fa funzionare l'app anche senza internet */
const CACHE = 'quaderno-v2';
const FILES = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './pdf.js',
  './manifest.webmanifest',
  './vendor/jspdf.umd.min.js',
  './fonts/atkinson-400.woff2',
  './fonts/atkinson-700.woff2',
  './fonts/literata.woff2',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-64.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Rete prima (per avere sempre l'ultima versione), cache se offline.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        }
        // il sito risponde con un errore (es. 404 se viene tolto da GitHub): usa la copia già salvata sull'iPad
        return caches.match(req, { ignoreSearch: true })
          .then((r) => r || (req.mode === 'navigate' ? caches.match('./index.html') : null))
          .then((r) => r || res);
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('./index.html')))
  );
});
