/*
 * The service worker, by hand (docs/02 §2.10).
 *
 * Navigations go to the network first and fall back to the cached /offline
 * page when it is unreachable. Next's hashed static files and the icons are
 * cached on first use, since their names change when their contents do. The
 * API lives on another origin and is never touched here, so nothing stale
 * ever stands in for live data. Bump VERSION to drop every old cache.
 */
const VERSION = 'bzim-v1';
const OFFLINE_URL = '/offline';
const CACHED_PATH_PREFIXES = ['/_next/static/', '/icons/'];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches
            .open(VERSION)
            .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: 'reload' })))
            .then(() => self.skipWaiting()),
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
    if (request.method !== 'GET') return;
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
