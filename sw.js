const CACHE = 'national-dairy-v1';
const ASSETS = [
  '/', 
  '/index.html', 
  '/manifest.json'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE) return caches.delete(key);
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Skip Supabase API calls so offline milk deliveries bypass browser caching 
  // and go straight into local queue persistence in index.html
  if (url.origin.includes('supabase.co')) return;

  // For page navigation requests, try network first, fallback to cached index.html offline
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => {
        return caches.match('/index.html');
      })
    );
    return;
  }

  // For other static assets (Tailwind CDN, Supabase JS library, icons), try cache first
  e.respondWith(
    caches.match(e.request).then(cached => {
      return cached || fetch(e.request).then(response => {
        let clone = response.clone();
        caches.open(CACHE).then(cache => cache.put(e.request, clone));
        return response;
      }).catch(() => {
        // Fallback if both fail
      });
    })
  );
});
