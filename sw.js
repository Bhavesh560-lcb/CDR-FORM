// ડેટા એન્ટ્રી રજિસ્ટર — Service Worker
// આ ફાઇલ એપને "ઇન્સ્ટોલ કરી શકાય તેવી" (installable) બનાવે છે અને
// ઈન્ટરનેટ ન હોય ત્યારે પણ એપ ખૂલે એ માટે મુખ્ય ફાઇલો કેશ કરે છે.
// નોંધ: Google Sheet સાથેની actual entries/login સિંક માટે ઈન્ટરનેટ જરૂરી જ રહેશે —
// આ ફક્ત એપનું "શેલ" (HTML/CSS/JS/આઇકોન) ઑફલાઇન લોડ થાય એ સુનિશ્ચિત કરે છે.

const CACHE_NAME = 'gunho-data-entry-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // ફક્ત આપણી પોતાની (same-origin) GET રિક્વેસ્ટ કેશ કરો.
  // Google Apps Script (webhook) તરફની રિક્વેસ્ટ હંમેશા સીધી નેટવર્ક પર જ જવા દો,
  // જેથી લોગિન/એન્ટ્રી ડેટા હંમેશા લેટેસ્ટ જ રહે.
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
