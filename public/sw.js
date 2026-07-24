const CACHE_NAME = 'sucesskart-notifications-v1';

self.addEventListener('push', (event) => {
  let data = { title: 'SuccessKart', body: '', icon: '/NewLogo.jpeg', url: '/app' };

  if (event.data) {
    try {
      const json = event.data.json();
      data = { ...data, ...json };
    } catch {
      data.body = event.data.text();
    }
  }

  const notificationOptions = {
    body: data.body,
    icon: data.icon || '/NewLogo.jpeg',
    badge: '/NewLogo.jpeg',
    data: { url: data.url || '/app' },
    tag: data.tag || 'sucesskart-notification',
    renotify: true,
    vibrate: [200, 100, 200],
  };

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      const meta = {
        title: data.title,
        body: data.body,
        url: data.url,
        timestamp: Date.now(),
      };
      return cache.put(
        new Request(`notification-${Date.now()}`),
        new Response(JSON.stringify(meta))
      );
    }).then(() => {
      return self.registration.showNotification(data.title, notificationOptions);
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification?.data?.url || '/app';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
});
