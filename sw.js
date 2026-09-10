/* =====================================================
   EDGE FOOTBALL — sw.js
   Network-First: التحديثات بتظهر فورًا لكل الزوار
   والكاش بيشتغل كخطة احتياطية لما النت مقطوع
   ===================================================== */
const CACHE = 'edge-football-v1';

const CORE = ['./', 'index.html'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* ⚡ شبكة أولًا → كاش احتياطي (بمفتاح نظيف بدون query عشان الكاش ميتكدسش) */
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  const clean = new URL(e.request.url);
  clean.search = '';
  const cacheKey = clean.toString();
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(cacheKey, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(cacheKey).then((r) => r || caches.match('./')))
  );
});

/* 🔔 إشعارات Push (متوافقة مع كل الصيغ) */
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data.json(); } catch (err) {
    d = { title: 'Edge Football', body: (e.data && e.data.text()) || '' };
  }
  const title = d.title || (d.data && d.data.title) || '⚽ Edge Football';
  const body = d.body || (d.data && d.data.body) || 'تحديث جديد!';
  const url = d.url || (d.data && d.data.url) || './';
  e.waitUntil(
    self.registration.showNotification(title, {
      body: body,
      icon: 'https://cdn.jsdelivr.net/gh/andrew101018/EDGE@main/photo_2024-09-05_19-57-28.jpg',
      badge: 'https://cdn.jsdelivr.net/gh/andrew101018/EDGE@main/photo_2024-09-05_19-57-28.jpg',
      tag: d.tag || 'edge-football',
      dir: 'rtl',
      lang: 'ar',
      data: { url: url }
    })
  );
});

/* الضغط على الإشعار */
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (let i = 0; i < list.length; i++) {
        if ('focus' in list[i]) { list[i].focus(); return; }
      }
      return self.clients.openWindow(url);
    })
  );
});
