/* eslint-disable no-undef */
/**
 * The push service worker.
 *
 * Deliberately tiny, and plain JavaScript rather than TypeScript: this file is
 * served as-is from `public/`, so anything the build would have to transform is
 * a build step between a browser and a notification. There is nothing here
 * worth that.
 *
 * It does exactly two things. A `push` event shows the notification the server
 * sent; a click opens the url it carries. It reads no state, calls no API and
 * holds no credentials — a service worker runs when the app is closed, so
 * everything it can do, it can do to somebody who is not looking.
 */

self.addEventListener('push', (event) => {
  // A push with no payload is a keepalive from some services. Showing an empty
  // notification for one is worse than showing nothing.
  if (!event.data) {
    return;
  }

  let payload;

  try {
    payload = event.data.json();
  } catch {
    return;
  }

  const title = typeof payload.title === 'string' ? payload.title : 'ShuddhoSpell';
  const body = typeof payload.body === 'string' ? payload.body : '';
  const url = typeof payload.url === 'string' ? payload.url : '/dashboard';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      // Collapses replacements: two "reviews due" pushes become one. A stack of
      // eight is how the permission gets revoked.
      tag: typeof payload.tag === 'string' ? payload.tag : 'shuddhospell',
      data: { url },
      // No badge, no icon and no image: the design system forbids illustration,
      // and a missing asset renders worse than none at all.
      requireInteraction: false,
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const target = event.notification.data && event.notification.data.url;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      // Focus a tab that is already open rather than opening a second one. A
      // learner who clicks four notifications should not end up with four tabs.
      for (const client of windows) {
        if ('focus' in client) {
          client.navigate(target || '/dashboard');

          return client.focus();
        }
      }

      return self.clients.openWindow(target || '/dashboard');
    }),
  );
});
