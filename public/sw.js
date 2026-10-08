// ContentOps no longer uses Chrome / Windows desktop pop-ups — the app shows its own pop-ups
// inside the page. This worker only cleans up what an earlier version installed: it drops the
// push registration and removes itself.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const sub = await self.registration.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
    } catch (e) { /* ignore */ }
    await self.registration.unregister();
  })());
});
