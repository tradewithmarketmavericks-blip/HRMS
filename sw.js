// PeopleCore HRMS — Service Worker
const CACHE = 'mm-hrms-v1';
const ASSETS = [
  '/HRMS/',
  '/HRMS/index.html',
  '/HRMS/admin.html',
  '/HRMS/employee.html',
  '/HRMS/config.js',
  '/HRMS/logo.png',
  '/HRMS/icon-192.png',
  '/HRMS/icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css',
];

// Install — cache core assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

// Activate — clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — network first, fall back to cache
self.addEventListener('fetch', e => {
  // Skip non-GET and Supabase API calls (always need live data)
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('supabase.co')) return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Cache successful responses for our assets
        if (res.ok && (e.request.url.includes('/HRMS/') || e.request.url.includes('font-awesome'))) {
          const clone = res.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then(cached => {
        if (cached) return cached;
        // Offline fallback for HTML pages
        if (e.request.destination === 'document') {
          return caches.match('/HRMS/index.html');
        }
      }))
  );
});

// Background sync for offline actions (future use)
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
