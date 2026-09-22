// ડેટા એન્ટ્રી રજિસ્ટર — Service Worker
// આ ફાઇલ એપને "ઇન્સ્ટોલ કરી શકાય તેવી" (installable) બનાવે છે અને
// ઈન્ટરનેટ ન હોય ત્યારે પણ એપ ખૂલે એ માટે મુખ્ય ફાઇલો કેશ કરે છે.
// નોંધ: Google Sheet સાથેની actual entries/login સિંક માટે ઈન્ટરનેટ જરૂરી જ રહેશે —
// આ ફક્ત એપનું "શેલ" (HTML/CSS/JS/આઇકોન) ઑફલાઇન લોડ થાય એ સુનિશ્ચિત કરે છે.

const CACHE_NAME = 'gunho-data-entry-v24';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
  './logo-header.png'
];

// ============================================================
// પુશ નોટિફિકેશન (Firebase Cloud Messaging) — ઍપ સંપૂર્ણ બંધ હોય તો પણ
// "નવી CDR ફાઇલ આવી છે" એવું નોટિફિકેશન ફોન પર બતાવવા માટે. Service
// Worker હંમેશા બ્રાઉઝર/ફોન બેકગ્રાઉન્ડમાં જીવતું રહે છે, એટલે અહીં
// હેન્ડલ કરેલ પુશ ઍપ ખૂલી ન હોય ત્યારે પણ કામ કરે છે.
//
// ⚠ નીચેની firebaseConfig ભરવી જરૂરી છે — Firebase Console → Project
// settings → General → "Your apps" → Web app → SDK setup and
// configuration માંથી કૉપી કરો.
// ============================================================
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: 'AIzaSyCXPm-JKDlLnzS1k0C57BGMXVBLDfx86NE',
  authDomain: 'cms-lcb-rr.firebaseapp.com',
  projectId: 'cms-lcb-rr',
  storageBucket: 'cms-lcb-rr.firebasestorage.app',
  messagingSenderId: '493087201778',
  appId: '1:493087201778:web:f3c5f88cd2ce7fd0cb736b'
};

try {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  // ઍપ બંધ/બેકગ્રાઉન્ડમાં હોય ત્યારે પુશ આવે તો આ ચાલે છે
  messaging.onBackgroundMessage((payload) => {
    const title = (payload.notification && payload.notification.title) || 'ડેટા એન્ટ્રી રજિસ્ટર';
    const body = (payload.notification && payload.notification.body) || 'નવી CDR ફાઇલ આવી છે';
    self.registration.showNotification(title, {
      body: body,
      icon: './icon-192.png',
      badge: './icon-192.png'
    });
  });
} catch (fcmSetupErr) {
  // firebaseConfig હજુ ભરાયું ન હોય તો પણ બાકીની (ઑફલાઇન-કેશ) સિસ્ટમ ચાલુ રહે
}

// નોટિફિકેશન પર ટૅપ કરે એટલે એપ ખૂલે (પહેલેથી ખૂલેલી હોય તો એ જ ટૅબ ફોકસ થાય)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('./');
    })
  );
});

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
