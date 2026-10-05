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
        icon: 'https://cdn-icons-png.flaticon.com/512/3602/3602145.png',
        badge: 'https://cdn-icons-png.flaticon.com/512/3602/3602145.png',
        requireInteraction: true, // keeps notification on screen until user interacts
        vibrate: [200, 100, 200],
        ...options,
      })
    );
  }
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
