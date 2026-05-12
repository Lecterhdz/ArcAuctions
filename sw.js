const CACHE_NAME = 'arcauctions-v1';
const urlsToCache = [
  '/',
  '/dashboard.html',
  '/css/styles.css',
  '/js/app.js',
  '/js/auth.js',
  '/js/auction.js',
  '/js/theme.js',
  '/js/firebase-config.js',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
});
