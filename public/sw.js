/* Vidyalaya service worker: offline fallback for pages and phone notifications.
 * School data is never cached: API responses always come from the server. */
const VERSION = 'v1';
const OFFLINE = '/offline.html';
const STATIC = ['/offline.html', '/icons/icon-192.png', '/icons/badge-96.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(STATIC)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Pages: network first, offline page when there is no connection.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || req.mode !== 'navigate') return;
  event.respondWith(fetch(req).catch(() => caches.match(OFFLINE)));
});

self.addEventListener('push', (event) => {
  let data = { title: 'Vidyalaya', body: 'You have a new notification.', link: '/notifications' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (e) {
    // plain-text payload
    if (event.data) data.body = event.data.text();
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-96.png',
      tag: data.link,
      renotify: true,
      data: { link: data.link },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || '/notifications';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if (new URL(w.url).origin === self.location.origin) {
          w.focus();
          return w.navigate(link);
        }
      }
      return self.clients.openWindow(link);
    })
  );
});
