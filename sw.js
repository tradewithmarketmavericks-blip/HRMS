// Market Mavericks HRMS — Service Worker v7
// This version aggressively clears old caches and forces update
const CACHE = 'mm-hrms-v8';

self.addEventListener('install', e => {
  console.log('[SW] Installing v7');
  self.skipWaiting(); // Take over immediately
  e.waitUntil(
    caches.open(CACHE).then(cache => {
      return cache.addAll([
        'index.html', 'admin.html', 'employee.html',
        'config.js', 'logo.png', 'icon-192.png', 'icon-512.png', 'manifest.json'
      ]).catch(err => console.log('[SW] Cache add error:', err));
    })
  );
});

self.addEventListener('activate', e => {
  console.log('[SW] Activating v7 - clearing old caches');
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          console.log('[SW] Deleting cache:', key);
          return caches.delete(key); // Delete ALL including current
        })
      );
    }).then(() => self.clients.claim()) // Take control of all tabs
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('supabase.co')) return;
  if (e.request.url.includes('functions/v1')) return;
  if (e.request.url.includes('cdnjs.cloudflare.com')) return;

  // Network first, then cache fallback
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
