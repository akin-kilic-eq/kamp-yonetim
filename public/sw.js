const CACHE_NAME = 'kamp-yonetim-v2';
const urlsToCache = [
  '/',
  '/login',
  '/dashboard',
  '/personnel',
  '/camps',
  '/workers',
  '/rooms',
  '/reports',
  '/admin',
  '/antteq-logo.png',
  '/arka-plan-guncel-2.jpg',
  '/manifest.json'
];

// Service Worker kurulumu
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache açıldı');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch olaylarını yakalama
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache'de varsa cache'den döndür
        if (response) {
          return response;
        }
        
        // Cache'de yoksa network'ten al
        return fetch(event.request)
          .then((response) => {
            // Geçersiz response'ları cache'leme
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Response'u klonla
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          });
      })
  );
});

// Eski cache'leri temizleme
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Eski cache siliniyor:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
