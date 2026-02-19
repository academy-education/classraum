// Service Worker for Web Push Notifications

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Classraum', body: event.data.text() };
  }

  const { title = 'Classraum', body = '', data = {}, imageUrl } = payload;

  const options = {
    body,
    icon: '/logo-icon.png',
    badge: '/logo-icon.png',
    data,
    tag: data.type || 'default',
    renotify: true,
  };

  if (imageUrl) {
    options.image = imageUrl;
  }

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  let targetPath = '/dashboard/notifications';

  switch (data.type) {
    case 'session':
      if (data.id) targetPath = `/dashboard/sessions/${data.id}`;
      break;
    case 'assignment':
      if (data.id) targetPath = `/dashboard/assignments?id=${data.id}`;
      break;
    case 'message':
      if (data.id) targetPath = `/dashboard/messages/${data.id}`;
      break;
    case 'grade':
      targetPath = '/dashboard/assignments';
      break;
    case 'announcement':
      targetPath = '/dashboard/notifications';
      break;
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Try to focus an existing tab
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.postMessage({ type: 'NOTIFICATION_CLICK', path: targetPath });
          return;
        }
      }
      // No existing tab - open a new one
      return self.clients.openWindow(targetPath);
    })
  );
});
