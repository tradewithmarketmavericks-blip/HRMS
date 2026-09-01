const CACHE = 'mm-hrms-v6';
const ASSETS = [
  'index.html',
  'admin.html', 
  'employee.html',
  'config.js',
  'logo.png',
  'icon-192.png',
  'icon-512.png',
  'manifest.json',
];

self.addEventListener('install', e => {
  // Force immediate activation - don't wait
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS)).catch(err => console.log('Cache error:', err))
  );
});

self.addEventListener('activate', e => {
  // Take control immediately
  e.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then(keys => 
        Promise.all(keys.filter(k => k !== CACHE).map(k => {
          console.log('Deleting old cache:', k);
          return caches.delete(k);
        }))
      )
    ])
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('supabase.co')) return;
  if (e.request.url.includes('functions/v1')) return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then(cached => cached || caches.match('index.html')))
  );
});

// Listen for skip message from clients
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
