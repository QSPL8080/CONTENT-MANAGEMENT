// Service Worker for ContentFlow Desktop Pop-up Notifications
// Enables system pop-ups to appear on screen even if tab is in the background or inactive.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Receive notification dispatch commands from web pages or background threads
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    event.waitUntil(
      self.registration.showNotification(title, {
        icon: '/quickupp-q.png',
        badge: '/quickupp-q.png',
        requireInteraction: true, // keeps notification on screen until user interacts
        vibrate: [200, 100, 200],
        ...options,
      })
    );
  }
});

// Pop-ups sent by the server (Web Push) — shown even when ContentOps isn't open
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'Quickupp ContentOps', body: event.data ? event.data.text() : '' };
  }
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // ContentOps is open and in front → the page shows its own pop-up (bottom-right, inside
      // the app), so skip the desktop one to avoid showing the same thing twice.
      const inFront = clientList.some((c) => c.visibilityState === 'visible' && c.focused);
      if (inFront) return;
      return self.registration.showNotification(data.title || 'Quickupp ContentOps', {
        body: data.body || '',
        icon: '/quickupp-q.png',
        badge: '/quickupp-q.png',
        tag: data.tag || undefined,
        requireInteraction: data.persistent !== false,
        data: { contentId: data.contentId || null },
      });
    })
  );
});

// Handle clicking on desktop pop-up notification:
// Focuses open ContentFlow window or opens the app and selects the task
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const contentId = data.contentId;
  const targetPath = contentId ? `/?content_id=${encodeURIComponent(contentId)}` : '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if open
      for (const client of clientList) {
        if ('focus' in client) {
          if (contentId && 'postMessage' in client) {
            client.postMessage({
              type: 'OPEN_TASK',
              contentId: contentId,
            });
          }
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetPath);
      }
    })
  );
});
