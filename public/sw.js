// Offline support: the app shell and libraries come from the cache instantly; data files try the network first
// (so hours and happy hours stay fresh) and fall back to the last copy when there's no signal.
const V = 'de-v15';
const SHELL = ['./', 'index.html', 'style.css', 'app.js', 'map.js', 'pov.js', 'hours.js', 'manifest.json', 'icon.svg', 'icon-192.png', 'vendor/three.module.min.js'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
// Big map and restaurant files (they change at most daily) come straight from the cache and refresh in the background.
// Everything else tries the network first but gives up after 2 s and uses the last copy, so a weak signal never stalls the app.
const STALE_OK = /\/(buildings|streets|homes|osm-pois|metro-static|places|curated|overrides|happyhour|hours-check|events|steak-nights|ayce)\.json$/;
const put = (req, r) => { if (r && r.ok) { const c = r.clone(); caches.open(V).then((ch) => ch.put(req, c)); } return r; };
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url); if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/api/')) return;
  if (STALE_OK.test(u.pathname)) {
    e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((m) => { const net = fetch(e.request).then((r) => put(e.request, r)); if (m) { e.waitUntil(net.catch(() => {})); return m; } return net; }));
    return;
  }
  // the page and its code always come from the network when there's any signal, so you never get an old version;
  // the saved copy is used only when the phone is offline
  if (e.request.mode === 'navigate' || /\.(js|css|html)$/.test(u.pathname) || u.pathname.endsWith('/')) {
    e.respondWith(fetch(e.request, { cache: 'no-cache' }).then((r) => put(e.request, r)).catch(() => caches.match(e.request, { ignoreSearch: true }).then((m) => m || caches.match('index.html'))));
    return;
  }
  const fresh = /\.json$/.test(u.pathname);
  if (fresh) e.respondWith(new Promise((done) => {
    let settled = false; const net = fetch(e.request).then((r) => put(e.request, r));
    const fallback = () => caches.match(e.request, { ignoreSearch: true }).then((m) => { if (m && !settled) { settled = true; done(m); } return m; });
    const t = setTimeout(fallback, 2000);
    net.then((r) => { clearTimeout(t); if (!settled) { settled = true; done(r); } }).catch(() => { clearTimeout(t); fallback().then((m) => { if (!settled) { settled = true; done(m || Response.error()); } }); });
  }));
  else e.respondWith(caches.match(e.request).then((m) => m || fetch(e.request).then((r) => put(e.request, r))));
});

// push reminders from the server (happy hour starting soon)
self.addEventListener('push', (e) => { let d = {}; try { d = e.data.json(); } catch (_) { d = { title: 'Inner Loop Eats', body: e.data && e.data.text() }; } e.waitUntil(self.registration.showNotification(d.title || 'Downtown Eats', { body: d.body || '', icon: 'icon-192.png', badge: 'icon-192.png', data: { url: d.url || './' } })); });
self.addEventListener('notificationclick', (e) => { e.notification.close(); const u = e.notification.data && e.notification.data.url || './'; e.waitUntil(clients.matchAll({ type: 'window' }).then((ws) => { for (const w of ws) { if ('focus' in w) { w.navigate(u); return w.focus(); } } return clients.openWindow(u); })); });
