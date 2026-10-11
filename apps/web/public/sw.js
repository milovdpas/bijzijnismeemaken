/*
 * The service worker, by hand (docs/02 §2.10).
 *
 * Navigations go to the network first and fall back to the cached /offline
 * page when it is unreachable. Next's hashed static files and the icons are
 * cached on first use, since their names change when their contents do. The
 * API lives on another origin and is never touched here, so nothing stale
 * ever stands in for live data. Bump VERSION to drop every old cache.
 *
 * A push carries `{ title, body, url, tag }` from the API; a tap on the
 * notification focuses an open window on that path or opens one.
 */
const VERSION = 'bzim-v2';
const ICON = '/icons/icon-192.png';
/** On localhost the worker exists for push only: caching dev bundles would serve stale code. */
const CACHING = self.location.hostname !== 'localhost';
const OFFLINE_URL = '/offline';
const CACHED_PATH_PREFIXES = ['/_next/static/', '/icons/'];

self.addEventListener('install', (event) => {
    event.waitUntil(
        (CACHING
            ? caches
                  .open(VERSION)
                  .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: 'reload' })))
            : Promise.resolve()
        ).then(() => self.skipWaiting()),
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) =>
                Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key))),
            )
            .then(() => self.clients.claim()),
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (!CACHING || request.method !== 'GET') return;
    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;

    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request).catch(() =>
                caches.match(OFFLINE_URL).then((hit) => hit ?? Response.error()),
            ),
        );
        return;
    }

    if (CACHED_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
        event.respondWith(
            caches.open(VERSION).then((cache) =>
                cache.match(request).then(
                    (hit) =>
                        hit ??
                        fetch(request).then((response) => {
                            if (response.ok) void cache.put(request, response.clone());
                            return response;
                        }),
                ),
            ),
        );
    }
});

self.addEventListener('push', (event) => {
    let payload = {};
    try {
        payload = event.data ? event.data.json() : {};
    } catch {
        payload = { title: event.data ? event.data.text() : '' };
    }
    const title = payload.title || 'Bij zijn is meemaken';
    event.waitUntil(
        self.registration.showNotification(title, {
            body: payload.body || '',
            icon: ICON,
            badge: ICON,
            tag: payload.tag || undefined,
            data: { url: payload.url || '/groups' },
        }),
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = new URL(
        (event.notification.data && event.notification.data.url) || '/groups',
        self.location.origin,
    ).href;
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
            const open = clients.find((client) => 'focus' in client);
            if (open) {
                return open.navigate
                    ? open.navigate(url).then((c) => c && c.focus())
                    : open.focus();
            }
            return self.clients.openWindow(url);
        }),
    );
});
