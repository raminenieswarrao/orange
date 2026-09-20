const CACHE_NAME = 'orange-shell-v20';

const APP_SHELL = [
    '/',
    '/index.html',
    '/manifest.webmanifest',

    '/css/app.css',
    '/css/groups.css',
    '/css/group-detail.css',
    '/css/add-expense.css',
    '/css/expense-detail.css',
    '/css/settle-up.css',
    '/css/activity.css',

    '/js/app.js',

    '/js/core/supabase-client.js',
    '/js/core/auth.js',
    '/js/core/navigation.js',

    '/js/shared/person-card.js',

    '/js/home/home-service.js',

    '/js/activity/activity-service.js',
    '/js/activity/activity-page.js',

    '/js/friends/friends-service.js',
    '/js/friends/friends-page.js',

    '/js/groups/groups-service.js',
    '/js/groups/groups-page.js',
    '/js/groups/group-detail-page.js',
    '/js/groups/group-management.js',

    '/js/expenses/expenses-service.js',
    '/js/expenses/expense-success-animation.js',
    '/js/expenses/add-expense-page.js',
    '/js/expenses/expense-detail-page.js',

    '/js/settlements/settlements-service.js',
    '/js/settlements/settle-up-page.js',

    '/assets/orange-icon.svg',
    '/assets/orange-glowing-splash.gif'
];


/**
 * Caches the complete Orange application shell.
 */
self.addEventListener(
    'install',
    (event) => {
        event.waitUntil(
            caches
                .open(CACHE_NAME)
                .then((cache) =>
                    cache.addAll(APP_SHELL)
                )
                .then(() =>
                    self.skipWaiting()
                )
        );
    }
);


/**
 * Removes older Orange caches.
 */
self.addEventListener(
    'activate',
    (event) => {
        event.waitUntil(
            caches
                .keys()
                .then((cacheNames) =>
                    Promise.all(
                        cacheNames
                            .filter(
                                (cacheName) =>
                                    cacheName !==
                                    CACHE_NAME
                            )
                            .map(
                                (cacheName) =>
                                    caches.delete(
                                        cacheName
                                    )
                            )
                    )
                )
                .then(() =>
                    self.clients.claim()
                )
        );
    }
);


/**
 * Returns true for requests that must always
 * reach Supabase or the Spring Boot API.
 */
function isDataRequest(url) {
    return (
        url.pathname.startsWith('/api/') ||
        url.hostname.endsWith(
            '.supabase.co'
        )
    );
}


/**
 * Uses the network first for page navigation.
 */
async function networkFirst(request) {
    try {
        const response =
            await fetch(request);

        if (response.ok) {
            const cache =
                await caches.open(
                    CACHE_NAME
                );

            await cache.put(
                '/index.html',
                response.clone()
            );
        }

        return response;
    } catch {
        return (
            await caches.match(
                '/index.html'
            )
        ) || Response.error();
    }
}


/**
 * Uses cached shell files immediately and
 * refreshes them in the background.
 */
async function staleWhileRevalidate(
    request
) {
    const cachedResponse =
        await caches.match(request);

    const networkResponsePromise =
        fetch(request)
            .then(
                async (response) => {
                    if (response.ok) {
                        const cache =
                            await caches.open(
                                CACHE_NAME
                            );

                        await cache.put(
                            request,
                            response.clone()
                        );
                    }

                    return response;
                }
            )
            .catch(() => null);

    if (cachedResponse) {
        return cachedResponse;
    }

    return (
        await networkResponsePromise
    ) || Response.error();
}


/**
 * Handles same-origin application requests.
 */
self.addEventListener(
    'fetch',
    (event) => {
        const request =
            event.request;

        if (request.method !== 'GET') {
            return;
        }

        const url =
            new URL(request.url);

        if (isDataRequest(url)) {
            return;
        }

        if (
            request.mode === 'navigate'
        ) {
            event.respondWith(
                networkFirst(request)
            );

            return;
        }

        if (
            url.origin !==
            self.location.origin
        ) {
            return;
        }

        event.respondWith(
            staleWhileRevalidate(
                request
            )
        );
    }
);