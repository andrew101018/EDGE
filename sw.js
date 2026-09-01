const CACHE = 'edge-v5';
const ASSETS = ['/EDGE/', '/EDGE/index.html', '/EDGE/app.js', '/EDGE/style.css',
  'https://cdn.jsdelivr.net/gh/andrew101018/EDGE@main/photo_2024-09-05_19-57-28.jpg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
self.addEventListener('push', e => {
  let d = {title: '⚽ Edge Football', body: 'في جديد عندك!', url: '/EDGE/'};
  try { if (e.data) d = Object.assign(d, e.data.json()); } catch (err) {}
  e.waitUntil(self.registration.showNotification(d.title, {
    body: d.body, icon: 'https://cdn.jsdelivr.net/gh/andrew101018/EDGE@main/photo_2024-09-05_19-57-28.jpg',
    badge: 'https://cdn.jsdelivr.net/gh/andrew101018/EDGE@main/photo_2024-09-05_19-57-28.jpg', data: {url: d.url}
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/EDGE/';
  e.waitUntil(clients.matchAll({type: 'window'}).then(cs => {
    for (const c of cs) if (c.url.includes(url) && 'focus' in c) return c.focus();
    return clients.openWindow(url);
  }));
});
