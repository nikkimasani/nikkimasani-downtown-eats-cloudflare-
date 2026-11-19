// Offline support: the app shell and libraries come from the cache instantly; data files try the network first
// (so hours and happy hours stay fresh) and fall back to the last copy when there's no signal.
const V = 'de-v2';
const SHELL = ['./', 'index.html', 'style.css', 'app.js', 'map.js', 'pov.js', 'hours.js', 'manifest.json', 'icon.svg', 'icon-192.png', 'vendor/three.module.min.js'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url); if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/api/')) return;
  const fresh = /\.(json|js|css|html)$/.test(u.pathname) || u.pathname.endsWith('/');
  if (fresh) e.respondWith(fetch(e.request).then((r) => { if (r.ok) { const c = r.clone(); caches.open(V).then((ch) => ch.put(e.request, c)); } return r; }).catch(() => caches.match(e.request, { ignoreSearch: true })));
  else e.respondWith(caches.match(e.request).then((m) => m || fetch(e.request).then((r) => { if (r.ok) { const c = r.clone(); caches.open(V).then((ch) => ch.put(e.request, c)); } return r; })));
});
