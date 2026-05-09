// MRX Service Worker — cache-first with network fallback
const CACHE = 'mrx-v2';
const PRECACHE = [
  './',
  './index.html',
  // Core libraries — versions must match what index.html loads
  'https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.5/d3.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/topojson/3.0.2/topojson.min.js',
  // World atlas — primary (110m) + fallback (50m)
  'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json',
  'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json',
  // Charting + email
  'https://cdn.jsdelivr.net/npm/lightweight-charts@4.1.3/dist/lightweight-charts.standalone.production.js',
  'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js',
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
  // Pass through API calls — never cache LLM/auth/analytics responses
  const url = e.request.url;
  if (url.includes('generativelanguage.googleapis.com') ||
      url.includes('api.anthropic.com') ||
      url.includes('api.emailjs.com') ||
      url.includes('pollinations.ai') ||
      url.includes('gstatic.com/firebasejs') ||
      url.includes('firebaseio.com') ||
      url.includes('firestore.googleapis.com')) {
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
