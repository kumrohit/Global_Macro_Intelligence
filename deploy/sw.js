// GMI Service Worker — cache-first with network fallback
const CACHE = 'gmi-v1';
const PRECACHE = [
  './',
  './index.html',
  'https://cdnjs.cloudflare.com/ajax/libs/d3/7.9.0/d3.min.js',
  'https://cdn.jsdelivr.net/npm/topojson-client@3/dist/topojson-client.min.js',
  'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Pass through API calls — never cache Gemini/Anthropic responses
  const url = e.request.url;
  if (url.includes('generativelanguage.googleapis.com') ||
      url.includes('api.anthropic.com') ||
      url.includes('api.emailjs.com') ||
      url.includes('gstatic.com/firebasejs')) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (!res || res.status !== 200 || res.type === 'opaque') return res;
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      });
    })
  );
});
